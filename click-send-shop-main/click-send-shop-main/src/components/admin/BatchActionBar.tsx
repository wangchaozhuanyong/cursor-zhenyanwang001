import PermissionGate from "./PermissionGate";

interface BatchAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface BatchActionBarProps {
  count: number;
  actions: BatchAction[];
  permission?: string;
}

export default function BatchActionBar({ count, actions, permission }: BatchActionBarProps) {
  if (count <= 0) return null;

  const content = (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3 sm:px-4">
      <span className="text-sm font-medium text-foreground">已选 {count} 项</span>
      <span className="h-4 w-px bg-border" />
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary ${a.destructive ? "text-destructive" : "text-foreground"}`}
        >
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  );

  if (permission) return <PermissionGate permission={permission}>{content}</PermissionGate>;
  return content;
}
