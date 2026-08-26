import { cookies } from "next/headers";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const DEV_TOKEN = process.env.DEV_API_TOKEN;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("paypilot_token")?.value ?? DEV_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${path} → ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface RevenueSummary {
  revenue_period: number;
  revenue_health_score: number;
  revenue_at_risk: number;
  high_confidence_recoverable: number;
  recovered_period: number;
  period_days: number;
}

export interface RevenueAtRiskSource {
  source: string;
  amount: number;
}

export interface RevenueAtRisk {
  total_at_risk: number;
  by_source: RevenueAtRiskSource[];
}

export function getRevenueSummary(days = 1) {
  return apiFetch<RevenueSummary>(`/revenue/summary?days=${days}`);
}

export function getRevenueAtRisk() {
  return apiFetch<RevenueAtRisk>(`/revenue/at-risk`);
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  country: string | null;
  plan: string | null;
  lifetime_value: number;
  churn_risk_score: number;
  created_at: string;
  segment?: string | null;
}

export interface Payment {
  id: string;
  customer_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  payment_method: string | null;
  retry_count: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  mrr: number;
  status: string;
  current_period_end: string;
  created_at: string;
  canceled_at: string | null;
}

interface Paginated<T> {
  total: number;
  skip: number;
  limit: number;
  items: T[];
}

export function getCustomers(limit = 50, skip = 0) {
  return apiFetch<Paginated<Customer>>(`/customers?limit=${limit}&skip=${skip}`);
}

export function getPayments(limit = 50, skip = 0) {
  return apiFetch<Paginated<Payment>>(`/payments?limit=${limit}&skip=${skip}`);
}

export function getSubscriptions(limit = 50, skip = 0) {
  return apiFetch<Paginated<Subscription>>(`/subscriptions?limit=${limit}&skip=${skip}`);
}

export interface RiskItem {
  id: string;
  type: "payment" | "checkout";
  amount: number;
  recoverability_score: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface RiskDistribution {
  high_confidence_amount: number;
  medium_confidence_amount: number;
  low_confidence_amount: number;
  items: RiskItem[];
}

export function getRiskDistribution(limit = 200) {
  return apiFetch<RiskDistribution>(`/risk/distribution?limit=${limit}`);
}

export interface FailureAnomaly {
  active: boolean;
  reason: string;
  today_failure_rate: number | null;
  baseline_mean: number | null;
  baseline_std: number | null;
  z_score: number | null;
  threshold: number;
  today_failed: number;
  today_total: number;
  lookback_days: number;
  message?: string;
}

export function getFailureAnomaly() {
  return apiFetch<FailureAnomaly>("/risk/anomaly");
}

export interface CopilotResponse {
  reply: string;
  tools_used: string[];
}

export async function sendCopilotMessage(message: string): Promise<CopilotResponse> {
  return apiFetch<CopilotResponse>(`/copilot/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
    headers: { "Content-Type": "application/json" },
  });
}

export interface PolicyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RecoveryOpportunity {
  id: string;
  source: "payment" | "checkout" | "subscription";
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  payment_id: string | null;
  checkout_session_id: string | null;
  subscription_id: string | null;
  amount_at_risk: number;
  recovery_probability: number;
  intervention_success_probability: number;
  expected_recovery_value: number;
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  recommended_intervention: string;
  reason_codes: string[];
  supporting_evidence: Record<string, unknown>;
  policy_status: "auto" | "approval_required" | "escalated" | "blocked";
  policy_version: string;
  policy_checks: PolicyCheck[];
  action_status: "open" | "approved" | "rejected" | "executing" | "completed" | "failed";
  outcome: "pending" | "recovered" | "not_recovered" | "no_action";
  created_at: string;
  updated_at: string;
  executed_at: string | null;
}

export function getOpportunities(params: {
  limit?: number;
  source?: string;
  confidence?: string;
  status?: string;
  sort?: "expected_recovery" | "probability" | "amount" | "created_at";
} = {}) {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 50));
  if (params.source) query.set("source", params.source);
  if (params.confidence) query.set("confidence", params.confidence);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  return apiFetch<Paginated<RecoveryOpportunity>>(`/opportunities?${query.toString()}`);
}

export function approveOpportunity(id: string) {
  return apiFetch<RecoveryOpportunity>(`/opportunities/${id}/approve`, {
    method: "POST",
  });
}

export function rejectOpportunity(id: string) {
  return apiFetch<RecoveryOpportunity>(`/opportunities/${id}/reject`, {
    method: "POST",
  });
}

export function simulateOpportunity(id: string, outcome: "success" | "failure") {
  return apiFetch<RecoveryOpportunity>(`/opportunities/${id}/simulate`, {
    method: "POST",
    body: JSON.stringify({ outcome }),
    headers: { "Content-Type": "application/json" },
  });
}

export interface EvaluationSummary {
  model: {
    insufficient_data: boolean;
    sample_size: number;
    precision?: number;
    recall?: number;
    f1?: number;
    roc_auc?: number;
    brier_score?: number;
    confusion_matrix?: Record<string, number>;
  };
  calibration: {
    sample_size: number;
    buckets: Array<{
      bucket: string;
      predicted_probability: number | null;
      actual_recovery_rate: number | null;
      sample_size: number;
    }>;
  };
  recovery: {
    insufficient_data: boolean;
    sample_size: number;
    total_revenue_at_risk?: number;
    predicted_recoverable_revenue?: number;
    expected_recovery?: number;
    actual_recovered_revenue?: number;
    recovery_rate?: number;
  };
  interventions: {
    insufficient_data: boolean;
    sample_size: number;
    correct_intervention?: number;
    unnecessary_intervention?: number;
    missed_opportunity?: number;
    false_positive_cost?: number;
    intervention_accuracy?: number;
  };
  ground_truth_distribution: Record<string, Record<string, number>>;
}

export function getEvaluationSummary() {
  return apiFetch<EvaluationSummary>("/evaluation/summary");
}

export interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  correlation_id: string;
  created_at: string;
}

export function getAuditEvents(limit = 50) {
  return apiFetch<Paginated<AuditEvent>>(`/audit/events?limit=${limit}`);
}

export interface AuditDecision {
  id: string;
  merchant_email: string;
  opportunity_id: string;
  decision: string;
  outcome: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export function getAuditDecisions(limit = 50) {
  return apiFetch<Paginated<AuditDecision>>(`/audit/decisions?limit=${limit}`);
}

export interface ExperimentArmStats {
  n: number;
  recovered: number;
  recovery_rate: number;
  recovered_amount: number;
  amount_at_risk: number;
}

export interface Experiment {
  id: string;
  name: string;
  population_filter: string;
  split_ratio: number;
  status: "draft" | "running" | "completed";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface ExperimentResults {
  experiment_id: string;
  name: string;
  status: string;
  population_filter: string;
  split_ratio: number;
  started_at: string | null;
  ended_at: string | null;
  control: ExperimentArmStats;
  treatment: ExperimentArmStats;
  lift_pp: number;
  incremental_recovered: number;
}

export function getExperiments() {
  return apiFetch<{ total: number; items: Experiment[] }>("/experiments");
}

export function getExperimentResults(id: string) {
  return apiFetch<ExperimentResults>(`/experiments/${id}/results`);
}

export function createExperiment(payload: {
  name: string;
  population_filter: string;
  split_ratio: number;
}) {
  return apiFetch<Experiment>("/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function startExperiment(id: string) {
  return apiFetch<Experiment>(`/experiments/${id}/start`, { method: "POST" });
}
