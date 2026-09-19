import Link from "next/link";
import crosswalk from "../data/mos_crosswalk.json";
import { ALL, bannerPath, branchSummaries, emblemPath } from "../lib/branches";
import { branchFill } from "../lib/branchColors";
import { BranchTabs, type TabItem } from "./BranchTabs";
import { Translator } from "./Translator";
import type { Crosswalk, CrosswalkMeta } from "../lib/types";

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
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Military Occupation Translator</h1>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
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
              <div className="h-full w-full" style={{ background: branchFill(slug) }} />
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
