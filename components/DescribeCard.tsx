"use client";

import type { DescribeHit } from "../lib/types";

/**
 * One civilian occupation matched from a free-text description of work.
 * The task statements are shown verbatim so the match is auditable.
 */
export function DescribeCard({ hit, index }: { hit: DescribeHit; index: number }) {
  return (
    <article
      className="card hit rise p-4"
      style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-[17px] font-bold tracking-tight">
          <a
            className="underline underline-offset-2"
            style={{ color: "var(--link)" }}
            href={`https://www.onetonline.org/link/summary/${hit.code}`}
            target="_blank"
            rel="noreferrer"
          >
            {hit.title}
          </a>
        </h2>
        <span className="tabular-nums text-[12px]" style={{ color: "var(--text-muted)" }}>
          {hit.code}
        </span>
      </div>

      {hit.evidence.length ? (
        <>
          <p
            className="mt-3 text-[11px] uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Matching O*NET tasks
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {hit.evidence.map((e) => (
              <li
                key={e}
                className="border-l-2 pl-2.5 text-[13px]"
                style={{ borderColor: "var(--accent)", color: "var(--text-secondary)" }}
              >
                {e}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {hit.titles.length ? (
        <p className="mt-3 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>Also called: </span>
          {hit.titles.join(" · ")}
        </p>
      ) : null}

      {hit.military.length ? (
        <p className="mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>Military codes mapped here: </span>
          {hit.military.map((m) => `${m.branch} ${m.code}`).join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
