import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/server";
import { requireMfaOrRedirect } from "@/utils/supabase/auth";

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

  return <AppShell userEmail={user.email ?? ""}>{children}</AppShell>;
}
