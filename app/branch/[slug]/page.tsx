import { notFound } from "next/navigation";
import { branchFromSlug, branchSummaries } from "../../../lib/branches";
import { BranchShell } from "../../../components/BranchShell";

export function generateStaticParams() {
  return branchSummaries().map((b) => ({ slug: b.slug }));
}

export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branch = branchFromSlug(slug);
  if (!branch) notFound();
  return <BranchShell branch={branch} slug={slug} />;
}
