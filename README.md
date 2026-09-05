# PayPilot — AI-Powered Autonomous Revenue Recovery

PayPilot is a full-stack revenue intelligence platform that detects payment failures, scores recovery probability, evaluates recovery policy, and executes interventions — automatically or with human approval.

---

## Problem Statement

SaaS and fintech businesses lose 5–15% of potential revenue to preventable failures: declined payments, abandoned checkouts, and lapsed subscriptions. Most of this leakage goes undetected until it shows up as MRR churn. PayPilot closes this gap by treating every payment event as a signal and every failure as a recoverable opportunity.

---

## Product Overview

```
PAYMENT / SUBSCRIPTION EVENT
        ↓
EVENT PROCESSING (payment.failed, subscription.renewal_failed, …)
        ↓
REVENUE LEAK DETECTION (anomaly detection, window comparison)
        ↓
RISK SCORING (heuristic multi-factor scoring per opportunity type)
        ↓
RECOVERY PROBABILITY → EXPECTED RECOVERY VALUE
        ↓
DECISION ENGINE (policy evaluation → auto / approval / escalate / block)
        ↓
RECOVERY ACTION (retry, delayed retry, method update, subscription recovery)
        ↓
OUTCOME PERSISTENCE (RecoveryAttempt + RevenueEvent audit trail)
        ↓
BUSINESS IMPACT (incremental lift vs. organic baseline)
        ↓
EXPERIMENTATION + LEARNING (A/B experiments on recovery strategies)
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router, React 18, TypeScript |
| UI | Tailwind CSS 3 (custom dark token system), Framer Motion 11, Recharts |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| Database | PostgreSQL 16, SQLAlchemy 2 (ORM), Alembic (migrations) |
| AI Copilot | Groq API with 12 real tool-call functions |
| Infrastructure | Docker Compose (Postgres + Redis) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Testing | pytest (backend), unittest |

---

## Architecture

```
apps/
├── api/                        ← FastAPI backend
│   ├── app/
│   │   ├── api/routes/         ← 18 router files
│   │   ├── models/             ← SQLAlchemy ORM models
│   │   ├── schemas/            ← Pydantic request/response schemas
│   │   ├── services/           ← Business logic (scoring, policy, AI tools…)
│   │   └── core/               ← Config, database, security, logging
│   ├── alembic/                ← Database migrations
│   └── tests/                  ← pytest test suite
└── web/                        ← Next.js frontend
    ├── app/
    │   ├── (dashboard)/        ← All authenticated pages
    │   └── api/                ← BFF routes (auth, copilot proxy, proxy)
    ├── components/
    │   ├── dashboard/          ← Feature components
    │   ├── layout/             ← Sidebar, shell
    │   └── ui/                 ← Primitives (toast, empty-state, skeleton)
    └── lib/                    ← API client, formatters, motion config
```

---

## Database Design

### Core Tables

| Table | Purpose |
|-------|---------|
| `customers` | Customer profiles with LTV, churn score, plan |
| `subscriptions` | Subscription state with MRR and period tracking |
| `payments` | Full payment ledger with failure reason and retry count |
| `checkout_sessions` | Abandoned checkout tracking |
| `recovery_opportunities` | Central intelligence table — scored, policy-evaluated opportunities |
| `recovery_attempts` | Actual recovery actions taken and their outcomes |
| `revenue_events` | Immutable audit log with idempotency keys |
| `audit_decisions` | Human approve/reject decisions with full snapshot |
| `merchants` + `merchant_policies` | Multi-tenant config |
| `experiments` + `experiment_assignments` | A/B experimentation |
| `ground_truth_scenarios` | Labeled dataset for model evaluation |

### Key Design Decisions

- **`recovery_opportunities`** has unique FKs on `payment_id`, `checkout_session_id`, `subscription_id` — one opportunity per entity, upserted on refresh
- **`revenue_events.idempotency_key`** has a unique constraint — all event recording is idempotent by design
- **`recovery_attempts.opportunity_id`** is `nullable=True, unique=True` — one attempt per opportunity
- All financial calculations happen in the backend; the frontend never invents numbers

---

## Recovery Decision Engine

See [`docs/DECISION_ENGINE.md`](docs/DECISION_ENGINE.md) for full documentation.

**Summary:**

1. **Risk Scoring** (`services/risk_scoring.py`): Heuristic multi-factor formula using payment method recoverability, failure reason weight, retry penalty, age decay, churn risk, and loyalty boost. No black-box ML — every factor is named and interpretable.

2. **Policy Engine** (`services/policy_engine.py`): Reads `MerchantPolicy` from the database, evaluates 4 checks (recoverable action, retry count, cooldown, contact limit), and assigns a tier:
   - `auto` — all checks pass, high confidence, amount ≤ limit
   - `approval_required` — all checks pass but needs human sign-off
   - `escalated` — high-value or high-risk, senior review needed
   - `blocked` — one or more checks failed

3. **Execution** (`services/opportunity_engine.py`): Deterministic outcome simulation using SHA256-seeded draws + ground truth scenarios. Clearly labeled as a simulated payment environment.

---

## AI Copilot

The copilot uses Groq's tool-calling API with 12 tools that query real database data:

| Tool | What it queries |
|------|----------------|
| `get_revenue_summary` | Aggregated payment + checkout totals |
| `get_risk_distribution` | Opportunity confidence breakdown |
| `search_customers` | Customer search by name/email |
| `get_recovery_opportunities` | Top opportunities by expected recovery |
| `validate_recovery_action` | Policy checks for a specific opportunity |
| `get_active_experiments` | All experiments with status |
| `get_experiment_results` | Lift and arm statistics |
| `get_revenue_leaks` | Anomalous failure patterns |
| `get_failed_payments` | Recent failed payments |
| `get_past_due_subscriptions` | Past-due subscription list |
| `approve_recovery_opportunity` | Sets action_status = approved |
| `dismiss_recovery_opportunity` | Sets action_status = rejected |

**The AI never invents numbers.** Every claim it makes comes from a tool call against the database. The system prompt explicitly prohibits fabrication.

---

## Event Model

PayPilot uses a lightweight domain event log (`revenue_events` table):

```
payment.failed
payment.succeeded
recovery.opportunity_created
recovery.action_approved
recovery.action_rejected
recovery.action_completed
recovery.action_failed
experiment_started
experiment_control_resolved
```

Each event has: `event_type`, `entity_type`, `entity_id`, `payload`, `idempotency_key`, `correlation_id`, `created_at`. The idempotency key prevents duplicate events under any retry condition.

---

## Setup

### Prerequisites
- Docker Desktop
- Python 3.12+
- Node.js 20+

### 1. Start infrastructure

```bash
cd infra
docker compose up -d
```

### 2. Backend setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add DATABASE_URL, SECRET_KEY, GROQ_API_KEY
```

