import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
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

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
