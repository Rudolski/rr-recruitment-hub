import { LoginForm } from "./login-form";

export const metadata = { title: "Inloggen · RR Recruitment Hub" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const redirectParam = params.redirect;
  const redirectTo =
    typeof redirectParam === "string" && redirectParam.startsWith("/")
      ? redirectParam
      : "/dashboard";

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
          <p className="mt-3 text-sm text-zinc-500">
            Recruitment Hub — log in met je e-mailadres en wachtwoord.
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
