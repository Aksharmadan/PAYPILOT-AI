"""
One-off report: full recovery-opportunity distribution after a reseed.
Bypasses the API/auth layer and reads the DB directly so counts reflect
every failed payment and abandoned checkout, not just a capped API page.
"""
from collections import Counter

from app.core.database import SessionLocal
from app.models.revenue import (
    Payment, PaymentStatus, CheckoutSession, CheckoutStatus, Customer,
    RecoveryAttempt, RecoveryStatus,
)
from app.services.risk_scoring import score_payment, score_checkout, classify


def customer_ids_with_prior_recovery_success(db):
    rows = (
        db.query(Payment.customer_id)
        .join(RecoveryAttempt, RecoveryAttempt.payment_id == Payment.id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .distinct()
        .all()
    )
    return {r[0] for r in rows if r[0] is not None}


def main():
    db = SessionLocal()
    customers_by_id = {c.id: c for c in db.query(Customer).all()}
    prior_success = customer_ids_with_prior_recovery_success(db)

    failed_payments = db.query(Payment).filter(Payment.status == PaymentStatus.failed).all()
    abandoned_checkouts = db.query(CheckoutSession).filter(CheckoutSession.status == CheckoutStatus.abandoned).all()

    scored = []
    for p in failed_payments:
        customer = customers_by_id.get(p.customer_id)
        had_success = p.customer_id in prior_success
        score = score_payment(p, customer, prior_recovery_success=had_success)
        scored.append(("payment", p, score, classify(score), had_success))

    for c in abandoned_checkouts:
        score = score_checkout(c)
        scored.append(("checkout", c, score, classify(score), False))

    counts = Counter(s[3] for s in scored)
    amounts = {
        conf: round(sum(s[1].amount for s in scored if s[3] == conf), 2)
        for conf in ("high", "medium", "low")
    }

    failed_amount = round(sum(p.amount for p in failed_payments), 2)
    abandoned_amount = round(sum(c.amount for c in abandoned_checkouts), 2)
    revenue_at_risk = round(failed_amount + abandoned_amount, 2)

    print("=== Recovery Opportunity Distribution ===")
    print(f"Total opportunities: {len(scored)}  (failed payments: {len(failed_payments)}, abandoned checkouts: {len(abandoned_checkouts)})")
    for conf in ("high", "medium", "low"):
        print(f"  {conf:6}: {counts.get(conf, 0):>5} items   amount: {amounts[conf]:,.2f}")
    print()
    print(f"Revenue at risk (failed + abandoned, gross): {revenue_at_risk:,.2f}")
    print(f"High-confidence recoverable revenue:         {amounts['high']:,.2f}")
    print()

    scores_sorted = sorted(s[2] for s in scored)
    if scores_sorted:
        mid = scores_sorted[len(scores_sorted) // 2]
        print(f"Score distribution — min: {scores_sorted[0]}  median: {mid}  max: {scores_sorted[-1]}")
    print()

    print("Top 8 highest-scoring opportunities:")
    top = sorted(scored, key=lambda s: s[2], reverse=True)[:8]
    for kind, obj, score, conf, had_success in top:
        if kind == "payment":
            customer = customers_by_id.get(obj.customer_id)
            reason_val = getattr(obj.failure_reason, "value", obj.failure_reason)
            print(f"  [{conf}] payment {obj.id}  score={score}  amount={obj.amount:.2f}")
            print(f"      method={obj.payment_method}  reason={reason_val}  retries={obj.retry_count}  "
                  f"churn_risk={(customer.churn_risk_score if customer else 0):.0%}  prior_success={had_success}  "
                  f"failed_at={obj.created_at}")
        else:
            print(f"  [{conf}] checkout {obj.id}  score={score}  amount={obj.amount:.2f}")
            print(f"      abandoned_at={obj.abandoned_at}")

    db.close()


if __name__ == "__main__":
    main()
