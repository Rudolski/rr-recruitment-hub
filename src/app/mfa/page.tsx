import { redirect } from "next/navigation";
import { signOut } from "@/app/(app)/actions";
import { createClient } from "@/utils/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata = { title: "Verificatie · RR Recruitment Hub" };

type View =
  | { kind: "challenge"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message?: string };

async function resolveView(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<View> {
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/dashboard");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (verified) return { kind: "challenge", factorId: verified.id };

  // Nieuwe inschrijving. Oude, niet-bevestigde factoren eerst weg, anders
  // stapelen die zich op en botst de friendly name.
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data: enrolled, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator",
  });
  if (error || !enrolled) return { kind: "error", message: error?.message };

  return {
    kind: "enroll",
    factorId: enrolled.id,
    qr: enrolled.totp.qr_code,
    secret: enrolled.totp.secret,
  };
}

export default async function MfaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let view: View;
  try {
    view = await resolveView(supabase);
  } catch (e) {
    // redirect() gooit een NEXT_REDIRECT-fout; die moet doorgaan.
    if (e && typeof e === "object" && "digest" in e) throw e;
    view = { kind: "error", message: (e as Error)?.message };
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-main.svg"
            alt="RR Recruitment"
            className="h-7 w-auto"
          />
        </div>

        {view.kind === "error" ? (
          <div className="space-y-2">
            <h1 className="text-base font-semibold text-zinc-900">
              Instellen lukt niet
            </h1>
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {view.message ??
                "Kon geen verificatiefactor aanmaken. Staat TOTP aan in Supabase?"}
            </p>
            <p className="text-xs text-zinc-500">
              Log uit en probeer opnieuw, of neem contact op met de beheerder.
            </p>
          </div>
        ) : view.kind === "enroll" ? (
          <MfaForm
            factorId={view.factorId}
            qr={view.qr}
            secret={view.secret}
          />
        ) : (
          <MfaForm factorId={view.factorId} />
        )}

        <form action={signOut} className="mt-6 border-t border-zinc-100 pt-4">
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  );
}
