import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { requireMfaOrRedirect } from "@/utils/supabase/auth";
import { UNLOCK_COOKIE } from "@/lib/app-lock";

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

  return <AppShell userEmail={user.email ?? ""}>{children}</AppShell>;
}
