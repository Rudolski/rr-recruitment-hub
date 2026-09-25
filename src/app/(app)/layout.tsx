import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { requireMfaOrRedirect } from "@/utils/supabase/auth";
import { UNLOCK_COOKIE } from "@/lib/app-lock";
import { sendDailyDigestIfNotAlreadySentToday } from "@/lib/daily-digest";

/**
 * Vangnet naast de GitHub Actions-cron (zie .github/workflows/
 * daily-digest-cron.yml): die crons bleken bij dit account onbetrouwbaar
 * (schedule-events vuurden dagenlang niet af). Bij elke pageload van de
 * hub op een doordeweekse dag checken of de digest van vandaag al weg
 * is — zo niet, dan gaat 'ie alsnog. sendDailyDigestIfNotAlreadySentToday
 * zorgt dat dit nooit tot een dubbele mail leidt, welk mechanisme er
 * ook het eerst bij is. Nooit de pagina laten breken op een fout hier.
 */
async function ensureDailyDigest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  try {
    const isWeekday = ![0, 6].includes(new Date().getUTCDay());
    if (!isWeekday) return;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return;

    await sendDailyDigestIfNotAlreadySentToday(supabase, membership.organization_id);
  } catch {
    // Vangnet mag nooit de pagina breken; de cron-route blijft de
    // primaire, foutafhandelde weg.
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Vangnet naast de proxy: geen sessie -> naar /login.
  if (!user) {
    redirect("/login");
  }

  // Tweede factor verplicht voor het hele app-gedeelte.
  await requireMfaOrRedirect(supabase);

  // App-vergrendeling (Face ID/Touch ID): alleen relevant als er
  // minstens één apparaat geregistreerd staat. Zonder ontgrendel-
  // cookie (nog niet ontgrendeld, of een tijdje op de achtergrond
  // geweest) eerst naar /ontgrendel — die route roept dit layout NIET
  // aan, dus geen lus.
  const { count: lockCount } = await supabase
    .from("webauthn_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((lockCount ?? 0) > 0) {
    const cookieStore = await cookies();
    if (cookieStore.get(UNLOCK_COOKIE)?.value !== "1") {
      redirect("/ontgrendel");
    }
  }

  await ensureDailyDigest(supabase, user.id);

  return <AppShell userEmail={user.email ?? ""}>{children}</AppShell>;
}
