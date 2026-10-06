"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { applyProposals, askAssistant } from "@/app/(app)/assistent/actions";
import {
  describeProposal,
  outlookUrl,
  type ApplyResult,
  type ChatTurn,
  type Proposal,
} from "@/lib/assistant";

type Msg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  proposals?: Proposal[];
  status?: "open" | "applied" | "cancelled";
  results?: ApplyResult[];
  isError?: boolean;
};

const STATUS_NOTE = {
  open: "wacht op bevestiging",
  applied: "bevestigd en uitgevoerd",
  cancelled: "geannuleerd",
} as const;

function toHistory(msgs: Msg[]): ChatTurn[] {
  return msgs
    .filter((m) => !m.isError)
    .map((m) => ({
      role: m.role,
      content:
        m.text +
        (m.proposals?.length
          ? `\n[Voorgesteld: ${m.proposals.map(describeProposal).join("; ")} — ${STATUS_NOTE[m.status ?? "open"]}]`
          : ""),
    }));
}

/** Zwevende chat waarmee je de hub in gewone taal kunt bijwerken. */
export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, startTransition] = useTransition();
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, pending, open]);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    const userMsg: Msg = { id: nextId.current++, role: "user", text };
    // Openstaande voorstellen vervallen zodra je iets nieuws typt.
    const base = msgs.map((m) =>
      m.status === "open" ? { ...m, status: "cancelled" as const } : m,
    );
    const next = [...base, userMsg];
    setMsgs(next);
    setInput("");

    startTransition(async () => {
      const res = await askAssistant(toHistory(next));
      setMsgs((cur) => [
        ...cur,
        res.error
          ? { id: nextId.current++, role: "assistant", text: res.error, isError: true }
          : {
              id: nextId.current++,
              role: "assistant",
              text: res.reply,
              proposals: res.proposals.length ? res.proposals : undefined,
              status: res.proposals.length ? "open" : undefined,
            },
      ]);
    });
  }

  function confirm(id: number) {
    const msg = msgs.find((m) => m.id === id);
    const db = msg?.proposals?.filter((p) => p.type !== "calendar_event");
    if (!db?.length || pending) return;
    startTransition(async () => {
      const results = await applyProposals(db);
      setMsgs((cur) =>
        cur.map((m) => (m.id === id ? { ...m, status: "applied", results } : m)),
      );
    });
  }

  function cancel(id: number) {
    setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, status: "cancelled" } : m)));
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-terra px-4 py-3 text-sm font-medium text-cream shadow-lg transition-colors hover:bg-terra-dark"
        >
          RR-Slaafje
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-30 flex max-h-[75vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem] dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <span className="text-sm font-semibold text-navy dark:text-cream">
              RR-Slaafje
            </span>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {msgs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMsgs([])}
                  className="hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Wissen
                </button>
              )}
              <button
                type="button"
                aria-label="Sluiten"
                onClick={() => setOpen(false)}
                className="text-base leading-none hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {msgs.length === 0 && (
              <p className="text-zinc-500">
                Typ wat je wilt vastleggen, bijvoorbeeld &ldquo;Jan de Vries bij
                Rhenus gebeld, nam niet op, morgen opnieuw bellen&rdquo;. Of
                plak een LinkedIn-profiel (naam, functie, bedrijf) met
                &ldquo;remind me morgen bellen&rdquo;. Ik stel voor wat ik ga
                doen; jij bevestigt.
              </p>
            )}

            {msgs.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-full whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${
                    m.role === "user"
                      ? "bg-navy text-cream"
                      : m.isError
                        ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {m.text}
                </div>

                {m.proposals && (
                  <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <ul className="list-disc space-y-1 pl-4 text-zinc-700 dark:text-zinc-200">
                      {m.proposals.map((p, i) => (
                        <li key={i}>{describeProposal(p)}</li>
                      ))}
                    </ul>

                    {m.proposals
                      .filter((p) => p.type === "calendar_event")
                      .map((p, i) => (
                        <a
                          key={i}
                          href={p.type === "calendar_event" ? outlookUrl(p) : "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block rounded-md border border-terra px-3 py-1.5 text-xs font-medium text-terra hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          Zet in Outlook ↗
                        </a>
                      ))}

                    {m.status === "open" &&
                      m.proposals.some((p) => p.type !== "calendar_event") && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => confirm(m.id)}
                          className="rounded-md bg-terra px-3 py-1.5 text-xs font-medium text-cream hover:bg-terra-dark disabled:opacity-60"
                        >
                          {pending ? "Bezig…" : "Bevestigen"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => cancel(m.id)}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Annuleren
                        </button>
                      </div>
                    )}
                    {m.status === "cancelled" &&
                      m.proposals.some((p) => p.type !== "calendar_event") && (
                      <p className="text-xs text-zinc-400">Geannuleerd.</p>
                    )}
                    {m.status === "applied" &&
                      m.results?.map((r, i) => (
                        <p
                          key={i}
                          className={`text-xs ${r.ok ? "text-green-600 dark:text-green-500" : "text-red-600"}`}
                        >
                          {r.ok ? "✓ " : "✗ "}
                          {r.message}{" "}
                          {r.href && (
                            <Link href={r.href} className="underline">
                              openen
                            </Link>
                          )}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {pending && msgs[msgs.length - 1]?.role === "user" && (
              <p className="text-xs text-zinc-400">Even nadenken…</p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Typ of plak hier… (Enter = verstuur)"
              className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      )}
    </>
  );
}
