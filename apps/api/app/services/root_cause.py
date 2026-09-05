from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.revenue import Payment, PaymentStatus, CheckoutSession, CheckoutStatus, Customer

def analyze_root_cause(db: Session, days: int = 30) -> dict:
    now = datetime.utcnow()
    pA_start = now - timedelta(days=days)
    pB_start = now - timedelta(days=2 * days)

    # 1. Total Revenue (Successful payments)
    rev_A = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.succeeded, Payment.created_at >= pA_start
    ).scalar()
    
    rev_B = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.succeeded,
        Payment.created_at >= pB_start,
        Payment.created_at < pA_start
    ).scalar()

    rev_change = rev_A - rev_B
    rev_change_pct = (rev_change / rev_B * 100) if rev_B > 0 else 0.0

    # 2. Failed Payments (Overall & Method breakdown)
    failed_A = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.failed, Payment.created_at >= pA_start
    ).scalar()
    
    failed_B = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.failed,
        Payment.created_at >= pB_start,
        Payment.created_at < pA_start
    ).scalar()

    # Breakdown by method
    factors = []
    methods = ["card", "upi", "netbanking", "wallet"]
    for method in methods:
        total_m_A = db.query(func.count(Payment.id)).filter(
            Payment.payment_method == method, Payment.created_at >= pA_start
        ).scalar() or 1
        fail_m_A = db.query(func.count(Payment.id)).filter(
            Payment.payment_method == method, Payment.status == PaymentStatus.failed,
            Payment.created_at >= pA_start
        ).scalar()
        rate_A = fail_m_A / total_m_A

        total_m_B = db.query(func.count(Payment.id)).filter(
            Payment.payment_method == method, Payment.created_at >= pB_start, Payment.created_at < pA_start
        ).scalar() or 1
        fail_m_B = db.query(func.count(Payment.id)).filter(
            Payment.payment_method == method, Payment.status == PaymentStatus.failed,
            Payment.created_at >= pB_start, Payment.created_at < pA_start
        ).scalar()
        rate_B = fail_m_B / total_m_B

        if rate_A > rate_B and rate_B > 0:
            diff_pct = (rate_A - rate_B) / rate_B * 100
            impact = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.payment_method == method, Payment.status == PaymentStatus.failed,
                Payment.created_at >= pA_start
            ).scalar()
            factors.append({
                "factor": f"{method.upper()} payment failure rate",
                "change": f"+{diff_pct:.1f}%",
                "impact_direction": "negative",
                "impact_weight": 0.4 if method == "card" else 0.3,
                "explanation": f"{method.upper()} failure rate rose from {rate_B*100:.1f}% to {rate_A*100:.1f}%, leaking approx ₹{impact:,.0f}.",
                "type": "payment_failure"
            })

    # 3. Checkout Abandonment
    chk_A = db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0)).filter(
        CheckoutSession.status == CheckoutStatus.abandoned, CheckoutSession.started_at >= pA_start
    ).scalar()
    
    chk_B = db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0)).filter(
        CheckoutSession.status == CheckoutStatus.abandoned,
        CheckoutSession.started_at >= pB_start,
        CheckoutSession.started_at < pA_start
    ).scalar()

    if chk_A > chk_B and chk_B > 0:
        chk_diff_pct = (chk_A - chk_B) / chk_B * 100
        factors.append({
            "factor": "Checkout Abandonment",
            "change": f"+{chk_diff_pct:.1f}%",
            "impact_direction": "negative",
            "impact_weight": 0.2,
            "explanation": f"Abandoned checkout volume increased by {chk_diff_pct:.1f}%, resulting in ₹{(chk_A - chk_B):,.0f} more lost checkouts.",
            "type": "abandonment"
        })

    # 4. Regional Drop (Checkouts / Payments in top countries)
    countries = ["India", "USA", "Singapore"]
    for country in countries:
        cnt_A = db.query(func.count(Payment.id)).filter(
            Payment.status == PaymentStatus.succeeded, Payment.created_at >= pA_start
        ).join(Customer, Payment.customer_id == Customer.id).filter(Customer.country == country).scalar() or 0

        cnt_B = db.query(func.count(Payment.id)).filter(
            Payment.status == PaymentStatus.succeeded, Payment.created_at >= pB_start, Payment.created_at < pA_start
        ).join(Customer, Payment.customer_id == Customer.id).filter(Customer.country == country).scalar() or 0

        if cnt_A < cnt_B and cnt_B > 0:
            cnt_diff_pct = (cnt_B - cnt_A) / cnt_B * 100
            factors.append({
                "factor": f"Volume in {country}",
                "change": f"-{cnt_diff_pct:.1f}%",
                "impact_direction": "negative",
                "impact_weight": 0.15,
                "explanation": f"Successful transactions in {country} dropped by {cnt_diff_pct:.1f}% vs baseline period.",
                "type": "volume"
            })

    # Fallback default factor if empty
    if not factors:
        factors.append({
            "factor": "Systemic Conversion Stability",
            "change": "0.0%",
            "impact_direction": "positive",
            "impact_weight": 1.0,
            "explanation": "No significant anomalies or failure spike indicators detected across key dimensions.",
            "type": "other"
        })

    # Sort factors by impact weight desc
    factors.sort(key=lambda x: x["impact_weight"], reverse=True)

    direction = "fell" if rev_change < 0 else "rose"
    primary_factor = factors[0]["factor"].lower() if factors else "overall stability"
    primary_change = factors[0]["change"] if factors else "0%"
    
    summary_sentence = f"Revenue {direction} {abs(rev_change_pct):.1f}% primarily because {primary_factor} shifted {primary_change} compared to the previous period."

    return {
        "days": days,
        "revenue_change_pct": round(rev_change_pct, 2),
        "revenue_delta": round(rev_change, 2),
        "factors": factors,
        "summary_sentence": summary_sentence
    }
