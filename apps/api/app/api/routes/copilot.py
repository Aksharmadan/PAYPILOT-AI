import json
import os

from fastapi import APIRouter, Depends, HTTPException
from groq import Groq
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.schemas.revenue import CopilotMessageIn, CopilotMessageOut
from app.services.copilot_tools import TOOLS, execute_tool

router = APIRouter(prefix="/copilot", tags=["copilot"])

SYSTEM_PROMPT = (
    "You are PayPilot's AI Copilot, a revenue recovery assistant for a merchant "
    "dashboard. Answer questions about revenue, failed payments, abandoned "
    "checkouts, and recovery opportunities using the provided tools. Never "
    "invent numbers -- always call a tool to get real data before answering "
    "anything quantitative. Keep answers concise and merchant-friendly. "
    "Amounts are in INR."
)


@router.post("/chat", response_model=CopilotMessageOut)
def chat(
    payload: CopilotMessageIn,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or api_key == "your-key-here":
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured in apps/api/.env")

    client = Groq(api_key=api_key)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": payload.message},
    ]
    tools_used = []

    for _ in range(5):  # cap tool-call rounds to avoid runaway loops
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=TOOLS,
            max_tokens=1024,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return CopilotMessageOut(reply=msg.content or "", tools_used=tools_used)

        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
        })

        for tc in msg.tool_calls:
            tools_used.append(tc.function.name)
            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
            result = execute_tool(db, tc.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": str(result),
            })

    return CopilotMessageOut(reply="I wasn't able to complete that request.", tools_used=tools_used)
