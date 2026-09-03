"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(app)/actions";
import { navSections } from "@/lib/nav";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-cream dark:border-zinc-800 dark:bg-navy">
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <Link href="/dashboard" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-main.svg"
            alt="RR Recruitment"
            className="h-6 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-main-white.svg"
            alt="RR Recruitment"
            className="hidden h-6 w-auto dark:block"
          />
          <span className="mt-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">
            Recruitment Hub
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                if (item.external) {
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-navy dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-cream"
                      >
                        {item.label}
                        <span aria-hidden className="text-xs text-zinc-400">
                          ↗
                        </span>
                      </a>
                    </li>
                  );
                }
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-terra/10 font-medium text-terra dark:bg-terra/20 dark:text-cream"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-navy dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-cream"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {userEmail && (
          <p
            className="truncate text-xs text-zinc-500"
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </aside>
  );
}
