"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import {
  CLIENT_STATUS_LABELS,
  PROSPECT_STATUSES,
  type ClientStatus,
} from "@/lib/types";
import { setClientStatus } from "../klanten/actions";

export type FunnelClient = {
  id: string;
  name: string;
  status: ClientStatus;
  nextFollowUp: string | null;
};

/**
 * Acquisitie-funnel als kanban: één kolom per fase (nieuw → voorstel
 * gestuurd). Sleep een relatie naar een andere kolom om de status te
 * wijzigen. De kaart verplaatst meteen; de server werkt op de
 * achtergrond bij.
 */
export function AcquisitieBoard({ clients }: { clients: FunnelClient[] }) {
  const router = useRouter();
  const [items, setItems] = useState(clients);
  const [dragOver, setDragOver] = useState<ClientStatus | null>(null);
  const [, startTransition] = useTransition();

  function move(id: string, to: ClientStatus) {
    const current = items.find((c) => c.id === id);
    if (!current || current.status === to) return;

    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: to } : c)),
    );

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", to);
      await setClientStatus(fd);
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3">
        {PROSPECT_STATUSES.map((stage) => {
          const list = items.filter((c) => c.status === stage);
          const active = dragOver === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, stage);
              }}
              className={`flex w-52 shrink-0 flex-col rounded-lg border bg-zinc-50/60 dark:bg-zinc-900/40 ${
                active
                  ? "border-terra ring-1 ring-terra"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-baseline justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {CLIENT_STATUS_LABELS[stage]}
                </p>
                <span className="text-[11px] text-zinc-400">{list.length}</span>
              </div>

              <div className="flex-1 space-y-2 p-2">
                {list.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-zinc-300 dark:text-zinc-600">
                    Sleep hierheen
                  </p>
                ) : (
                  list.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab rounded-md border border-zinc-200 bg-white p-2 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <Link
                        href={`/klanten/${c.id}`}
                        draggable={false}
                        className="text-sm font-medium text-navy hover:underline dark:text-cream"
                      >
                        {c.name}
                      </Link>
                      {c.nextFollowUp && (
                        <span className="mt-0.5 block text-[11px] text-zinc-400">
                          opvolgen {formatDate(c.nextFollowUp)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
