import { Loader2, AlertTriangle, Inbox } from "lucide-react";

interface AdminListShellProps {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminListShell({
  loading,
  error,
  empty,
  emptyText = "暂无数据",
  onRetry,
  children,
}: AdminListShellProps) {
  if (loading) {
    return <SkeletonTable />;
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle size={32} />
        <p className="text-sm">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
            重试
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="py-16 text-center">
        <Inbox size={40} className="mx-auto text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export { SkeletonTable };
