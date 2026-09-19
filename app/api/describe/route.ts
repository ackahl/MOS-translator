import { NextRequest, NextResponse } from "next/server";
import { describe, type DescribeHit } from "../../../lib/describe";

export function GET(request: NextRequest): NextResponse<{ results: DescribeHit[] }> {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 10, 25);
  return NextResponse.json({ results: describe(q, limit) });
}
