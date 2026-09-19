/**
 * Per-branch colors and a procedurally drawn topographic banner.
 *
 * Colors are drawn from each service's flag, toned to sit in one lightness band
 * so the set reads as a family. These are design choices, not official specs.
 */
export type BranchPalette = {
  /** Banner background. */
  base: string;
  /** Contour lines. Every fifth is drawn heavier, as on a real topo sheet. */
  line: string;
};

export const BRANCH_COLORS: Record<string, BranchPalette> = {
  all: { base: "#1b3054", line: "#d9cfc0" },
  army: { base: "#25231d", line: "#c3b184" },
  navy: { base: "#142948", line: "#c9ad68" },
  "marine-corps": { base: "#5c1720", line: "#c99a56" },
  "air-force": { base: "#16305e", line: "#c4b177" },
  "space-force": { base: "#12151c", line: "#8d97a8" },
  "coast-guard": { base: "#103951", line: "#ad5c41" },
  "federal-civilian": { base: "#2b3548", line: "#aeb6c2" },
};

export const palette = (slug: string): BranchPalette => BRANCH_COLORS[slug] ?? BRANCH_COLORS.all;

/** Deterministic PRNG so a branch's terrain is the same on every render. */
function seeded(slug: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Contour = { d: string; index: boolean };

/**
 * Closed contour rings whose radius wobbles with a few sine harmonics, which is
 * what gives them the irregular look of elevation lines rather than circles.
 * Coordinates are in a 200 x 900 viewBox.
 */
export function contours(slug: string, rings = 22): Contour[] {
  const rand = seeded(slug);
  const W = 200;
  const H = 900;

  // Two centres, so the terrain reads as a ridge rather than one hill.
  const peaks = [
    { x: W * (0.2 + rand() * 0.3), y: H * (0.12 + rand() * 0.16), weight: 1 },
    { x: W * (0.5 + rand() * 0.4), y: H * (0.58 + rand() * 0.25), weight: 0.85 },
  ];

  // Harmonic phases per peak, fixed up front so rings nest instead of crossing.
  const harmonics = peaks.map(() =>
    [2, 3, 5].map((k) => ({ k, phase: rand() * Math.PI * 2, amp: 0.06 + rand() * 0.07 })),
  );

  const out: Contour[] = [];
  for (let r = 0; r < rings; r++) {
    peaks.forEach((peak, pi) => {
      const step = (r + 1) * 26 * peak.weight;
      const pts: string[] = [];
      const SEGMENTS = 64;
      for (let s = 0; s <= SEGMENTS; s++) {
        const a = (s / SEGMENTS) * Math.PI * 2;
        let wobble = 1;
        for (const h of harmonics[pi]) wobble += h.amp * Math.sin(h.k * a + h.phase);
        const radius = step * wobble;
        const x = peak.x + Math.cos(a) * radius;
        // Stretched vertically: the banner is tall and narrow.
        const y = peak.y + Math.sin(a) * radius * 2.1;
        pts.push(`${s === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      out.push({ d: `${pts.join(" ")} Z`, index: (r + 1) % 5 === 0 });
    });
  }
  return out;
}