### 3. Seed the database

```bash
# Full dataset (~5000 customers)
python app/seed_data.py --wipe

# Quick seed for development
python app/seed_data.py --wipe --small
```

### 4. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

The API runs `alembic upgrade head` on startup — no manual migration step needed.

### 5. Generate a dev token (optional, for SSR without browser cookie)

```bash
python scripts/dev_token.py
# Copy output to apps/web/.env.local as DEV_API_TOKEN=<token>
```

### 6. Frontend setup

```bash
cd apps/web
npm install
cp .env.local.example .env.local  # or create manually
# Set API_BASE_URL=http://localhost:8000 and DEV_API_TOKEN
npm run dev
```

### 7. Log in

Open http://localhost:3000/login. Default demo credentials are auto-filled. The login page auto-registers on first visit.

---

## Running Tests

```bash
cd apps/api
source .venv/bin/activate
pytest tests/ -v
```

13 tests covering:
- End-to-end recovery loop (payment → opportunity → execute → audit)
- Policy engine: auto / approval / escalation / blocked tiers
- Idempotency: duplicate event prevention, idempotent execution
- Edge cases: zero-amount, guest checkout, ground truth scenarios

---

## Demo Instructions

See [`docs/DEMO.md`](docs/DEMO.md) for the complete internship demo walkthrough.

**Quick demo path:**
1. Open **Command Center** — view revenue at risk and top opportunities
2. Navigate to **Demo Mode** → select "High-Value Bank Timeout" → Trigger
3. Watch the live pipeline: event → scored → policy evaluated → opportunity created
4. Click "View in Recovery Queue" → click **Execute Recovery**
5. Observe live pipeline progression → `₹25,000 RECOVERED`
6. Open **Customer 360** for the affected customer
7. Open **Audit Trail** — find the recovery session, expand the timeline
8. Open **AI Copilot** → ask "What just happened?" and "What should I recover next?"

---

## Limitations and Known Tradeoffs

- **Simulated payment environment**: No real payment gateway. Outcomes are deterministic via SHA256 seed + ground truth scenarios. Clearly labeled in UI.
- **Organic baseline is 12%**: The "without PayPilot" baseline in Business Impact is a configurable assumption, not empirically measured.
- **Single-tenant demo**: Multi-tenant isolation exists in the data model but the demo uses a single seeded merchant.
- **No real ML model**: The scoring engine is a transparent heuristic (not trained). The evaluation pipeline measures it against labeled ground truth scenarios.
- **Redis configured but unused**: Caching layer is wired but TTL caching is not yet implemented.

---

## Future Improvements

- Real payment provider integration (Stripe webhooks, Razorpay)
- Trained logistic regression model on historical recovery outcomes
- Redis TTL caching for dashboard aggregates
- Webhook-driven event ingestion (replace polling with real-time events)
- Multi-merchant isolation with proper tenant scoping
- Email/SMS intervention execution (SendGrid, Twilio)
- Mobile-responsive layout improvements
