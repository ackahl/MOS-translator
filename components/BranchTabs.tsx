"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = { label: string; slug: string; codes: number | null };

/**
 * Rounded branch tabs. The active pill is driven by the current route, so the
 * browser's back button and shareable URLs keep working.
 */
export function BranchTabs({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  const current = pathname === "/" ? "all" : (pathname.split("/")[2] ?? "all");

  return (
    <nav className="tabstrip" aria-label="Service branch">
      {tabs.map((t) => {
        const active = t.slug === current;
        return (
          <Link
            key={t.slug}
            href={t.slug === "all" ? "/" : `/branch/${t.slug}`}
            className={`tab ${active ? "tab-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span>{t.label}</span>
            {t.codes === null ? null : (
              <span className="tab-count tabular-nums">{t.codes.toLocaleString("en-US")}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
