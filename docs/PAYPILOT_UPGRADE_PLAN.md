# PayPilot Upgrade Plan
*Generated: 2026-08-30 | Based on full repository audit*

---

## Current Architecture

### Backend
- **Framework:** FastAPI + Pydantic v2 + SQLAlchemy 2 async
- **Auth:** JWT via python-jose + passlib/bcrypt
- **DB:** PostgreSQL 16 via psycopg2-binary; schema managed by Alembic
- **AI:** Groq API with 12 tool-call capable functions
- **Services:** 13 service modules covering scoring, policy, experiments, anomaly detection, impact, radar, segmentation, leak detection, recommendations, root cause, evaluation, copilot tools
- **Routes:** 17 router files, ~60 endpoints

### Frontend
- **Framework:** Next.js 15 App Router, React 18, TypeScript
- **UI:** Tailwind CSS 3 with custom dark fintech token system, Framer Motion 11, Recharts, Lucide icons, Geist font
- **State:** RSC-first (no global state manager). Client components use local useState. BFF routes for auth + copilot proxy
- **Pages:** 16 pages across the dashboard group + login

### Database Schema
9 core tables: customers, subscriptions, payments, checkout_sessions, recovery_opportunities, recovery_attempts, revenue_events, ground_truth_scenarios, merchants / merchant_policies + 3 auxiliary: audit_decisions, experiments, experiment_assignments

---

## Current Strengths (PRESERVE)
1. **Transparent heuristic scoring** — risk_scoring.py uses explicitly factored formulas with no magic thresholds
2. **Idempotent event sourcing** — RevenueEvent + idempotency_key unique constraint is production-quality
3. **Ground truth evaluation pipeline** — train/heldout splits, calibration buckets, precision/recall/AUC for a heuristic system
4. **Deterministic experiment outcomes** — SHA256-seeded reproducible assignments
5. **DB-backed policy engine** — MerchantPolicy table wired to evaluation correctly
6. **Dashboard summary endpoint** — single `/dashboard/summary` call with real briefing insights
7. **Tool-backed copilot** — all 12 tools query real DB; system prompt prohibits inventing numbers
8. **Realistic seed data** — Faker en_IN, weighted distributions, beta-distributed churn, recent-biased failures
9. **Premium dark UI** — consistent design system, animated numbers, skeleton-ready component structure

---

## Current Weaknesses (MUST FIX)

### P0 — Crash/Blocker Bugs
| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `ActionStatus.executed` and `ActionStatus.dismissed` don't exist in enum | copilot_tools.py | Change to `ActionStatus.approved` / `ActionStatus.rejected` |
| 2 | `requirements.txt` missing `groq` and `faker` | requirements.txt | Add pinned versions |
| 3 | No auth redirect on unauthenticated RSC page loads | layout.tsx or middleware | Add Next.js middleware with cookie check + redirect to /login |

### P1 — Data/Logic Correctness
| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | Past-due subscriptions seeded with future `current_period_end` — subscription scoring returns 0 days_past_due | seed_data.py | Set `current_period_end` to `NOW - timedelta(days=rand(1,30))` for past_due status |
| 5 | `policy_engine.evaluate_policy()` uses `.first()` — always returns policy for first merchant | policy_engine.py | Accept and use `merchant_id` parameter |
| 6 | `opportunity_engine.evaluate_policy()` delegates but doesn't pass merchant context | opportunity_engine.py | Wire merchant_id through |
| 7 | Scenario customer names are `"Scenario Customer 001"` — obviously synthetic | seed_data.py | Replace with realistic Faker names + plausible emails |

### P2 — Missing Features / UX Gaps
| # | Issue | File | Fix |
|---|-------|------|-----|
| 8 | No `error.tsx` global boundary | apps/web/app/ | Add error.tsx + loading.tsx per page group |
| 9 | Playbook builder "Save" calls `alert()` | automation page | Wire to policy endpoint or add informative toast |
| 10 | Duplicate `/intelligence` router = dead code | main.py | Remove intelligence router |
| 11 | Customer detail drawer is missing — clicking customer shows nothing | customers page | Build Customer 360 drawer |
| 12 | Payment detail drawer is missing | payments page | Build payment detail drawer with recovery info |
| 13 | No Revenue Leak Map visualization | opportunities/command center | Build leak map with category breakdown and click-through filter |
| 14 | No Demo Mode / simulation trigger | new page | Build Demo Mode trigger page |
| 15 | `execute` endpoint exists but no "Execute Recovery" UX on opportunities | opportunities page | Add execute button with live progression feedback |
| 16 | Audit trail shows UUIDs as primary content, no readable timeline grouping | audit page | Build grouped timeline view per opportunity |
| 17 | No Customer 360 page | customers/ | Build customer detail page with full timeline |
| 18 | No Notifications panel | layout | Build notification drawer |

### P3 — Performance
| # | Issue | File | Fix |
|---|-------|------|-----|
| 19 | Missing indexes on payments.status, payments.customer_id, payments.created_at, subscriptions.status | alembic | Add migration with these indexes |
| 20 | Risk distribution does full customer table scan | risk.py | Add index; cache result for 60s with Redis or in-memory LRU |
| 21 | No caching layer — Redis configured but never used | All services | Add simple TTL cache for aggregate queries |

### P4 — Code Quality / Architecture
| # | Issue | File | Fix |
|---|-------|------|-----|
| 22 | `GROQ_API_KEY` missing from `.env.example` | .env.example | Add with clear comment |
| 23 | Seed uses `create_all` which can drift from Alembic | seed_data.py | Use Alembic-aware seeding (run migrations first) — already partially handled; document clearly |
| 24 | Hardcoded organic baseline 12% in impact.py | impact.py | Make configurable; clearly label as assumption |
| 25 | Login hardcodes "Demo Merchant" name | login/page.tsx | Use proper form field |

