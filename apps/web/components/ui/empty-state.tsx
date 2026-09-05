import { type ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-base-border bg-base-50 text-ink-300">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-ink-0">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-300">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
