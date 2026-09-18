# Military Occupation Translator

Looks up a military occupation code (MOS / AFSC / rating / NEC) and returns the civilian
occupations the U.S. Department of Labor's O*NET Military Crosswalk maps it to, with a link to
each O*NET occupation summary.

Sprint 5 bonus proof of concept. Next.js 15, deployed on Vercel.

## Data

All content comes from one file: the O*NET Military Crosswalk,
`https://www.onetcenter.org/dl_files/2019/military_crosswalk.zip`.
Nothing in this app is generated, estimated or written by hand.

`scripts/build-mos-data.mjs` downloads that archive, parses the CSV inside it and writes
`data/mos_crosswalk.json`. That JSON is not committed — it is rebuilt by `npm run build`, both
locally and on Vercel.

O*NET data are provided by the U.S. Department of Labor, Employment and Training Administration
under CC BY 4.0. The attribution is shown in the app footer.

## Run it locally

1. `npm install`
2. `npm run dev`
3. Open http://localhost:3000

The first run downloads the crosswalk. To force a re-download later: `npm run data:refresh`.

If your network blocks onetcenter.org, download the zip by hand and point the script at it:

    MOS_CROSSWALK_FILE=/path/to/military_crosswalk.zip npm run data:refresh

## Deploy

1. `git init && git add -A && git commit -m "Military occupation translator"`
2. Create an empty repo on github.com — do not add a README or .gitignore.
3. `git remote add origin https://github.com/<you>/mos-translator.git`
4. `git branch -M main`
5. `git push -u origin main`
6. On vercel.com choose Add New → Project, import the repo, accept the detected Next.js settings, and deploy.

No environment variables are required.
