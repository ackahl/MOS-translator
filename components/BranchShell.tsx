import Link from "next/link";
import crosswalk from "../data/mos_crosswalk.json";
import { ALL, bannerPath, branchSummaries, emblemPath } from "../lib/branches";
import { FLAG_BANDS, palette, terrainFor } from "../lib/branchColors";
import { BranchTabs, type TabItem } from "./BranchTabs";
import { Translator } from "./Translator";
import type { Crosswalk, CrosswalkMeta } from "../lib/types";

/** Banner drawn from real elevation contours at the branch's home station. */
function TopoBanner({ slug }: { slug: string }) {
  const { base, line } = palette(slug);
  const place = terrainFor(slug);
  if (!place) return <div className="h-full w-full" style={{ background: base }} />;

  return (
    <svg
      viewBox="0 0 200 900"
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      role="img"
      aria-label={`Elevation contours at ${place.name}`}
    >
      <title>{place.name}</title>
      <rect width="200" height="900" fill={base} />
      <g fill="none">
        {place.contours.map((c, i) => (
          <path
            key={i}
            d={c.d}
            stroke={slug === "all" ? FLAG_BANDS[i % FLAG_BANDS.length] : line}
            strokeWidth={c.index ? 1.6 : 0.8}
            strokeOpacity={c.index ? 0.6 : 0.3}
          />
        ))}
      </g>
    </svg>
  );
}

/** Shared layout for the landing view and every branch view. */
export function BranchShell({ branch, slug }: { branch: string; slug: string }) {
  const { occupations, ...meta } = crosswalk as Crosswalk;
  const summaries = branchSummaries();
  const locked = branch === ALL ? null : branch;
  const banner = bannerPath(slug) ?? emblemPath(slug);

  const tabs: TabItem[] = [
    { label: "All branches", slug: "all", codes: meta.counts.occupations },
    ...summaries
      .filter((b) => b.name !== "Federal Civilian")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ label: b.name, slug: b.slug, codes: b.codes })),
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6">
      <header className="mb-5 text-center">
        <p
          className="font-title text-[12px] uppercase"
          style={{ color: "var(--accent)", letterSpacing: "0.26em" }}
        >
          Military Occupation
        </p>
        <h1
          className="font-title mt-1 text-[36px] leading-none sm:text-[46px]"
          style={{ letterSpacing: "0.01em" }}
        >
          Translator
        </h1>
        <div
          className="mx-auto mt-3.5 h-px w-24"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--accent) 50%, transparent)",
          }}
        />
        <p className="mx-auto mt-3 max-w-[640px] text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {meta.counts.occupations.toLocaleString("en-US")} active occupation codes mapped to{" "}
          {meta.counts.matches.toLocaleString("en-US")} civilian occupations by the U.S. Department
          of Labor.
        </p>
      </header>

      <BranchTabs tabs={tabs} />

      <div key={slug} className="rise mt-6 flex gap-6">
        <aside
          className="hidden w-[210px] shrink-0 md:block"
          style={{ position: "sticky", top: 20, alignSelf: "flex-start" }}
        >
          <div className="card overflow-hidden" style={{ height: "calc(100vh - 40px)" }}>
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt=""
                className="block h-full w-full"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <TopoBanner slug={slug} />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Translator meta={meta as CrosswalkMeta} lockedBranch={locked} />
        </main>
      </div>

      <footer className="mt-10 text-[12px]" style={{ color: "var(--text-muted)" }}>
        Source: O*NET Military Crosswalk, built {meta.generated} from{" "}
        <Link className="underline underline-offset-2" href={meta.source}>
          {meta.source}
        </Link>
        . Underlying data: {meta.origin}. Obsolete records and codes with no O*NET match are
        excluded. O*NET is a trademark of the U.S. Department of Labor, Employment and Training
        Administration. Data used under CC BY 4.0.
      </footer>
    </div>
  );
}
