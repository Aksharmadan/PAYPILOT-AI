#!/usr/bin/env python3
"""Print a fresh JWT for the seeded demo merchant.

Usage (from apps/api):
  .venv/bin/python scripts/dev_token.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import httpx

API_BASE = "http://localhost:8000"
EMAIL = "demo@paypilot.dev"
PASSWORD = "paypilot-demo"
NAME = "Demo Merchant"


def ensure_merchant(client: httpx.Client) -> None:
    register = client.post(
        f"{API_BASE}/auth/register",
        json={"name": NAME, "email": EMAIL, "password": PASSWORD},
    )
    if register.status_code not in (200, 400):
        register.raise_for_status()


def login(client: httpx.Client) -> str:
    response = client.post(
        f"{API_BASE}/auth/login",
        data={"username": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Login succeeded but no access_token returned")
    return token


def main() -> int:
    try:
        with httpx.Client(timeout=10.0) as client:
            health = client.get(f"{API_BASE}/health")
            health.raise_for_status()
            ensure_merchant(client)
            print(login(client))
        return 0
    except Exception as exc:  # noqa: BLE001 — CLI surface
        print(f"dev_token failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    # Allow `python scripts/dev_token.py` from apps/api
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    raise SystemExit(main())
