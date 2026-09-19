/**
 * Banner fill for the branch column. One olive base for every branch, with a
 * contour overlay in khaki, matching the reference palette. The contour's
 * origin shifts per branch so no two look identical.
 */
const ORIGINS: Record<string, string> = {
  all: "30% 18%",
  army: "22% 12%",
  navy: "38% 24%",
  "marine-corps": "26% 16%",
  "air-force": "34% 10%",
  "space-force": "18% 26%",
  "coast-guard": "42% 14%",
  "federal-civilian": "30% 30%",
};

/** Layered CSS background: contour rings over the sage base. */
export function branchFill(slug: string): string {
  const at = ORIGINS[slug] ?? ORIGINS.all;
  return [
    `repeating-radial-gradient(circle at ${at}, transparent 0 22px, var(--banner-line) 22px 24px)`,
    "var(--banner)",
  ].join(", ");
}
