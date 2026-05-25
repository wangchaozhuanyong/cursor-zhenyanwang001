import type { ReactNode } from "react";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { cn } from "@/lib/utils";
import { Tx } from "@/components/admin/AdminText";

export const adminFormInputCls =
  "min-h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

const labelCls = "shrink-0 text-sm font-medium text-foreground";

/** 标签与控件同一行（下拉/数字） */
export function AdminInlineField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "grid min-w-0 items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(6.5rem,9.5rem)_minmax(0,1fr)]",
        className,
      )}
    >
      <span className={cn(labelCls, "flex items-center gap-1.5")}>
        <Tx>{label}</Tx>
        {hint ? <AdminFieldHint text={hint} /> : null}
      </span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

/** 开关行：复选框紧贴标签，避免宽栅格下勾选框漂到列最右侧 */
export function AdminToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-start gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium leading-snug text-foreground">
        <Tx>{label}</Tx>
        {hint ? <AdminFieldHint text={hint} /> : null}
      </span>
    </label>
  );
}

export function AdminSettingsSection({
  title,
  sectionHint,
  hint,
  children,
}: {
  title: string;
  sectionHint?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <AdminSectionTitle title={<Tx>{title}</Tx>} hint={sectionHint} />
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
