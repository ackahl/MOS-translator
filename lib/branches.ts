import crosswalk from "../data/mos_crosswalk.json";
import type { Crosswalk } from "./types";

const data = crosswalk as Crosswalk;

export const ALL = "All branches";

/** URL-safe slug for a branch name. "Marine Corps" -> "marine-corps" */
export const slugify = (branch: string) => branch.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export type BranchSummary = {
  name: string;
  slug: string;
  codes: number;
  matches: number;
};

/** Code and match counts per branch, largest first. Computed from the crosswalk. */
export function branchSummaries(): BranchSummary[] {
  const map = new Map<string, { codes: number; matches: number }>();
  for (const o of data.occupations) {
    const e = map.get(o.branch) ?? { codes: 0, matches: 0 };
    e.codes += 1;
    e.matches += o.matches.length;
    map.set(o.branch, e);
  }
  return [...map.entries()]
    .map(([name, e]) => ({ name, slug: slugify(name), ...e }))
    .sort((a, b) => b.codes - a.codes);
}

export function branchFromSlug(slug: string): string | null {
  if (slug === "all") return ALL;
  return branchSummaries().find((b) => b.slug === slug)?.name ?? null;
}

/**
 * Looks for an emblem image in public/branches/<slug>.<ext> at build time.
 * Returns the public path, or null when no file has been supplied yet.
 */
export function emblemPath(slug: string): string | null {
  return assetPath("branches", slug);
}

/**
 * Looks for a vertical banner image in public/banners/<slug>.<ext> at build time.
 * Shown frozen down the left side of a branch page. Null when none supplied yet.
 */
export function bannerPath(slug: string): string | null {
  return assetPath("banners", slug);
}

function assetPath(folder: string, slug: string): string | null {
  // Imported lazily so the client bundle never pulls in node:fs.
  const { existsSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");
  for (const ext of ["png", "svg", "jpg", "jpeg", "webp"]) {
    if (existsSync(join(process.cwd(), "public", folder, `${slug}.${ext}`))) {
      return `/${folder}/${slug}.${ext}`;
    }
  }
  return null;
}
