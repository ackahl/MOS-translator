/**
 * Builds data/terrain.json: real elevation contours for each branch's banner.
 *
 * Source: AWS Terrain Tiles (Terrarium encoding), https://registry.opendata.aws/terrain-tiles/
 *         Tiles are downloaded by get-terrain.ps1 into data/terrain/<slug>_<x>_<y>.png.
 *         Underlying elevation for these locations is USGS 3DEP / NED.
 *
 * Terrarium encodes elevation in the pixel: metres = (R * 256 + G + B / 256) - 32768.
 *
 * The 2x2 tile block is cropped to the banner's tall aspect, upsampled, then
 * traced with marching squares. Contours from one height field never cross,
 * which is what makes them read as terrain.
 */
import { PNG } from "pngjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tileDir = join(root, "data/terrain");
const out = join(root, "data/terrain.json");

const ZOOM = 12;
const PLACES = {
  "marine-corps": { name: "Camp Pendleton, California", lat: 33.3856, lon: -117.4653, xs: [711, 712], ys: [1644, 1645] },
  army: { name: "Fort Bragg, North Carolina", lat: 35.1415, lon: -78.9994, xs: [1148, 1149], ys: [1619, 1620] },
  navy: { name: "Joint Base Pearl Harbor-Hickam, Hawaii", lat: 21.3469, lon: -157.9397, xs: [250, 251], ys: [1798, 1799] },
  "air-force": { name: "Nellis Air Force Base, Nevada", lat: 36.236, lon: -115.0343, xs: [738, 739], ys: [1604, 1605] },
  "space-force": { name: "Peterson Space Force Base, Colorado", lat: 38.8154, lon: -104.7005, xs: [856, 857], ys: [1567, 1568] },
  "coast-guard": { name: "U.S. Coast Guard Academy, New London, Connecticut", lat: 41.3745, lon: -72.0995, xs: [1227, 1228], ys: [1529, 1530] },
  all: { name: "The Pentagon, Arlington, Virginia", lat: 38.8719, lon: -77.0563, xs: [1170, 1171], ys: [1566, 1567] },
};

/** Stitches the 2x2 block into one elevation grid in metres. */
function readElevation(slug, place) {
  const T = 256;
  const W = T * place.xs.length;
  const H = T * place.ys.length;
  const grid = new Float32Array(W * H);

  place.ys.forEach((y, gy) => {
    place.xs.forEach((x, gx) => {
      const file = join(tileDir, `${slug}_${x}_${y}.png`);
      if (!existsSync(file)) {
        throw new Error(`Missing tile ${file}. Run get-terrain.ps1 first.`);
      }
      const png = PNG.sync.read(readFileSync(file));
      for (let j = 0; j < T; j++) {
        for (let i = 0; i < T; i++) {
          const p = (j * png.width + i) * 4;
          const metres = png.data[p] * 256 + png.data[p + 1] + png.data[p + 2] / 256 - 32768;
          grid[(gy * T + j) * W + (gx * T + i)] = metres;
        }
      }
    });
  });

  return { grid, width: W, height: H };
}

/**
 * Crop to the banner's tall aspect, then bilinear upsample.
 *
 * The crop window slides horizontally to wherever the elevation varies most,
 * rather than sitting in the middle. A centred crop at Pearl Harbor lands on
 * open water and at Nellis on the valley floor; this finds the ridge inside the
 * same 20 km block. The window still covers ground at the named installation.
 */
function cropAndResample({ grid, width, height }, outW, outH) {
  const cropW = Math.round(height * (200 / 900));

  // Column-by-column spread, then the window with the largest total.
  const spread = [];
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let sumSq = 0;
    for (let y = 0; y < height; y++) {
      const v = Math.max(grid[y * width + x], 0);
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / height;
    spread.push(Math.sqrt(Math.max(sumSq / height - mean * mean, 0)));
  }

  let best = 0;
  let bestScore = -Infinity;
  for (let x0 = 0; x0 + cropW <= width; x0++) {
    let score = 0;
    for (let x = x0; x < x0 + cropW; x++) score += spread[x];
    if (score > bestScore) {
      bestScore = score;
      best = x0;
    }
  }
  const x0 = best;

  const sample = (fx, fy) => {
    const x = x0 + fx * (cropW - 1);
    const y = fy * (height - 1);
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const xi1 = Math.min(xi + 1, width - 1);
    const yi1 = Math.min(yi + 1, height - 1);
    const a = grid[yi * width + xi];
    const b = grid[yi * width + xi1];
    const c = grid[yi1 * width + xi];
    const d = grid[yi1 * width + xi1];
    const v = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    // Terrarium carries ocean bathymetry too. Left alone, a coastal site spends
    // most of its contour levels underwater, so the sea is flattened to 0 and
    // the levels spread across the land instead.
    return Math.max(v, 0);
  };

  const field = [];
  for (let j = 0; j <= outH; j++) {
    const row = [];
    for (let i = 0; i <= outW; i++) row.push(sample(i / outW, j / outH));
    field.push(row);
  }
  return field;
}

