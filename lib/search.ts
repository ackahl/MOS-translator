import type { MilitaryOccupation } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Ranks military occupations against a query.
 * 0 = exact code, 1 = code prefix, 2 = title starts with, 3 = title contains,
 * 4 = matched O*NET occupation title contains. Lower sorts first.
 */
export function searchOccupations(
  rows: MilitaryOccupation[],
  query: string,
  branch: string,
): MilitaryOccupation[] {
  const q = query.trim();
  const scoped = branch === "All branches" ? rows : rows.filter((r) => r.branch === branch);
  if (!q) return scoped;

  const nq = norm(q);
  const lq = q.toLowerCase();
  const scored: { row: MilitaryOccupation; rank: number }[] = [];

  for (const row of scoped) {
    const code = norm(row.code);
    const title = row.title.toLowerCase();
    let rank = -1;

    if (code === nq) rank = 0;
    else if (code.startsWith(nq)) rank = 1;
    else if (title.startsWith(lq)) rank = 2;
    else if (title.includes(lq)) rank = 3;
    else if (row.matches.some((m) => m.title.toLowerCase().includes(lq))) rank = 4;

    if (rank !== -1) scored.push({ row, rank });
  }

  return scored
    .sort((a, b) => a.rank - b.rank || a.row.code.localeCompare(b.row.code))
    .map((s) => s.row);
}
