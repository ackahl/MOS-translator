# Military Occupation Translator

Enter a military occupation code or title and get the civilian occupations the U.S. Department of
Labor's O*NET Military Crosswalk maps it to, each linking to its O*NET occupation summary.

Sprint 5 bonus proof of concept. Next.js 15, deployed on Vercel.

## Data

One source: the O*NET Military Crosswalk,
`https://www.onetcenter.org/dl_files/2019/military_crosswalk.zip`, built from Defense Manpower Data
Center records. Nothing in this app is generated, estimated or written by hand.

`scripts/build-mos-data.mjs` downloads that archive, parses `milx0724.csv` inside it and writes
`data/mos_crosswalk.json`. Field definitions come from the archive's own `Read Me.pdf`.

What the build keeps and drops, from 40,077 source rows:

| | Rows |
|---|---|
| Active codes with at least one O*NET match (kept) | 12,215 |
| Obsolete records (`STATUS` = O) | 16,727 |
| Active records with no O*NET match | 10,437 |

The 12,215 kept codes carry 13,020 occupation matches across Air Force, Army, Coast Guard, Marine
Corps, Navy, Space Force and federal civilian (OPM) series.

`data/mos_crosswalk.json` and `data/onet_tasks.json` are committed, so a deploy does not depend on
onetcenter.org being reachable at build time. To rebuild both against newer releases:
`npm run data:refresh`.

O*NET data are provided by the U.S. Department of Labor, Employment and Training Administration
under CC BY 4.0. The attribution is shown in the app footer.

## Describe your work

A second search mode takes a plain-English description of a duty and returns the civilian
occupations whose O*NET task statements match it, with those statements shown verbatim so the
match can be checked.

That index is built by `scripts/build-onet-data.mjs` from the O*NET 30.0 database
(`https://www.onetcenter.org/dl_files/database/db_30_0_text.zip`), using four of its files:
Occupation Data, Task Statements, Alternate Titles, and Sample of Reported Titles. It is scoped to
the 427 occupations the military crosswalk actually reaches, and holds 7,850 task statements and
25,108 reported job titles.

Ranking is term-frequency based: query terms are stemmed, stopped against a list of words too
generic to discriminate (including bare numbers), weighted by inverse document frequency, and a
query of three or more terms must match at least two of them. Nothing is generated; every result
is a row of federal data.

## How it works

The dataset is 3 MB, so it is not shipped to the browser. `app/api/search/route.ts` holds it
server-side and returns ranked matches; the page requests them as you type. Ranking order: exact
code, code prefix, title starts-with, title contains, then matched civilian occupation title.

## Run it locally

1. `npm install`
2. `npm run dev`
3. Open http://localhost:3000

If your network blocks onetcenter.org, point the build script at a local copy:

    MOS_CROSSWALK_FILE=/path/to/military_crosswalk.zip npm run data:refresh

## Deploy

1. `git add -A && git commit -m "Military occupation translator"`
2. Create an empty repo on github.com — do not add a README or .gitignore.
3. `git remote add origin https://github.com/<you>/mos-translator.git`
4. `git branch -M main`
5. `git push -u origin main`
6. On vercel.com choose Add New → Project, import the repo, accept the detected Next.js settings, and deploy.

No environment variables are required.
