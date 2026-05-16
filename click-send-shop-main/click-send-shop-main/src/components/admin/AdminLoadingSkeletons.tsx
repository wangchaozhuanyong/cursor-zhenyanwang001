import { cn } from "@/lib/utils";

function FieldSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <div className="skeleton-base skeleton-shimmer h-4 w-28 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
      ))}
    </>
  );
}

export function AdminFormSectionsSkeleton({
  sections = 2,
  className,
}: {
  sections?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <FieldSkeleton rows={i === 0 ? 4 : 3} />
        </div>
      ))}
    </div>
  );
}

export function AdminDetailGridSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded" />
          <div className="flex items-center gap-4">
            <div className="skeleton-base skeleton-shimmer h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
              <div className="skeleton-base skeleton-shimmer h-3 w-48 rounded" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((__, j) => (
            <div key={j} className="skeleton-base skeleton-shimmer h-8 w-full rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminOrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-base skeleton-shimmer h-24 w-full rounded-xl" />
      <AdminDetailGridSkeleton />
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="skeleton-base skeleton-shimmer h-4 w-20 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-base skeleton-shimmer h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function AdminTabsPanelSkeleton() {
  return (
    <div className="max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4">
      <FieldSkeleton rows={4} />
    </div>
  );
}

export function AdminContentPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="skeleton-base skeleton-shimmer h-5 w-32 rounded" />
        <div className="skeleton-base skeleton-shimmer h-24 w-full rounded-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
            <div className="skeleton-base skeleton-shimmer h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSiteSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full space-y-2 rounded-xl border border-border bg-card p-2 lg:w-48">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-base skeleton-shimmer h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex-1 space-y-4">
        <AdminFormSectionsSkeleton sections={2} className="max-w-none" />
      </div>
    </div>
  );
}

export function AdminThemeStudioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton-base skeleton-shimmer h-8 w-48 rounded" />
        <div className="flex gap-2">
          <div className="skeleton-base skeleton-shimmer h-9 w-20 rounded-lg" />
          <div className="skeleton-base skeleton-shimmer h-9 w-20 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2 rounded-xl border border-border p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="skeleton-base skeleton-shimmer min-h-[480px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export function AdminRolesPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-base skeleton-shimmer h-10 w-28 rounded-lg" />
        ))}
      </div>
      <AdminTabsPanelSkeleton />
    </div>
  );
}
