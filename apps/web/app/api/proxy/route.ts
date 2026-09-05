import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }
    const data = await apiFetch<unknown>(path);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    let body: string | undefined;
    let headers: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      body = await req.text();
      headers = { "Content-Type": "application/json" };
    }

    const data = await apiFetch<unknown>(path, {
      method: "POST",
      ...(body ? { body } : {}),
      headers,
    });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status =
      msg.includes("404") ? 404 :
      msg.includes("401") ? 401 :
      msg.includes("409") ? 409 :
      msg.includes("400") ? 400 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}
