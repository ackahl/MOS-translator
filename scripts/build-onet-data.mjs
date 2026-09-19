/**
 * Builds data/onet_tasks.json from the O*NET database (text version).
 *
 * Source:  https://www.onetcenter.org/dl_files/database/db_30_0_text.zip
 * Licence: O*NET data are provided by the U.S. Department of Labor, Employment and
 *          Training Administration under CC BY 4.0. Attribution is shown in the app.
 *
 * Files used, all tab-separated with a header row:
 *   Occupation Data.txt        O*NET-SOC Code | Title | Description
 *   Task Statements.txt        O*NET-SOC Code | Task ID | Task | Task Type | ...
 *   Alternate Titles.txt       O*NET-SOC Code | Alternate Title | Short Title | Source(s)
 *   Sample of Reported Titles  O*NET-SOC Code | Reported Job Title | Shown in My Next Move
 *
 * Only occupations that the military crosswalk actually maps to are kept, so the
 * index covers exactly the destinations this app can reach.
 *
 * No-op when data/onet_tasks.json exists. --refresh rebuilds.
 * ONET_DB_DIR=/path/to/db_30_0_text builds from an already-extracted copy.
 */
import AdmZip from "adm-zip";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "data/onet_tasks.json");
const crosswalkPath = join(root, "data/mos_crosswalk.json");
const SOURCE_URL = "https://www.onetcenter.org/dl_files/database/db_30_0_text.zip";

if (existsSync(out) && !process.argv.includes("--refresh")) {
  const n = Object.keys(JSON.parse(readFileSync(out, "utf8")).occupations).length;
  console.log(`data/onet_tasks.json already present (${n} occupations). Use --refresh to rebuild.`);
  process.exit(0);
}

if (!existsSync(crosswalkPath)) {
  throw new Error("Run `npm run data` first - this index is scoped to the crosswalk's occupations.");
}

/** O*NET-SOC codes the military crosswalk actually maps to. */
const wanted = new Set();
for (const o of JSON.parse(readFileSync(crosswalkPath, "utf8")).occupations) {
  for (const m of o.matches) wanted.add(m.code);
}
console.log(`Crosswalk reaches ${wanted.size} distinct O*NET occupations.`);

/** Returns {filename: contents} for the four files we need. */
async function loadFiles() {
  const names = [
    "Occupation Data.txt",
    "Task Statements.txt",
    "Alternate Titles.txt",
    "Sample of Reported Titles.txt",
  ];

  const dir = process.env.ONET_DB_DIR;
  if (dir) {
    console.log(`Reading O*NET database from ${dir}`);
    const present = readdirSync(dir);
    const files = {};
    for (const n of names) {
      if (!present.includes(n)) throw new Error(`${n} not found in ${dir}`);
      files[n] = readFileSync(join(dir, n), "utf8");
    }
    return files;
  }

  console.log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
  const files = {};
  for (const n of names) {
    const entry = zip.getEntries().find((e) => e.entryName.endsWith(n));
    if (!entry) throw new Error(`${n} not found inside the archive`);
    files[n] = entry.getData().toString("utf8");
  }
  return files;
}

/** Tab-separated rows as objects keyed by the header row. */
function rows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const headers = lines[0].split("\t").map((h) => h.replace(/^﻿/, "").trim());
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const o = {};
    headers.forEach((h, i) => (o[h] = (cells[i] ?? "").trim()));
    return o;
  });
}

const files = await loadFiles();
const occupations = {};

for (const r of rows(files["Occupation Data.txt"])) {
  const code = r["O*NET-SOC Code"];
  if (!wanted.has(code)) continue;
  occupations[code] = {
    title: r["Title"],
    description: r["Description"],
    tasks: [],
    titles: [],
  };
}

let taskCount = 0;
for (const r of rows(files["Task Statements.txt"])) {
  const occ = occupations[r["O*NET-SOC Code"]];
  if (!occ) continue;
  occ.tasks.push({ text: r["Task"], core: r["Task Type"] === "Core" });
  taskCount++;
}

let titleCount = 0;
const addTitle = (code, title) => {
  const occ = occupations[code];
  if (!occ || !title || title === "n/a") return;
  if (!occ.titles.includes(title)) {
    occ.titles.push(title);
    titleCount++;
  }
};
for (const r of rows(files["Alternate Titles.txt"])) addTitle(r["O*NET-SOC Code"], r["Alternate Title"]);
for (const r of rows(files["Sample of Reported Titles.txt"]))
  addTitle(r["O*NET-SOC Code"], r["Reported Job Title"]);

const missing = [...wanted].filter((c) => !occupations[c]);

writeFileSync(
  out,
  JSON.stringify({
    source: SOURCE_URL,
    origin: "O*NET 30.0 Database, U.S. Department of Labor, Employment and Training Administration",
    generated: new Date().toISOString().slice(0, 10),
    counts: {
      occupations: Object.keys(occupations).length,
      tasks: taskCount,
      titles: titleCount,
      crosswalkOccupationsMissing: missing.length,
    },
    occupations,
  }),
);

console.log(
  `Wrote ${Object.keys(occupations).length} occupations, ${taskCount} task statements and ` +
    `${titleCount} job titles to data/onet_tasks.json.` +
    (missing.length ? `\n${missing.length} crosswalk occupations are not in this O*NET release.` : ""),
);
