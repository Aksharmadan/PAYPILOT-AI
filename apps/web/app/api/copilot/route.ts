import { NextRequest, NextResponse } from "next/server";
import { sendCopilotMessage } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const result = await sendCopilotMessage(message);
  return NextResponse.json(result);
}
