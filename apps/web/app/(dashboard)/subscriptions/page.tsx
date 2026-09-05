import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { SubscriptionsTable } from "@/components/dashboard/subscriptions-table";
import { getSubscriptions } from "@/lib/api";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ skip?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
  const skip = Math.max(Number(params.skip) || 0, 0);
  const { items, total } = await getSubscriptions(limit, skip);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink-0">Subscriptions</h1>
        <p className="mt-1 text-sm text-ink-300">{total} total</p>
      </div>
      <SubscriptionsTable subscriptions={items} />
      <PaginationControls basePath="/subscriptions" skip={skip} limit={limit} total={total} />
    </div>
  );
}
