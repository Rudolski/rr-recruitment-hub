import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import { UNLOCK_COOKIE } from "@/lib/app-lock";
import { UnlockForm } from "./unlock-form";

export const metadata = { title: "Ontgrendelen · RR Recruitment Hub" };

export default async function OntgrendelPage() {
  const { supabase, user } = await getSessionContext();

  const cookieStore = await cookies();
  if (cookieStore.get(UNLOCK_COOKIE)?.value === "1") {
    redirect("/dashboard");
  }

  const { count } = await supabase
    .from("webauthn_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!count) redirect("/dashboard");

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
        <UnlockForm />
      </div>
    </div>
  );
}