/**
 * A few box-blur passes over the height field. Flat coastal ground is full of
 * centimetre-scale noise, and without this every contour there shatters into
 * thousands of tiny segments. Mountains are barely affected.
 */
function smoothField(field, passes = 3) {
  let cur = field;
  for (let p = 0; p < passes; p++) {
    const next = cur.map((row) => row.slice());
    for (let j = 1; j < cur.length - 1; j++) {
      for (let i = 1; i < cur[j].length - 1; i++) {
        next[j][i] =
          (cur[j - 1][i - 1] + cur[j - 1][i] + cur[j - 1][i + 1] +
            cur[j][i - 1] + cur[j][i] * 2 + cur[j][i + 1] +
            cur[j + 1][i - 1] + cur[j + 1][i] + cur[j + 1][i + 1]) / 10;
      }
    }
    cur = next;
  }
  return cur;
}

/** Marching squares over the field, at evenly spaced elevations. */
function trace(field, levels) {
  const ROWS = field.length - 1;
  const COLS = field[0].length - 1;
  let min = Infinity;
  let max = -Infinity;
  for (const row of field) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const px = (i) => (i / COLS) * 200;
  const py = (j) => (j / ROWS) * 900;
  const cut = (a, b, va, vb, t) => a + ((t - va) / (vb - va || 1e-6)) * (b - a);

  const out = [];
  for (let l = 1; l <= levels; l++) {
    const t = min + ((max - min) * l) / (levels + 1);
    const segments = [];

    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const v00 = field[j][i];
        const v10 = field[j][i + 1];
        const v11 = field[j + 1][i + 1];
        const v01 = field[j + 1][i];
        const code = (v00 > t ? 8 : 0) | (v10 > t ? 4 : 0) | (v11 > t ? 2 : 0) | (v01 > t ? 1 : 0);
        if (code === 0 || code === 15) continue;

        const top = { x: cut(px(i), px(i + 1), v00, v10, t), y: py(j) };
        const right = { x: px(i + 1), y: cut(py(j), py(j + 1), v10, v11, t) };
        const bottom = { x: cut(px(i), px(i + 1), v01, v11, t), y: py(j + 1) };
        const left = { x: px(i), y: cut(py(j), py(j + 1), v00, v01, t) };
        const line = (a, b) =>
          segments.push(
            // Integer coordinates in a 200 x 900 viewBox: no visible difference
            // at this line density, and a much smaller page.
            `M${Math.round(a.x)} ${Math.round(a.y)}L${Math.round(b.x)} ${Math.round(b.y)}`,
          );

        switch (code) {
          case 1: case 14: line(left, bottom); break;
          case 2: case 13: line(bottom, right); break;
          case 3: case 12: line(left, right); break;
          case 4: case 11: line(top, right); break;
          case 6: case 9: line(top, bottom); break;
          case 7: case 8: line(left, top); break;
          case 5: line(left, top); line(bottom, right); break;
          case 10: line(left, bottom); line(top, right); break;
        }
      }
    }

    if (segments.length) out.push({ d: segments.join(""), index: l % 5 === 0 });
  }

  return { contours: out, minMetres: Math.round(min), maxMetres: Math.round(max) };
}

const places = {};
for (const [slug, place] of Object.entries(PLACES)) {
  const elevation = readElevation(slug, place);
  const field = smoothField(cropAndResample(elevation, 104, 468), 4);
  const { contours, minMetres, maxMetres } = trace(field, 13);
  places[slug] = {
    name: place.name,
    lat: place.lat,
    lon: place.lon,
    zoom: ZOOM,
    minMetres,
    maxMetres,
    contours,
  };
  console.log(
    `${slug.padEnd(14)} ${place.name.padEnd(50)} ${minMetres}m to ${maxMetres}m, ` +
      `${contours.length} contour levels`,
  );
}

writeFileSync(
  out,
  JSON.stringify({
    source: "https://registry.opendata.aws/terrain-tiles/",
    origin: "AWS Terrain Tiles (Terrarium), elevation from USGS 3DEP / NED",
    generated: new Date().toISOString().slice(0, 10),
    zoom: ZOOM,
    places,
  }),
);

console.log(`\nWrote data/terrain.json`);
