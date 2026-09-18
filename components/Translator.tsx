"use client";

import { useMemo, useState } from "react";
import type { Crosswalk, MilitaryOccupation } from "../lib/types";
import { searchOccupations } from "../lib/search";

const PAGE = 40;

function OccupationCard({ row }: { row: MilitaryOccupation }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: "var(--surface-0)", color: "var(--text-secondary)" }}
        >
          {row.branch}
        </span>
        <h2 className="text-base font-semibold">{row.code}</h2>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {row.title}
        </span>
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Civilian occupations ({row.matches.length})
      </p>
      <ul className="mt-1.5 space-y-1">
        {row.matches.map((m) => (
          <li key={m.code} className="text-[13px]">
            <a
              className="underline underline-offset-2"
              style={{ color: "var(--series-1)" }}
              href={`https://www.onetonline.org/link/summary/${m.code}`}
              target="_blank"
              rel="noreferrer"
            >
              {m.title}
            </a>
            <span className="ml-2 tabular-nums" style={{ color: "var(--text-muted)" }}>
              {m.code}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Translator({ data }: { data: Crosswalk }) {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [limit, setLimit] = useState(PAGE);

  const branches = useMemo(
    () => ["All branches", ...Array.from(new Set(data.occupations.map((o) => o.branch))).sort()],
    [data],
  );

  const results = useMemo(
    () => searchOccupations(data.occupations, query, branch),
    [data, query, branch],
  );

  const shown = results.slice(0, limit);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold">Military Occupation Translator</h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Enter a military occupation code or title to see the civilian occupations the U.S.
          Department of Labor maps it to. {data.occupations.length.toLocaleString("en-US")} military
          occupations indexed.
        </p>
      </header>

      <div className="card mt-5 flex flex-wrap items-end gap-3 p-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Code or title
          </span>
          <input
            className="control"
            placeholder="e.g. 3043, 92Y, 2A6X2, supply"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Branch
          </span>
          <select
            className="control"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setLimit(PAGE);
            }}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
        {results.length.toLocaleString("en-US")} matching military occupations
        {results.length > shown.length ? ` — showing first ${shown.length}` : ""}
      </p>

      <div className="mt-2 space-y-3">
        {shown.map((row) => (
          <OccupationCard key={`${row.branch}-${row.code}-${row.title}`} row={row} />
        ))}
        {results.length === 0 ? (
          <div className="card p-6 text-center text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No military occupation in the crosswalk matches that code or title.
          </div>
        ) : null}
      </div>

      {results.length > shown.length ? (
        <button className="control mt-4" onClick={() => setLimit(limit + PAGE)}>
          Show more
        </button>
      ) : null}

      <footer className="mt-8 text-[12px]" style={{ color: "var(--text-muted)" }}>
        Source: O*NET Military Crosswalk, built {data.generated} from{" "}
        <a className="underline underline-offset-2" href={data.source}>
          {data.source}
        </a>
        . O*NET is a trademark of the U.S. Department of Labor, Employment and Training
        Administration. Data used under CC BY 4.0.
      </footer>
    </main>
  );
}
