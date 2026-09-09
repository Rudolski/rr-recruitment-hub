"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";

/**
 * App-omhulsel met een vaste zijbalk op groot scherm en een uitschuifbaar
 * menu op mobiel. De zijbalk zelf ([Sidebar]) is voor beide identiek.
 */
export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-zinc-50 dark:bg-zinc-900">
      {/* Zijbalk — vast vanaf lg */}
      <div className="hidden lg:flex">
        <Sidebar userEmail={userEmail} />
      </div>

      {/* Mobiel: verduistering + uitschuifmenu */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden
          onClick={close}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar userEmail={userEmail} onNavigate={close} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobiele topbalk met menuknop */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-cream px-4 py-3 lg:hidden dark:border-zinc-800 dark:bg-navy">
          <button
            type="button"
            aria-label="Menu openen"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className="-ml-1 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-roc)] text-sm tracking-tight text-navy dark:text-cream"
          >
            RR Recruitment Hub
          </Link>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
