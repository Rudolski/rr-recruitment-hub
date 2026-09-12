import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { WebauthnCredential } from "@/lib/types";
import { deleteCredential } from "./actions";
import { EnrollButton } from "./enroll-button";

export const metadata = { title: "App-vergrendeling · RR Recruitment Hub" };

export default async function VergrendelingPage() {
  const { supabase, user, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="App-vergrendeling" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const { data: credentials, error } = await supabase
    .from("webauthn_credentials")
    .select("id, device_label, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<
      Pick<WebauthnCredential, "id" | "device_label" | "created_at" | "last_used_at">[]
    >();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="App-vergrendeling"
        description="Ontgrendel de hub met Face ID / Touch ID nadat hij een paar minuten op de achtergrond heeft gestaan. Los van je gewone inlog en MFA — die blijven gewoon actief."
      />

      {error && (
        <p className={`${errorBox} mt-6`}>
          De tabel <code>webauthn_credentials</code> bestaat nog niet. Draai{" "}
          <code>supabase/migrations/022_webauthn_credentials.sql</code>.
        </p>
      )}

      {!error && (
        <>
          <div className="mt-6">
            <EnrollButton />
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Geregistreerde apparaten
            </h2>
            {!credentials || credentials.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Nog geen apparaat geregistreerd — de app vraagt dan ook nooit
                om Face ID/Touch ID.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {credentials.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {c.device_label || "Naamloos apparaat"}
                      </span>
                      <span className="block text-xs text-zinc-400">
                        toegevoegd {formatDate(c.created_at)}
                        {c.last_used_at &&
                          ` · laatst gebruikt ${formatDate(c.last_used_at)}`}
                      </span>
                    </span>
                    <form action={deleteCredential}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Verwijderen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-zinc-400">
              Verwijder je het laatste apparaat, dan vraagt de app weer nooit
              meer om Face ID.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
