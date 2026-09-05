# PayPilot Architecture

## System Diagram

```
Browser (Next.js 15 App Router)
    │
    ├── RSC pages  ──────────────────► lib/api.ts ──► FastAPI (port 8000)
    │     (server-side fetch)                              │
    │                                                      ├── /auth
    ├── Client components                                  ├── /customers
    │     (fetch via /api/proxy)                          ├── /payments
    │                                                      ├── /subscriptions
    └── BFF routes (/api/*)                               ├── /opportunities
          ├── /api/auth         (login/logout/register)   ├── /revenue
          ├── /api/copilot      (proxy to /copilot/chat)  ├── /dashboard
          ├── /api/proxy        (generic GET+POST proxy)  ├── /risk
          ├── /api/policy       (GET/POST /policy)        ├── /audit
          ├── /api/search       (GET /search)             ├── /experiments
          └── /api/simulation   (POST /simulation/...)    ├── /simulation
                                                          ├── /policy
                                                          ├── /demo
                                                          └── /copilot

FastAPI
    │
    ├── SQLAlchemy 2 (sync) ──────────────► PostgreSQL 16
    │
    └── Groq SDK ────────────────────────► Groq API (LLM + tool calling)
```

## Request Flow: RSC Page Load

```
Browser → Next.js RSC page
    → lib/api.ts (apiFetch)
    → reads httpOnly cookie "paypilot_token" (or DEV_API_TOKEN)
    → fetch(API_BASE_URL + path, { Authorization: Bearer <token> })
    → FastAPI route
    → Depends(get_current_merchant) verifies JWT
    → SQLAlchemy query
    → Pydantic serialization
    → JSON response
    → RSC renders HTML
    → sent to browser
```

## Request Flow: Client Component (execute button)

```
Browser button click
    → fetch("/api/proxy?path=/opportunities/{id}/execute", { method: POST })
    → Next.js /api/proxy/route.ts
    → apiFetch("/opportunities/{id}/execute", { method: POST })
    → FastAPI POST /opportunities/{id}/execute
    → opportunity_engine.execute_opportunity()
    → [SHA256 outcome draw]
    → RecoveryAttempt INSERT
    → RevenueEvent INSERT (idempotent)
    → DB commit
    → serialize_opportunity()
    → JSON response
    → proxy returns to browser
    → ExecuteRecoveryButton renders result
    → router.refresh() triggers RSC re-render
```

## Request Flow: AI Copilot

```
User message
    → /api/copilot/route.ts (BFF)
    → fetch(API_BASE + "/copilot/chat", { message })
    → FastAPI POST /copilot/chat
    → Groq API: initial LLM call with TOOLS + system prompt
    → LLM returns tool_calls[]
    → execute_tool(db, tool_name, tool_args)  [up to 5 rounds]
        → queries PostgreSQL, returns real data
    → tool result appended to message history
    → final LLM call: "here is the data, now explain"
    → response.reply = LLM explanation (grounded in tool results)
    → BFF returns { reply, tools_used[] }
    → CopilotClient renders with StreamingText + ToolChip components
```

## Authentication

- JWT signed with SECRET_KEY (HS256), 30-day expiry
- Stored as `paypilot_token` httpOnly cookie (set by /api/auth/login BFF route)
- SSR reads cookie from Next.js headers
- Client components use /api/proxy which reads the same cookie server-side
- `middleware.ts` redirects unauthenticated requests to /login

## Service Boundaries

| Service | Responsibility | Does NOT |
|---------|---------------|---------|
| `risk_scoring.py` | Score a single entity | Touch the database |
| `policy_engine.py` | Evaluate policy for scored entity | Make scoring decisions |
| `opportunity_engine.py` | Upsert opportunities, execute, record events | Score entities directly |
| `copilot_tools.py` | DB query functions for AI tools | Apply business logic |
| `evaluation.py` | Compute model metrics against ground truth | Make recovery decisions |
| `experiment_engine.py` | Assign entities to arms, compute lift | Score or execute |
| `impact.py` | Aggregate business impact metrics | Read individual events |

## Database Connection

- `SessionLocal` is a `sessionmaker(autocommit=False, autoflush=False)` factory
- `get_db()` is a FastAPI dependency that yields a session and closes it after the request
- Alembic runs `upgrade head` on startup; no `create_all` in production code

## Frontend State Model

- **No global state manager** (no Redux, Zustand, Jotai)
- RSC pages fetch on the server — data is always fresh (`cache: "no-store"`)
- Client components own local UI state (loading, confirmation dialogs)
- After mutations, `router.refresh()` triggers RSC re-fetch — single source of truth
- Toast notifications via React context (`ToastProvider` in root layout)
