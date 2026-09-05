# PAYPILOT AI — PROJECT UPGRADE PLAN & AUDIT

This plan has been compiled after a complete inspect of the backend, frontend, database models, services, scoring, recovery logic, and AI analysts in the PayPilot repository.

---

## 1. Current Architecture
```
Browser → Next.js (apps/web)
             ├─ RSC pages fetch via lib/api.ts (DEV_API_TOKEN)
             ├─ /api/copilot BFF → FastAPI /copilot/chat
             └─ /api/auth/* → FastAPI /auth/*

FastAPI (apps/api)
  routes → services (opportunity_engine, risk_scoring, experiment_engine,
           evaluation, anomaly, segmentation, copilot_tools)
         → SQLAlchemy models → PostgreSQL
```
Alembic migrations run on FastAPI startup. Database seeding runs via a separate script `seed_data.py`.

---

## 2. Current Working Functionality
- **Risk scoring**: Transparant heuristic score calculation based on payment methods, age decay, and retry count.
- **Revenue summary & at-risk**: Backend calculates total revenue, recovered revenue, and at-risk segmentation.
- **Ground-truth scenarios**: Train/heldout dataset splits for model calibration.
- **Recovery queue actions**: Approve, reject, and simulate recovery actions on pending opportunities.
- **Experiments**: Split traffic between control (natural recovery) and treatment (intervention).

---

## 3. Broken Functionality
1. **Critical Import Crash**: `simulation.py` imports `evaluate_policy_custom` from `app.services.policy_engine`, but `policy_engine.py` does not exist in the repository. The simulation API crashes immediately when hit.
2. **Static Settings Page**: The workspace settings, email, and recovery policies are purely static frontend forms. Changing values and clicking save does nothing; the values are not persisted.
3. **⌘K Non-Interactive Search**: The command palette only allows hardcoded menu navigation and does not perform active search on customers, payments, or opportunities.
4. **Seed Database Wipe Failure**: Running `seed_data.py --wipe` fails with a `DependentObjectsStillExist` SQL error because `experiment_assignments` and `audit_decisions` tables have foreign keys to `recovery_opportunities` but are not included in the drop list.

---

## 4. Mock Functionality
- **Payment provider integration**: `execute_opportunity` runs entirely against mock synthetic ground truth scenarios, without any payment provider abstraction interface.
- **Outcome tracking**: Action status transitions are generated deterministically/randomly on the spot.

---

## 5. Performance Bottlenecks
1. **Unnecessary Forced Refreshes**: `list_opportunities`, `risk_distribution`, and `evaluation_summary` call `refresh_opportunities` on *every single request*. This performs full-table scans, loops, and SQL updates/commits on every page load.
2. **N+1 Queries**:
   - `segment_for_customer` runs multiple queries per customer in list views.
   - `arm_stats` in `experiment_engine.py` queries opportunities and attempts individually in a loop.
3. **Sequential Metric Queries**: `evaluation_summary` fetches `evaluation_points` 5+ times sequentially, forcing 5 sequential database rebuilds/scans.
4. **Missing Indexes**: Missing indexes on `payments.status`, `payments.customer_id`, `payments.created_at`, `subscriptions.status`, and checkout statuses.

---

## 6. UX Problems
- **Navigation for details**: Checking a customer or payment forces the merchant to navigate to another page, instead of opening a detail drawer.
- **Static alerts/leaks**: No active alerts dashboard showing system anomalies or rising revenue leaks.
- **Generic Dashboard Layout**: The homepage feels like a generic template instead of a high-density, mission-critical command center.

---

## 7. Data Problems
- **Delinquent subscriptions in the future**: Seed subscriptions with `status = past_due` sometimes have `current_period_end` set in the future.
- **Discrete amounts**: Synthetic payments have discrete, repeating amounts that look artificial.

---

## 8. Major Opportunities
- **Configurable Policies**: Load rules from a database settings table rather than hardcoded service constants.
- **Debounced Entity Search**: Connect ⌘K command palette to `/api/search` with dynamic results list.
- **What-If Simulation Engine**: Make the what-if simulator run dynamically against actual backend data using configurable policies.
- **Visual Playbook Builder**: Create an interactive canvas or layout explaining recovery strategies.

---

## 9. New Architecture Design
We will introduce:
1. **`policy_engine.py` Service**: Handles both active evaluation (`evaluate_policy`) and custom simulations (`evaluate_policy_custom`) using database settings.
2. **Payment Provider Abstraction Layer**: An interface `PaymentProvider` allowing both `DemoPaymentProvider` and future real providers (Stripe/Razorpay).
3. **BFF Search Autocomplete**: Connect Next.js ⌘K to FastAPI global search.
4. **Evaluation Cache & DB Indexes**: Drastically reduce page load times from several seconds to <100ms.

---

## 10. Upgrade Roadmap
- **Phase 1**: Fix backend bugs (missing `policy_engine.py` module, seed wipe error).
- **Phase 2**: Implement configurable settings and database-backed `MerchantPolicy`.
- **Phase 3**: Optimize database performance (caching in evaluation, query joins, indexing).
- **Phase 4**: Upgrade UI design system (dark theme, high-density layouts, detail drawers).
- **Phase 5**: Build interactive features (⌘K live search, what-if simulator, leaks detector).
- **Phase 6**: Integrate visual playbooks, learning loop updates, and audit trails.
- **Phase 7**: End-to-end verification and testing.
