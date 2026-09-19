import onet from "../data/onet_tasks.json";
import crosswalk from "../data/mos_crosswalk.json";
import type { Crosswalk } from "./types";

export type OnetIndex = {
  source: string;
  origin: string;
  generated: string;
  counts: { occupations: number; tasks: number; titles: number };
  occupations: Record<
    string,
    { title: string; description: string; tasks: { text: string; core: boolean }[]; titles: string[] }
  >;
};

export type DescribeHit = {
  code: string;
  title: string;
  description: string;
  /** Task statements that matched, verbatim from O*NET. */
  evidence: string[];
  /** Real-world job titles reported for this occupation that matched the query. */
  titles: string[];
  /** Military codes the crosswalk maps to this occupation. */
  military: { branch: string; code: string; title: string }[];
  score: number;
};

const index = onet as unknown as OnetIndex;
const cross = crosswalk as unknown as Crosswalk;

const STOP = new Set(
  ("a an and are as at be been by for from had has have i in into is it its me my of on or our " +
    "that the their they this to was we were will with you your do did does his her them us " +
    "about over under while during when where which who whom being am " +
    // Words too generic to discriminate between occupations.
    "people person persons staff work worked working works job jobs duty duties task tasks " +
    "other others various several many some all every each also including include etc " +
    "responsible responsibility used use using make made get got go went " +
    // Numbers, which say how much but never what.
    "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen " +
    "sixteen seventeen eighteen nineteen twenty thirty forty fifty hundred thousand").split(" "),
);

/**
 * Crude suffix stemming, longest suffix first, one strip per word. Ties
 * "managed" / "managing" / "manager" / "management" together, and
 * "supervised" / "supervisor" / "supervision" together.
 */
const SUFFIXES = [
  "ational", "ations", "ation", "ements", "ement", "ities", "ity", "ances", "ance",
  "ences", "ence", "ions", "ion", "ingly", "ing", "edly", "ers", "ors", "ory",
  "ally", "er", "or", "ed", "ly", "es", "s",
];

function stem(w: string): string {
  let s = w;
  for (const suf of SUFFIXES) {
    if (s.length > suf.length + 3 && s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  // "manage" and "manag" should not be different terms.
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

/** Stemmed token sets, built once per process. */
type Doc = { code: string; terms: Set<string>; text: string; kind: "task" | "title" };
const docs: Doc[] = [];
const df = new Map<string, number>();

for (const [code, occ] of Object.entries(index.occupations)) {
  for (const t of occ.tasks) {
    const terms = new Set(tokens(t.text));
    docs.push({ code, terms, text: t.text, kind: "task" });
    for (const term of terms) df.set(term, (df.get(term) ?? 0) + 1);
  }
  for (const t of occ.titles) {
    const terms = new Set(tokens(t));
    docs.push({ code, terms, text: t, kind: "title" });
    for (const term of terms) df.set(term, (df.get(term) ?? 0) + 1);
  }
}

const N = docs.length;
const idf = (term: string) => Math.log(1 + N / (1 + (df.get(term) ?? 0)));

/** Military codes per O*NET occupation, built once. */
const militaryByOccupation = new Map<string, { branch: string; code: string; title: string }[]>();
for (const o of cross.occupations) {
  for (const m of o.matches) {
    const list = militaryByOccupation.get(m.code) ?? [];
    list.push({ branch: o.branch, code: o.code, title: o.title });
    militaryByOccupation.set(m.code, list);
  }
}

/**
 * Ranks civilian occupations against a free-text description of work.
 * Every hit carries the O*NET task statements that produced it.
 */
export function describe(query: string, limit = 10): DescribeHit[] {
  const qTerms = [...new Set(tokens(query))];
  if (qTerms.length === 0) return [];

  const totalIdf = qTerms.reduce((a, t) => a + idf(t), 0);
  const perOccupation = new Map<string, { score: number; tasks: [number, string][]; titles: [number, string][] }>();

  // A single common word in a three-word query is coincidence, not a match.
  const minTerms = qTerms.length >= 3 ? 2 : 1;

  for (const d of docs) {
    let hit = 0;
    let matched = 0;
    for (const t of qTerms) {
      if (d.terms.has(t)) {
        hit += idf(t);
        matched++;
      }
    }
    if (matched < minTerms) continue;

    // Coverage of the query, with a mild penalty for very long task statements.
    const coverage = hit / totalIdf;
    const score = coverage * (1 / (1 + d.terms.size / 60));

    const e = perOccupation.get(d.code) ?? { score: 0, tasks: [], titles: [] };
    (d.kind === "task" ? e.tasks : e.titles).push([score, d.text]);
    perOccupation.set(d.code, e);
  }

  const hits: DescribeHit[] = [];
  for (const [code, e] of perOccupation) {
    const occ = index.occupations[code];
    if (!occ) continue;

    e.tasks.sort((a, b) => b[0] - a[0]);
    e.titles.sort((a, b) => b[0] - a[0]);

    // Best evidence dominates; the next two contribute less, so an occupation
    // with one strong match beats one with many weak ones.
    const top = [...e.tasks, ...e.titles].map(([s]) => s).sort((a, b) => b - a);
    const score = (top[0] ?? 0) + 0.3 * (top[1] ?? 0) + 0.15 * (top[2] ?? 0);

    hits.push({
      code,
      title: occ.title,
      description: occ.description,
      evidence: e.tasks.slice(0, 3).map(([, text]) => text),
      titles: e.titles.slice(0, 4).map(([, text]) => text),
      military: (militaryByOccupation.get(code) ?? []).slice(0, 6),
      score: Number(score.toFixed(4)),
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const onetMeta = {
  source: index.source,
  origin: index.origin,
  generated: index.generated,
  counts: index.counts,
};
