import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "8");
    if (!q.trim()) {
      return NextResponse.json({ query: q, total: 0, items: [] });
    }
    const data = await globalSearch(q, limit);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
