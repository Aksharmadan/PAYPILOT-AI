import { NextRequest, NextResponse } from "next/server";
import { getPolicy, updatePolicy } from "@/lib/api";

export async function GET() {
  try {
    const data = await getPolicy();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const data = await updatePolicy(payload);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
