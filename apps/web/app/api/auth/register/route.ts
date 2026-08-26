import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 400) {
    return NextResponse.json({ detail: "Unable to create merchant" }, { status: res.status });
  }

  return NextResponse.json({ ok: true, alreadyExists: res.status === 400 });
}