---

## Proposed Architecture (Upgrades Only — No Rewrites)

### New: Domain Event Model
Add `actor`, `source_system`, `correlation_id` metadata to existing `RevenueEvent`. No new infrastructure.

### New: Canonical Metrics Service
Single `metrics.py` service that all dashboards call. Eliminates duplicate calculations across revenue.py, dashboard.py, impact.py.

### New: Customer 360 API
`GET /customers/{id}` expanded with:
- subscription history
- payment success rate
- recovery attempts
- recovery success rate
- churn probability
- recommended action
- timeline events

### New: Execute Endpoint UX
`POST /opportunities/{id}/execute` already exists — add frontend "Execute Recovery" flow with staged progression UI.

### New: Revenue Leak Map
Categorized breakdown from existing `detect_leaks()` + opportunity aggregate by source. No new backend needed.

### New: Demo Mode
`POST /demo/trigger-payment-failure` endpoint that creates a deterministic payment failure, runs the full pipeline, and returns the created opportunity ID.

---

## Implementation Phases

### PHASE 1 — Fix Critical Bugs (P0)
**Files:** copilot_tools.py, requirements.txt, middleware.ts (new)  
**Risk:** Low — these are targeted fixes  
**Time estimate:** 1-2 hours

### PHASE 2 — Fix Data Correctness (P1)
**Files:** seed_data.py (scenario customer names, past-due period_end), policy_engine.py (merchant scoping)  
**Risk:** Low — seed changes require re-running seed  
**Time estimate:** 2-3 hours

### PHASE 3 — Missing Indexes + Performance Migration
**Files:** alembic/versions/ (new migration), optionally add LRU cache  
**Risk:** Low  
**Time estimate:** 1 hour

### PHASE 4 — Execute Recovery End-to-End UX
**Files:** opportunities/page.tsx, new ExecuteRecoveryFlow component, opportunity-actions.tsx  
**Risk:** Medium — touches live execute endpoint  
**Time estimate:** 3-4 hours

### PHASE 5 — Customer 360
**Files:** customers/[id]/page.tsx (new), customers/page.tsx (add link), api/routes/customers.py (expand detail endpoint)  
**Risk:** Low  
**Time estimate:** 4-5 hours

### PHASE 6 — Revenue Leak Map
**Files:** new LeakMap component, revenue/opportunities/page.tsx (filter support), opportunities route (add source filter)  
**Risk:** Low  
**Time estimate:** 2-3 hours

### PHASE 7 — Audit Trail Timeline
**Files:** audit/page.tsx (rewrite), new AuditTimeline component  
**Risk:** Low  
**Time estimate:** 2-3 hours

### PHASE 8 — Command Center Upgrades
**Files:** (dashboard)/page.tsx, new NotificationsPanel component  
**Risk:** Low  
**Time estimate:** 2-3 hours

### PHASE 9 — Demo Mode
**Files:** new apps/api/app/api/routes/demo.py, new apps/web/app/(dashboard)/demo/page.tsx  
**Risk:** Low (creates synthetic data, not destructive)  
**Time estimate:** 3-4 hours

### PHASE 10 — UI Polish Pass
**Files:** loading.tsx per page group, error.tsx, global search upgrade, notification drawer  
**Risk:** Low  
**Time estimate:** 3-4 hours

### PHASE 11 — Documentation
**Files:** README.md, docs/ARCHITECTURE.md, docs/DECISION_ENGINE.md, docs/DEMO.md  
**Risk:** None  
**Time estimate:** 2-3 hours

---

## Files/Components Affected Summary

**Backend:**
- `copilot_tools.py` — bug fixes
- `policy_engine.py` — merchant scoping
- `seed_data.py` — scenario names, past-due dates
- `requirements.txt` — add groq, faker
- `alembic/versions/` — new performance indexes migration
- `app/api/routes/customers.py` — expanded detail endpoint
- `app/api/routes/demo.py` — new Demo Mode endpoint
- `app/api/routes/opportunities.py` — execute endpoint improvements
- `app/core/config.py` — env validation improvements

**Frontend:**
- `app/middleware.ts` — auth redirect
- `app/(dashboard)/layout.tsx` — notifications
- `app/(dashboard)/customers/[id]/page.tsx` — Customer 360
- `app/(dashboard)/revenue/opportunities/page.tsx` — execute flow, leak map
- `app/(dashboard)/audit/page.tsx` — timeline view
- `app/(dashboard)/demo/page.tsx` — Demo Mode
- `components/dashboard/execute-recovery-flow.tsx` — new
- `components/dashboard/customer-360-drawer.tsx` — new
- `components/dashboard/leak-map.tsx` — new
- `components/dashboard/audit-timeline.tsx` — new
- `app/error.tsx` — new global error boundary
- `app/(dashboard)/loading.tsx` — new skeleton loaders

---

## Risks
1. Re-seeding database wipes existing recovery attempts — demo state resets. Mitigate: provide `--wipe` flag documentation.
2. Merchant scoping fix in policy engine could change policy evaluation results for existing data if multiple merchants exist. Mitigate: only affects multi-merchant scenarios; demo is single-merchant.
3. `execute_opportunity()` is deterministic via SHA256 — outcomes are fixed per opportunity. This is a feature, not a bug — clearly label as "simulated payment environment."

---

## Testing Strategy
- Fix existing policy engine tests to include merchant_id
- Add test for copilot tool bug fix (approve/dismiss enum values)
- Add integration test for full recovery loop: create payment → refresh opportunities → execute → verify outcome + audit event
- Add test for Demo Mode endpoint
- Document test commands in README
