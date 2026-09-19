/**
 * Builds data/mos_crosswalk.json from the O*NET Military Crosswalk.
 *
 * Source:  https://www.onetcenter.org/dl_files/2019/military_crosswalk.zip
 *          (archive contains milx<MMYY>.csv; field definitions are in its "Read Me.pdf")
 * Origin:  Defense Manpower Data Center, published by O*NET.
 * Licence: O*NET data are provided by the U.S. Department of Labor, Employment and
 *          Training Administration under CC BY 4.0. Attribution is shown in the app footer.
 *
 * Only STATUS = "A" (active/current) records that carry at least one O*NET-SOC match are kept.
 * Obsolete records and records with no civilian match are dropped.
 *
 * No-op when data/mos_crosswalk.json exists. --refresh re-downloads.
 * MOS_CROSSWALK_FILE=/path/to/military_crosswalk.zip (or the .csv) builds from a local copy.
 */
import AdmZip from "adm-zip";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "data/mos_crosswalk.json");
const SOURCE_URL = "https://www.onetcenter.org/dl_files/2019/military_crosswalk.zip";

if (existsSync(out) && !process.argv.includes("--refresh")) {
  const n = JSON.parse(readFileSync(out, "utf8")).occupations.length;
  console.log(`data/mos_crosswalk.json already present (${n} occupations). Use --refresh to rebuild.`);
  process.exit(0);
}

/** SVC code -> [branch, what the code actually is]. Verbatim from the archive's Read Me. */
const SVC = {
  A: ["Army", "MOS / Area of Concentration / Reporting Code"],
  C: ["Coast Guard", "Coast Guard code"],
  D: ["DoD", "DoD Occupational Conversion Code"],
  F: ["Air Force", "Air Force Specialty Code (AFSC)"],
  G: ["Federal Civilian", "OPM GS / WG series"],
  H: ["Space Force", "Enlisted and Commissioned Officer code"],
  J: ["Army", "Additional Skill Identifier (ASI)"],
  K: ["Federal Civilian", "National Security Personnel System code"],
  L: ["Space Force", "Prefix code"],
  M: ["Marine Corps", "Military Occupational Specialty (MOS)"],
  N: ["Navy", "Enlisted Rating / NEC / NEBC / NOBC"],
  O: ["Space Force", "Officer Activity Code"],
  P: ["Navy", "Officer Designator Code"],
  Q: ["Army", "Special Qualification Identifier (SQI)"],
  S: ["Navy", "Officer Subspecialty (SSP) code"],
  U: ["Space Force", "Special Experience Identifier (SEI)"],
  V: ["Navy", "Officer Additional Qualification Designation (AQD)"],
  X: ["Air Force", "Prefix code"],
  Y: ["Air Force", "Special Experience Identifier (SEI)"],
  Z: ["Air Force", "Officer Activity Code"],
};

/** MPC code -> Military Personnel Category. Verbatim from the Read Me. */
const MPC = { E: "Enlisted", O: "Commissioned Officer", W: "Warrant Officer", "-": "Civilian" };

