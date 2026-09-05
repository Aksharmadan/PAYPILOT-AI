# PayPilot AI — Project Audit

**Date:** 2026-08-26  
**Branch:** `cursor/ui-elevation`  
**Stack:** Next.js 15 (App Router) · FastAPI · SQLAlchemy 2 · PostgreSQL · Alembic  

This audit is based on reading the repository and verifying live `/health` + web `200` responses. Docker Desktop was down at audit time; API/web were already running against an existing Postgres instance.

---

## 1. Architecture (current)

```
Browser → Next.js (apps/web)
            ├─ RSC pages fetch via lib/api.ts (server cookies / DEV_API_TOKEN)
            ├─ /api/copilot BFF → FastAPI /copilot/chat
            └─ /api/auth/* → FastAPI /auth/*

FastAPI (apps/api)
  routes → services (opportunity_engine, risk_scoring, experiment_engine,
           evaluation, anomaly, segmentation, copilot_tools)
         → SQLAlchemy models → PostgreSQL

Alembic runs on API startup (no create_all in main).
Seed script still uses create_all (drift risk).
```

**No multi-tenant isolation** — revenue tables lack `merchant_id`; any JWT sees the full demo dataset.  
**No payment-provider abstraction** — recovery is simulated.  
**No standalone `policy_engine` module** — policy lives in `opportunity_engine.evaluate_policy()`.  
**Redis configured but unused.**

---

## 2. What already works (preserve)

| Area | Status |
|------|--------|
| Command Center | Real `getRevenueSummary` + `getRevenueAtRisk` |
| Opportunities list + approve/reject/simulate | Real |
| Recovery monitor | Real (read-only queue view) |
| Experiments create/start/results | Real lift metrics from RecoveryAttempt |
| Customers / Payments / Subscriptions tables | Real + pagination |
| Risk distribution + failure anomaly | Real |
| Analytics (evaluation summary) | Real heldout metrics |
| Audit events + decisions | Real |
| Automation policy queues | Real (derived from opportunities) |
| Copilot | Real Groq tool-calling (needs `GROQ_API_KEY`) |
| Auth JWT | Works; expire default 30d in config |
| `./start.sh` + `scripts/dev_token.py` | Present |
| UI elevation | Motion, ⌘K navigate palette, toasts, skeletons (partial) |

---

## 3. Broken / incomplete / fake

| Issue | Severity | Location |
|-------|----------|----------|
| AI Command Bar non-interactive | High | `ai-command-bar.tsx` |
| Settings static / non-saving | High | `settings/page.tsx` |
| ⌘K does not search entities | High | `command-palette.tsx` |
| Execute can run without approve | High | `execute_opportunity` |
| `GET /opportunities` refreshes DB every request | Critical perf | `opportunities.py` |
| Copilot tool schema missing 2 tools | Medium | `copilot_tools.TOOLS` |
| Copilot “streaming” is typewriter after full JSON | Low | `copilot-client.tsx` |
| No `error.tsx` / branded error UX | High | apps/web |
| Loading skeletons missing on many routes | Medium | opportunities, recovery, analytics, audit, automation |
| No Customer 360 / Payment / Opportunity detail drawer | High | missing routes |
| No dashboard summary endpoint | High | frontend does multi-fetch |
| Policy thresholds hardcoded, not configurable | High | `AUTO_AMOUNT_LIMIT` etc. |
| Recovery is a table, not an ops center | Medium | recovery page |
| Seed amounts highly discrete / patterned | Medium | `seed_data.py` |
| Past-due seed `current_period_end` in future | Medium | seed scenarios |
| Topbar avatar dead | Low | topbar |
| Palette “Approve all auto…” only navigates | Low | command-palette |

---

## 4. Performance problems (priority order)

1. **Every opportunities list calls `refresh_opportunities`** — scans failed payments / abandoned checkouts / past-due subs, upserts, commits.
2. **Full-table `Customer.all()`** in risk distribution, high-confidence totals, refresh, copilot risk tool.
3. **N+1** — `segment_for_customer` 2 queries per customer in list; experiment results per-assignment queries.
4. **Missing indexes** on `payments.status|customer_id|created_at`, `subscriptions.status|customer_id`, checkout status/started_at.
5. **Large unvirtualized tables** (risk 200, automation 120, recovery 80).
6. **Experiments page waterfall** — list then results sequentially.
7. **`cache: "no-store"` everywhere** — no revalidation strategy.
8. **Evaluation** loads all heldout points and recomputes multiple times.

---

## 5. API map (summary)

Authenticated unless noted:  
`/health` · `/auth/*` · `/customers` · `/payments` · `/subscriptions` · `/risk/*` · `/revenue/*` · `/opportunities*` · `/evaluation/*` · `/audit/*` · `/experiments*` · `/copilot/chat`

**Missing purpose-built endpoints:**  
`/dashboard/summary` · `/recovery/queue` · `/customers/{id}/360` · `/payments/{id}` detail · `/opportunities` without forced refresh · `/search` · `/policy` CRUD · `/alerts` · `/briefing`

---

## 6. Database map

**Core:** merchants, customers, payments, subscriptions, checkout_sessions  
**Intelligence:** recovery_opportunities, recovery_attempts, ground_truth_scenarios, revenue_events  
**Ops:** experiments, experiment_assignments, audit_decisions  

Indexes present on opportunity source/customer, events, audit, experiment assignments.  
**Gaps:** payment/subscription filter columns.

---

## 7. UI component map

Reusable today: StatusBadge, EmptyState, Skeleton/TableSkeleton, Toast, CommandPalette (nav), AnimatedNumber, Stagger, RevenuePulse, PaginationControls, tables (customers/payments/subscriptions), RiskSummaryBar.

**Missing design-system primitives:** DataTable, MetricCard, FilterBar, Drawer, Modal, Timeline, ConfidenceBadge, OpportunityCard, ChartContainer, ErrorState, SortableHeader (duplicated 4×).

---

## 8. Technical debt

- Seed `create_all` vs Alembic-only runtime  
- `groq` / `faker` used but not always in requirements  
- Shared-tenant demo data  
- Heuristic scoring presented next to “model” evaluation without clear labeling  
- Violet used once on Recovery “Total” (fixed in UI elevation pass)  
- No middleware auth redirect  

---

## 9. Recommended implementation order

| Phase | Focus | Impact |
|-------|-------|--------|
| 0 | This audit | Orient |
| 1 | Broken UX + execute gating + stop forced refresh | Reliability |
| 2 | Indexes + dashboard summary + query efficiency | Speed |
| 3 | Frontend fetch/loading/error + entity search | Speed/UX |
| 4 | Shared design primitives | Consistency |
| 5 | Command Center hero (WHAT/WHY/SO WHAT/NOW WHAT) | Product |
| 6 | Opportunity detail drawer + filters | Product |
| 7 | Recovery ops center + state machine clarity | Product |
| 8 | Customer 360 / payment / subscription detail | Product |
| 9 | Copilot tools + structured responses | Intelligence |
| 10 | Analytics split business vs model; experiments UX | Insights |
| 11 | Policy config + richer audit | Ops |
| 12 | Simulation + briefing + alerts | Premium |
| 13 | Tests | Quality |
| 14 | Polish + acceptance checklist | Ship |

---

## 10. Verification environment notes

- API `:8000` healthy at audit time  
- Web `:3000` responding  
- Docker Desktop **down** — cannot rely on compose recreate without starting Docker  
- No `ANTHROPIC_API_KEY`; copilot uses **Groq** when `GROQ_API_KEY` set  

---

*Next: execute Phase 1 → 2 highest-impact fixes, verify after each.*
