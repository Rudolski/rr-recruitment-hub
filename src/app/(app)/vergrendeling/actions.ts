"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { getSessionContext } from "@/utils/supabase/auth";
import { UNLOCK_COOKIE, unlockCookieOptions } from "@/lib/app-lock";

// Twee aparte cookies zodat een halverwege-gestaakte registratie een
// lopende ontgrendelpoging niet kan verstoren (en andersom).
const REG_CHALLENGE_COOKIE = "rr_webauthn_reg_challenge";
const AUTH_CHALLENGE_COOKIE = "rr_webauthn_auth_challenge";
const CHALLENGE_MAX_AGE = 5 * 60; // 5 minuten om de Face ID-prompt af te ronden

async function getRpConfig() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const rpID = host.split(":")[0];
  const isDev = process.env.NODE_ENV === "development";
  const origin = `${isDev ? "http" : "https"}://${host}`;
  return { rpID, origin, rpName: "RR Recruitment Hub" };
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    maxAge,
    path: "/",
  };
}

/** Stap 1 van registreren: opties voor navigator.credentials.create(). */
export async function getRegistrationOptions() {
  const { supabase, user } = await getSessionContext();
  const { rpID, rpName } = await getRpConfig();

  const { data: existing } = await supabase
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.id,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({ id: c.credential_id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  (await cookies()).set(
    REG_CHALLENGE_COOKIE,
    options.challenge,
    cookieOpts(CHALLENGE_MAX_AGE),
  );

  return options;
}

/** Stap 2 van registreren: verifieert het antwoord en slaat het apparaat op. */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  deviceLabel: string | null,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return { error: "Geen organisatie gekoppeld." };

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(REG_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return { error: "Sessie verlopen. Probeer opnieuw." };
  }
  const { rpID, origin } = await getRpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    return { error: (e as Error).message };
  } finally {
    cookieStore.delete(REG_CHALLENGE_COOKIE);
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Verificatie mislukt." };
  }

  const { credential } = verification.registrationInfo;
  const { error } = await supabase.from("webauthn_credentials").insert({
    organization_id: organizationId,
    user_id: user.id,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    device_label: deviceLabel,
  });
  if (error) return { error: "Opslaan is mislukt. Probeer het opnieuw." };

  // Meteen als ontgrendeld beschouwen — anders sta je na het instellen
  // van Face ID meteen weer voor het vergrendelscherm.
  (await cookies()).set(UNLOCK_COOKIE, "1", unlockCookieOptions());

  revalidatePath("/vergrendeling");
  return { ok: true };
}

/** Stap 1 van ontgrendelen: opties voor navigator.credentials.get(). */
export async function getAuthenticationOptions() {
  const { supabase, user } = await getSessionContext();
  const { rpID } = await getRpConfig();

  const { data: creds } = await supabase
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", user.id);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: (creds ?? []).map((c) => ({ id: c.credential_id })),
    userVerification: "required",
  });

  (await cookies()).set(
    AUTH_CHALLENGE_COOKIE,
    options.challenge,
    cookieOpts(CHALLENGE_MAX_AGE),
  );

  return options;
}

/** Stap 2 van ontgrendelen: verifieert de Face ID/Touch ID-respons. */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await getSessionContext();

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(AUTH_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return { error: "Sessie verlopen. Probeer opnieuw." };
  }

  const { data: stored } = await supabase
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!stored) {
    cookieStore.delete(AUTH_CHALLENGE_COOKIE);
    return { error: "Onbekend apparaat. Registreer het opnieuw." };
  }

  const { rpID, origin } = await getRpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: isoBase64URL.toBuffer(stored.public_key),
        counter: stored.counter,
      },
    });
  } catch (e) {
    return { error: (e as Error).message };
  } finally {
    cookieStore.delete(AUTH_CHALLENGE_COOKIE);
  }

  if (!verification.verified) return { error: "Ontgrendelen mislukt." };

  await supabase
    .from("webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", stored.id);

  cookieStore.set(UNLOCK_COOKIE, "1", unlockCookieOptions());
  return { ok: true };
}

/**
 * Houdt de ontgrendeling actief zolang het scherm zichtbaar is (zie
 * AppLockPing). Zet 'm niet zelf aan — verlengt alleen een al geldige
 * ontgrendeling, dus zonder geldige cookie gebeurt er niets.
 */
export async function refreshUnlock() {
  await getSessionContext();
  const cookieStore = await cookies();
  if (cookieStore.get(UNLOCK_COOKIE)?.value === "1") {
    cookieStore.set(UNLOCK_COOKIE, "1", unlockCookieOptions());
  }
}

export async function deleteCredential(fd: FormData) {
  const { supabase, user } = await getSessionContext();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("webauthn_credentials")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/vergrendeling");
}
