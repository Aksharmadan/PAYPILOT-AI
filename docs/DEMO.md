# PayPilot Internship Demo Guide

This is the complete walkthrough for demonstrating PayPilot end-to-end.
The entire flow takes 8–10 minutes. Prepare by seeding the database first.

---

## Pre-Demo Setup

```bash
# Start infrastructure
cd infra && docker compose up -d

# Seed database (do this once before demo)
cd apps/api && python app/seed_data.py --wipe

# Start backend
uvicorn app.main:app --reload --port 8000

# Start frontend (separate terminal)
cd apps/web && npm run dev
```

Open http://localhost:3000 and log in. The login page auto-registers.

---

## Demo Flow

### STEP 1 — Command Center

**What to show:** Revenue at risk, expected recovery, health score, top opportunities

Open `/` (Command Center).

Key talking points:
- "PayPilot analyzed X payment and subscription events"
- Point to Revenue at Risk (coral stat) — "₹X.XL at risk right now"
- Point to High-Confidence Recoverable — "₹X is ready for immediate auto-retry"
- Point to the Revenue Leak Map — "breakdown by payment failures, checkout abandonment, subscriptions"
- Scroll to AI Recommendations — "these come from real database aggregates, not hardcoded"

---

### STEP 2 — Demo Mode (Trigger a Payment Failure)

**What to show:** The full PayPilot pipeline triggered by a single event

Navigate to **Demo Mode** (sidebar, bottom).

1. Select **"High-Value Bank Timeout"** scenario (₹25,000 UPI, auto-retry eligible)
2. Click **"Trigger Payment Failure"**
3. Watch the animated pipeline:
   - Event received
   - Customer identified
   - Recovery opportunity created
   - Risk scored (recovery probability shown)
   - Policy evaluated → decision: **AUTO RETRY**
   - Audit events recorded
   - Ready for action

Key talking points:
- "This just ran the complete PayPilot scoring and policy pipeline in real time"
- Point to recovery probability, expected recovery, policy decision
- "The policy decision came from the merchant's stored policy settings"
- Click **"View in Recovery Queue"**

---

### STEP 3 — Recovery Queue + Execute

**What to show:** The scored opportunity in the queue, execute the recovery

You should see the ₹25,000 opportunity at the top of the queue.

1. Show the row:
   - Amount at risk (₹25,000)
   - Recovery probability (e.g., 91%)
   - Expected recovery (e.g., ₹22,750)
   - Policy: **auto**
   - Why section: `bank_timeout · via upi · 0 prior retries`
   - Policy checks: all green

2. Click **"Execute"** → confirm the dialog

3. Watch the live pipeline progression:
   - Validating policy…
   - Initiating recovery action…
   - Processing with payment provider…
   - Recording outcome…
   - Updating metrics…

4. The result appears: either **"₹25,000 RECOVERED"** or "Not recovered"

Key talking points:
- "This persisted the outcome to the database — it's not a React state trick"
- "A RecoveryAttempt row was created with status = succeeded"
- "The page will auto-refresh with updated data"

---

### STEP 4 — Customer 360

**What to show:** The full customer intelligence profile

Click the customer name in the recovery queue row (links to `/customers/{id}`).

Show:
- Customer health score (0–100)
- LTV, MRR, churn risk
- Payment success rate
- Recovery success rate
- Risk signals panel (right column)
- Open recovery opportunity card (if still pending)
- Activity timeline — scroll through: created → subscribed → payments → failure → recovery
- "Every event on this timeline came from the database"

---

### STEP 5 — Audit Trail

**What to show:** The complete decision timeline for the recovery session

Navigate to **Audit Trail**.

1. The most recent recovery session appears at the top
2. Click to expand — shows the full timeline:
   - `payment.failed` (event received)
   - `recovery.opportunity_created`
   - `recovery.action_completed` (or `recovery.action_failed`)
3. Show the DEMO badge — visually confirms this was a simulation
4. Point to correlation IDs — "all events in a recovery session share a correlation ID"

Key talking points:
- "This is immutable — idempotency keys prevent any event from being recorded twice"
- "Every approve/reject decision is in the right column with full snapshot"

---

### STEP 6 — Business Impact

Navigate to **Business Impact** (`/analytics`).

Show:
- Total Recovered (came from real RecoveryAttempt data)
- Incremental Lift vs. organic baseline
- Automation Rate
- Avg. Time to Recovery
- Recovery vs. Baseline chart

Key talking point:
- "The organic baseline is explicitly labeled as an assumption (12%)"
- "The recovered revenue number reflects actual RecoveryAttempt.succeeded rows"

---

### STEP 7 — AI Copilot

Navigate to **AI Copilot** (`/copilot`).

Ask these questions in sequence:

**"What just happened?"**
> Copilot will call `get_recovery_opportunities` + `validate_recovery_action` and explain the specific event

**"What should I recover next?"**
> Copilot calls `get_recovery_opportunities(confidence=high)` and returns ranked recommendations

**"Why did revenue fall this week?"**
> Copilot calls `get_revenue_leaks` and `get_revenue_summary`

**"Show me high-risk customers"**
> Copilot calls `search_customers` and lists by churn risk

Key talking points:
- "Watch the tool chips — those are real backend calls"
- "Every number the AI says came from a tool result, not from the model's training data"
- "The system prompt explicitly prohibits the model from inventing numbers"

---

### STEP 8 — Experiments

Navigate to **Revenue → Experiments**.

Show an experiment with Delayed Retry vs. Immediate Retry:
- Control arm recovery rate vs. treatment arm
- Lift in percentage points
- Incremental recovered revenue
- PayPilot recommendation

Key talking point:
- "Experiment assignments are deterministic (SHA256) — the same opportunity always goes to the same arm"
- "This is how we'd validate a change to the recovery strategy before rolling it out globally"

---

## Engineering Concepts to Discuss

| Topic | Where to point |
|-------|---------------|
| Heuristic scoring | `services/risk_scoring.py` |
| Policy engine | `services/policy_engine.py` |
| Idempotent event sourcing | `revenue_events.idempotency_key` unique constraint |
| Deterministic outcomes | SHA256 seed in `_seeded_outcome()` |
| AI tool calling | `services/copilot_tools.py` |
| Ground truth evaluation | `ground_truth_scenarios` table + `services/evaluation.py` |
| A/B experimentation | `services/experiment_engine.py` |
| Database indexes | `alembic/versions/202608300001_missing_performance_indexes.py` |
| End-to-end test | `tests/test_end_to_end_recovery.py` |
| Auth middleware | `apps/web/middleware.ts` |
