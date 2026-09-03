import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      ← {label}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
