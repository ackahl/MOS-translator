"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CrosswalkMeta,
  DescribeHit,
  DescribeResponse,
  MilitaryOccupation,
  SearchResponse,
} from "../lib/types";
import { DescribeCard } from "./DescribeCard";

const PAGE = 40;

function OccupationCard({
  row,
  showBranch,
  index,
}: {
  row: MilitaryOccupation;
  showBranch: boolean;
  index: number;
}) {
  return (
    <article className="card hit rise p-4" style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}>
      <div className="flex flex-wrap items-baseline gap-2">
        {showBranch ? (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ background: "var(--surface-0)", color: "var(--text-secondary)" }}
          >
            {row.branch}
          </span>
        ) : null}
        <h2 className="text-[17px] font-bold tracking-tight">{row.code}</h2>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {row.title}
        </span>
      </div>

      <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
        {row.codeType}
        {row.category ? ` · ${row.category}` : ""}
      </p>

      {row.dodTitle || row.motd.length ? (
        <p className="mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {[row.dodTitle, ...row.motd].filter(Boolean).join("  →  ")}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Civilian occupations ({row.matches.length})
      </p>
      <ul className="mt-1.5 space-y-1">
        {row.matches.map((m) => (
          <li key={m.code} className="text-[13px]">
            <a
              className="underline underline-offset-2"
              style={{ color: "var(--link)" }}
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

export function Translator({
  meta,
  lockedBranch = null,
}: {
  meta: CrosswalkMeta;
  lockedBranch?: string | null;
}) {
  const [mode, setMode] = useState<"code" | "describe">("code");
  const [query, setQuery] = useState("");
  const [described, setDescribed] = useState<DescribeHit[]>([]);
  const [branch, setBranch] = useState(lockedBranch ?? "All branches");
  const [limit, setLimit] = useState(PAGE);
  const [data, setData] = useState<SearchResponse>({ total: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const branches = useMemo(() => ["All branches", ...meta.branches], [meta.branches]);

  useEffect(() => {
    const id = ++seq.current;
    const handle = setTimeout(
      () => {
        setLoading(true);

        if (mode === "describe") {
          if (query.trim().length < 3) {
            setDescribed([]);
            setLoading(false);
            return;
          }
          fetch(`/api/describe?q=${encodeURIComponent(query)}&limit=12`)
            .then((r) => r.json() as Promise<DescribeResponse>)
            .then((json) => {
              if (id === seq.current) {
                setDescribed(json.results);
                setLoading(false);
              }
            })
            .catch(() => {
              if (id === seq.current) setLoading(false);
            });
          return;
        }

        const url = `/api/search?q=${encodeURIComponent(query)}&branch=${encodeURIComponent(branch)}&limit=${limit}`;
        fetch(url)
          .then((r) => r.json() as Promise<SearchResponse>)
          .then((json) => {
            if (id === seq.current) {
              setData(json);
              setLoading(false);
            }
          })
          .catch(() => {
            if (id === seq.current) setLoading(false);
          });
      },
      query ? 220 : 0,
    );
    return () => clearTimeout(handle);
  }, [mode, query, branch, limit]);

  return (
    <div>
      <div className="tabstrip mb-3" style={{ display: "inline-flex" }} role="tablist">
        <button
          role="tab"
          aria-selected={mode === "code"}
          className={`tab ${mode === "code" ? "tab-active" : ""}`}
          onClick={() => {
            setMode("code");
            setLimit(PAGE);
          }}
        >
          Code or title
        </button>
        <button
          role="tab"
          aria-selected={mode === "describe"}
          className={`tab ${mode === "describe" ? "tab-active" : ""}`}
          onClick={() => setMode("describe")}
        >
          Describe your work
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {mode === "code" ? "Code or title" : "What did you actually do?"}
          </span>
          <input
            className="control"
            placeholder={
              mode === "code"
                ? "e.g. 3043, 92Y, 2A011, supply"
                : "e.g. managed inventory for a supply section"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        {lockedBranch || mode === "describe" ? null : (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
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
        )}
      </div>

      {mode === "describe" ? (
        <>
          <p className="mt-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
            {query.trim().length < 3
              ? "Describe a duty in your own words. Every result shows the O*NET task statements it matched."
              : loading
                ? "Searching…"
                : `${described.length} civilian occupations matched`}
          </p>
          <div className="mt-2 space-y-3">
            {described.map((hit, i) => (
              <DescribeCard key={hit.code} hit={hit} index={i} />
            ))}
            {!loading && query.trim().length >= 3 && described.length === 0 ? (
              <div
                className="card p-6 text-center text-[13px]"
                style={{ color: "var(--text-secondary)" }}
              >
                Nothing matched. Try describing the work with different words.
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
      <p className="mt-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
        {loading
          ? "Searching…"
          : `${data.total.toLocaleString("en-US")} matching codes${
              data.total > data.results.length ? ` — showing first ${data.results.length}` : ""
            }`}
      </p>

      <div className="mt-2 space-y-3">
        {data.results.map((row, i) => (
          <OccupationCard
            key={`${row.branch}-${row.code}-${row.title}`}
            row={row}
            showBranch={!lockedBranch}
            index={i}
          />
        ))}
        {!loading && data.total === 0 ? (
          <div className="card p-6 text-center text-[13px]" style={{ color: "var(--text-secondary)" }}>
            No code or title in the crosswalk matches that search.
          </div>
        ) : null}
      </div>

      {data.total > data.results.length ? (
        <button className="control hit mt-4" onClick={() => setLimit(limit + PAGE)}>
          Show more
        </button>
      ) : null}
        </>
      )}

      <footer className="mt-8 text-[12px]" style={{ color: "var(--text-muted)" }}>
        Source: O*NET Military Crosswalk, built {meta.generated} from{" "}
        <a className="underline underline-offset-2" href={meta.source}>
          {meta.source}
        </a>
        . Underlying data: {meta.origin}. Obsolete records and codes with no O*NET match are
        excluded ({meta.counts.skippedObsolete.toLocaleString("en-US")} and{" "}
        {meta.counts.skippedNoMatch.toLocaleString("en-US")} rows respectively). O*NET is a
        trademark of the U.S. Department of Labor, Employment and Training Administration. Data used
        under CC BY 4.0.
      </footer>
    </div>
  );
}