/** RFC4180 CSV parser. Returns array of arrays. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function csvFromZip(buffer) {
  const entries = new AdmZip(buffer).getEntries().filter((e) => !e.isDirectory);
  const csv = entries.find((e) => e.entryName.toLowerCase().endsWith(".csv"));
  if (!csv) {
    throw new Error(`No .csv inside the archive. Entries: ${entries.map((e) => e.entryName).join(", ")}`);
  }
  console.log(`Using ${csv.entryName}`);
  return csv.getData().toString("utf8");
}

async function loadCsvText() {
  const local = process.env.MOS_CROSSWALK_FILE;
  if (local) {
    console.log(`Reading local crosswalk from ${local}`);
    if (local.toLowerCase().endsWith(".zip")) return csvFromZip(readFileSync(local));
    return readFileSync(local, "utf8");
  }
  console.log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  return csvFromZip(Buffer.from(await res.arrayBuffer()));
}

const rows = parseCsv(await loadCsvText());
const headers = rows[0].map((h) => h.replace(/^﻿/, "").trim());
const need = ["SVC", "MPC", "MOC", "MOC_TITLE", "STATUS", "ONET1", "ONET1_TITLE", "DODOCC_TITLE", "MOTD1_TITLE"];
for (const h of need) {
  if (!headers.includes(h)) {
    throw new Error(
      `Expected column "${h}" is missing. The file layout has changed. Headers: ${headers.join(", ")}`,
    );
  }
}
const at = (r, name) => (r[headers.indexOf(name)] ?? "").trim();
const clean = (v) => (v === "-" ? "" : v);

/** MOTD titles ship in caps ("WAREHOUSING AND DISTRIBUTION SPECIALISTS"). */
const MINOR = new Set(["and", "or", "of", "the", "for", "in", "to", "a", "an", "with"]);
const titleCase = (v) =>
  v.replace(/[A-Za-z']+/g, (w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && MINOR.has(lower)) return lower;
    return lower[0].toUpperCase() + lower.slice(1);
  });

const byKey = new Map();
let skippedObsolete = 0;
let skippedNoMatch = 0;
let skippedUnknownSvc = 0;

for (const r of rows.slice(1)) {
  if (at(r, "STATUS") !== "A") {
    skippedObsolete++;
    continue;
  }
  const code = clean(at(r, "MOC"));
  const title = clean(at(r, "MOC_TITLE"));
  if (!code) continue;

  const matches = [];
  for (const i of [1, 2, 3, 4]) {
    const soc = clean(at(r, `ONET${i}`));
    const socTitle = clean(at(r, `ONET${i}_TITLE`));
    if (soc) matches.push({ code: soc, title: socTitle });
  }
  if (matches.length === 0) {
    skippedNoMatch++;
    continue;
  }

  const svc = at(r, "SVC");
  if (!SVC[svc]) {
    skippedUnknownSvc++;
    continue;
  }
  const [branch, codeType] = SVC[svc];

  const key = `${svc}|${code}|${title}`;
  const entry = byKey.get(key) ?? {
    branch,
    codeType,
    category: MPC[at(r, "MPC")] ?? "",
    code,
    title,
    // DoD Occupational Conversion title, e.g. "Supply Administration".
    dodTitle: "",
    // Military Occupational and Training Data groupings, e.g. "Warehousing and
    // Distribution Specialists". Up to two per row in the source file.
    motd: [],
    matches: [],
  };

  const dod = clean(at(r, "DODOCC_TITLE"));
  if (dod && !entry.dodTitle) entry.dodTitle = dod;
  for (const i of [1, 2]) {
    const m = clean(at(r, `MOTD${i}_TITLE`));
    if (m) {
      const t = titleCase(m);
      if (!entry.motd.includes(t)) entry.motd.push(t);
    }
  }
  for (const m of matches) {
    if (!entry.matches.some((x) => x.code === m.code)) entry.matches.push(m);
  }
  byKey.set(key, entry);
}

const occupations = [...byKey.values()].sort(
  (a, b) => a.branch.localeCompare(b.branch) || a.code.localeCompare(b.code),
);

const branches = [...new Set(occupations.map((o) => o.branch))].sort();

writeFileSync(
  out,
  JSON.stringify({
    source: SOURCE_URL,
    origin: "Defense Manpower Data Center, published by O*NET (U.S. Department of Labor, ETA)",
    generated: new Date().toISOString().slice(0, 10),
    counts: {
      occupations: occupations.length,
      matches: occupations.reduce((a, o) => a + o.matches.length, 0),
      skippedObsolete,
      skippedNoMatch,
      skippedUnknownSvc,
    },
    branches,
    occupations,
  }),
);

console.log(
  `Wrote ${occupations.length} active occupations across ${branches.length} branches ` +
    `(${branches.join(", ")}).\n` +
    `Skipped ${skippedObsolete} obsolete records, ${skippedNoMatch} with no O*NET match, ` +
    `${skippedUnknownSvc} with an unrecognised service code.`,
);
