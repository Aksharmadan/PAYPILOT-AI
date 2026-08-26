import Link from "next/link";

export function PaginationControls({
  basePath,
  skip,
  limit,
  total,
}: {
  basePath: string;
  skip: number;
  limit: number;
  total: number;
}) {
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + limit, total);
  const prevSkip = Math.max(skip - limit, 0);
  const nextSkip = skip + limit;
  const hasPrev = skip > 0;
  const hasNext = nextSkip < total;

  function href(next: number) {
    const params = new URLSearchParams({ skip: String(next), limit: String(limit) });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between text-sm text-ink-300">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={href(prevSkip)}
            className="rounded-lg border border-base-border bg-base-100 px-3 py-1.5 text-ink-0 hover:bg-base-200"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-base-border px-3 py-1.5 text-ink-500">Previous</span>
        )}
        {hasNext ? (
          <Link
            href={href(nextSkip)}
            className="rounded-lg border border-base-border bg-base-100 px-3 py-1.5 text-ink-0 hover:bg-base-200"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-base-border px-3 py-1.5 text-ink-500">Next</span>
        )}
      </div>
    </div>
  );
}
