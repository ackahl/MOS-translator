import { NextRequest, NextResponse } from "next/server";
import crosswalk from "../../../data/mos_crosswalk.json";
import { searchOccupations } from "../../../lib/search";
import type { Crosswalk, SearchResponse } from "../../../lib/types";

const data = crosswalk as Crosswalk;
const MAX = 100;

export function GET(request: NextRequest): NextResponse<SearchResponse> {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const branch = params.get("branch") ?? "All branches";
  const limit = Math.min(Number(params.get("limit")) || 40, MAX);

  const hits = searchOccupations(data.occupations, q, branch);
  return NextResponse.json({ total: hits.length, results: hits.slice(0, limit) });
}
