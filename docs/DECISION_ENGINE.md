# PayPilot Decision Engine

The recovery decision engine is the core technical differentiator of PayPilot. This document explains exactly how every recovery decision is made — no black boxes.

---

## Architecture

```
Failed Entity (payment / checkout / subscription)
        ↓
Risk Scorer  (services/risk_scoring.py)
        ↓
Policy Evaluator  (services/policy_engine.py)
        ↓
Decision Tier:  auto | approval_required | escalated | blocked
        ↓
Execution Engine  (services/opportunity_engine.py)
        ↓
Outcome  (recovered | not_recovered)
        ↓
Audit Log  (revenue_events, recovery_attempts)
```

---

## 1. Risk Scoring

### Payment Scoring

```python
score = base × reason_factor × (1 - retry_penalty) × age_decay × churn_penalty × loyalty_boost
```

| Factor | Formula | Rationale |
|--------|---------|-----------|
| `base` | `METHOD_RECOVERABILITY[payment_method]` | card=0.85, upi=0.75, netbanking=0.65, wallet=0.60 |
| `reason_factor` | `FAILURE_REASON_RECOVERABILITY[failure_reason]` | bank_timeout=0.90, insufficient_funds=0.75, card_declined=0.70, processing_error=0.65, expired_card=0.35, fraud_suspected=0.10 |
| `retry_penalty` | `min(retry_count × 0.15, 0.6)` | Each retry degrades recoverability — retried 3+ times unlikely to succeed |
| `age_decay` | `max(1 - days_since × 0.02, 0.3)` | Fresh failures are more recoverable; stale ones less so |
| `churn_penalty` | `1 - (churn_risk_score × 0.4)` | High churn customers are less likely to engage with recovery |
| `loyalty_boost` | `1.05` if prior recovery success else `1.0` | Prior recovery success is a genuine signal |

**Confidence classification:** high ≥ 0.7 · medium ≥ 0.4 · low < 0.4

**Expected recovery:** `amount × recovery_probability × intervention_success_probability`

### Checkout Scoring

Simpler formula (no payment method or failure reason context):

```python
score = 0.6 × max(1 - days_since × 0.03, 0.25)
```

Recency is the dominant signal for checkout abandonment.

### Subscription Scoring

Separate formula with subscription-specific signals:

```python
score = 0.78 × recency × mrr_factor × renewal_history × failure_drag × churn_factor × ltv_factor
```

| Factor | Details |
|--------|---------|
| `recency` | `max(1 - days_past_due × 0.04, 0.25)` — fresh delinquency is more recoverable |
| `mrr_factor` | 1.08 for MRR ≥ ₹5,000; 1.03 for MRR ≥ ₹1,500; 1.0 otherwise |
| `renewal_history` | `min(1 + prior_renewals × 0.04, 1.2)` — long-standing subscribers recover better |
| `failure_drag` | `max(1 - failed_count × 0.09, 0.4)` — multiple failures suggest deeper problem |
| `churn_factor` | `1 - (churn_risk × 0.4)` |
| `ltv_factor` | 1.07 for LTV ≥ ₹25,000 |

---

## 2. Intervention Selection

Rule-based intervention assignment:

| Condition | Intervention |
|-----------|-------------|
| `fraud_suspected` | `escalation` |
| `expired_card` | `payment_method_update` |
| `retry_count ≥ 3` or `score < 0.2` | `no_action` |
| `bank_timeout` or `processing_error`, `retry_count ≤ 1` | `payment_retry` |
| `insufficient_funds` | `delayed_retry` |
| Default | `payment_method_update` |

**Intervention success probability:**

| Intervention | Success Probability |
|-------------|-------------------|
| `payment_retry` | 88% |
| `delayed_retry` | 72% |
| `payment_method_update` | 64% |
| `escalation` | 45% |
| `no_action` | 0% |

---

## 3. Policy Evaluation

Policy reads from the `merchant_policies` table (per-merchant config). Defaults if none exists: max_retry=3, cooldown=12h, auto_limit=₹5,000, approval_limit=₹25,000, contact_limit=3, min_confidence=0.7.

### Checks (in order)

1. **recoverable_action**: Intervention is not `no_action`
2. **retry_count**: `payment.retry_count < max_retry_count`
3. **retry_cooldown**: Time since last attempt ≥ `retry_cooldown_hours`
4. **contact_limit**: `recovery_attempts_for_customer < contact_limit_per_customer`

If any check fails → **`blocked`**

### Tier Assignment (all checks passed)

```python
if confidence == "high" AND amount <= auto_amount_limit AND probability >= min_confidence_for_auto:
    → auto

elif amount > approval_amount_limit OR priority == "critical":
    → escalated

else:
    → approval_required
```

---

## 4. Execution and Outcome

### Simulated Payment Environment

PayPilot does not connect to a real payment gateway. Outcomes are deterministic:

```python
digest = sha256(f"{opp.id}:{truth.scenario_type}:{truth.dataset_split}").hexdigest()
draw = int(digest[:8], 16) / 0xFFFFFFFF
recovered = draw < scenario_probability AND truth.recoverable == 1
```

If no ground truth scenario exists, the fallback draw probability is 35%.

**Ground truth adjustments:**
- Matching intervention: +5% to scenario probability
- Matching policy status: +3% to scenario probability

### Why deterministic?

- Reproducible demo: the same opportunity always produces the same outcome
- Evaluation integrity: calibration metrics are not corrupted by random draws
- Testability: every test can assert exact outcomes

---

## 5. Explainability

Every opportunity exposes:

- `reason_codes`: Machine-readable list of scoring signals (e.g. `failure_reason:bank_timeout`)
- `supporting_evidence`: Full feature snapshot used for scoring
- `policy_checks`: Each check, pass/fail, and detail string
- `policy_status`: The final tier decision
- `recovery_probability`: The raw score (0–1)
- `intervention_success_probability`: The intervention's historical success rate
- `expected_recovery_value`: `amount × probability × intervention_success`

The UI surfaces all of this in the opportunities table and Customer 360 view. The AI Copilot can explain any decision using the `validate_recovery_action` tool.

---

## 6. Evaluation

The system evaluates itself against 100 labeled ground truth scenarios (train/heldout split):

- **Precision**: Of opportunities scored recoverable, how many actually were?
- **Recall**: Of all actually recoverable failures, how many did we catch?
- **F1**: Harmonic mean of precision and recall
- **ROC-AUC**: Discriminative ability across all thresholds
- **Brier Score**: Calibration quality of probability estimates
- **Calibration chart**: Predicted probability bins vs. actual recovery rate
- **Intervention accuracy**: Correct vs. unnecessary vs. missed interventions
