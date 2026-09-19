import terrain from "../data/terrain.json";

/**
 * Per-branch banner colors, and the real-terrain contours behind them.
 *
 * Colors are drawn from each service's flag, toned to one lightness band so the
 * set reads as a family. These are design choices, not official specifications.
 * The contours are real elevation, built by scripts/build-terrain.mjs.
 */
export type BranchPalette = {
  /** Banner background. */
  base: string;
  /** Contour lines. Every fifth is drawn heavier, as on a real topo sheet. */
  line: string;
};

export const BRANCH_COLORS: Record<string, BranchPalette> = {
  all: { base: "#10182c", line: "#d9cfc0" },
  army: { base: "#25231d", line: "#c3b184" },
  navy: { base: "#142948", line: "#c9ad68" },
  "marine-corps": { base: "#5c1720", line: "#c99a56" },
  "air-force": { base: "#16305e", line: "#c4b177" },
  "space-force": { base: "#12151c", line: "#8d97a8" },
  "coast-guard": { base: "#103951", line: "#ad5c41" },
  "federal-civilian": { base: "#2b3548", line: "#aeb6c2" },
};

/** All Branches cycles its contour bands through the flag's three colors. */
export const FLAG_BANDS = ["#bf0a30", "#f2efe6", "#3c6fb5"];

export const palette = (slug: string): BranchPalette => BRANCH_COLORS[slug] ?? BRANCH_COLORS.all;

export type Contour = { d: string; index: boolean };

export type TerrainPlace = {
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  minMetres: number;
  maxMetres: number;
  contours: Contour[];
};

type TerrainFile = {
  source: string;
  origin: string;
  generated: string;
  places: Record<string, TerrainPlace>;
};

const file = terrain as unknown as TerrainFile;

export const terrainMeta = {
  source: file.source,
  origin: file.origin,
  generated: file.generated,
};

/** Real elevation contours for a branch's banner, or null when none was built. */
export function terrainFor(slug: string): TerrainPlace | null {
  return file.places[slug] ?? null;
}
