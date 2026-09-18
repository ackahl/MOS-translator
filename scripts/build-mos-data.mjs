/**
 * Builds data/mos_crosswalk.json from the O*NET Military Crosswalk.
 *
 * Source:  https://www.onetcenter.org/dl_files/2019/military_crosswalk.zip
 * Licence: O*NET data are provided by the U.S. Department of Labor, Employment and
 *          Training Administration under CC BY 4.0. Attribution is shown in the app footer.
 *
 * The script is a no-op when data/mos_crosswalk.json already exists. Pass --refresh to
 * re-download, or MOS_CROSSWALK_FILE=/path/to/file.csv (or .zip) to build from a local copy.
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
  console.log(`data/mos_crosswalk.json already present (${n} military occupations). Use --refresh to rebuild.`);
  process.exit(0);
}

/** Minimal RFC4180 CSV parser: returns array of arrays. */
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

/** Finds a column index by trying each matcher against the normalised headers, in order. */
function findColumn(headers, matchers, { exclude = [] } = {}) {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  for (const m of matchers) {
    const idx = norm.findIndex((h) => m.test(h) && !exclude.some((e) => e.test(h)));
    if (idx !== -1) return idx;
  }
  return -1;
}

const BRANCH_NAMES = {
  A: "Army",
  C: "Coast Guard",
  F: "Air Force",
  M: "Marine Corps",
  N: "Navy",
  P: "Navy",
  S: "Navy",
};

function normaliseBranch(value) {
  const v = (value ?? "").trim();
  if (!v) return "Unspecified";
  const upper = v.toUpperCase();
  if (BRANCH_NAMES[upper]) return BRANCH_NAMES[upper];
  for (const name of new Set(Object.values(BRANCH_NAMES))) {
    if (upper.includes(name.toUpperCase())) return name;
  }
  return v;
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

function csvFromZip(buffer) {
  const entries = new AdmZip(buffer).getEntries().filter((e) => !e.isDirectory);
  const csv = entries.find((e) => e.entryName.toLowerCase().endsWith(".csv"));
  if (!csv) {
    throw new Error(
      `No .csv inside the archive. Entries: ${entries.map((e) => e.entryName).join(", ")}`,
    );
  }
  console.log(`Using ${csv.entryName}`);
  return csv.getData().toString("utf8");
}

const rows = parseCsv(await loadCsvText());
const headers = rows[0];
console.log(`Columns: ${headers.join(" | ")}`);

const col = {
  branch: findColumn(headers, [/^branch$/, /service/, /branch/]),
  mocCode: findColumn(headers, [/^moc$/, /moc code/, /military.*code/, /^code$/], {
    exclude: [/o net/, /onet/, /soc/],
  }),
  mocTitle: findColumn(headers, [/moc title/, /military.*title/, /^title$/], {
    exclude: [/o net/, /onet/, /soc/],
  }),
  socCode: findColumn(headers, [/o net soc code/, /onet soc code/, /soc code/, /o net.*code/]),
  socTitle: findColumn(headers, [/o net soc title/, /onet soc title/, /soc title/, /o net.*title/]),
};

for (const [name, idx] of Object.entries(col)) {
  if (idx === -1) {
    throw new Error(
      `Could not locate the "${name}" column. Headers were: ${headers.join(" | ")}. ` +
        "Adjust the matchers in findColumn() above.",
    );
  }
  console.log(`  ${name} -> "${headers[idx]}"`);
}

const byKey = new Map();
for (const r of rows.slice(1)) {
  const mocCode = (r[col.mocCode] ?? "").trim();
  const mocTitle = (r[col.mocTitle] ?? "").trim();
  const socCode = (r[col.socCode] ?? "").trim();
  const socTitle = (r[col.socTitle] ?? "").trim();
  if (!mocCode || !socCode) continue;

  const branch = normaliseBranch(r[col.branch]);
  const key = `${branch}|${mocCode}|${mocTitle}`;
  const entry = byKey.get(key) ?? { branch, code: mocCode, title: mocTitle, matches: [] };
  if (!entry.matches.some((m) => m.code === socCode)) {
    entry.matches.push({ code: socCode, title: socTitle });
  }
  byKey.set(key, entry);
}

const occupations = [...byKey.values()].sort(
  (a, b) => a.branch.localeCompare(b.branch) || a.code.localeCompare(b.code),
);

writeFileSync(
  out,
  JSON.stringify(
    {
      source: SOURCE_URL,
      generated: new Date().toISOString().slice(0, 10),
      occupations,
    },
    null,
    2,
  ),
);

const branches = [...new Set(occupations.map((o) => o.branch))].sort();
console.log(
  `Wrote ${occupations.length} military occupations across ${branches.length} branches ` +
    `(${branches.join(", ")}) to data/mos_crosswalk.json`,
);
