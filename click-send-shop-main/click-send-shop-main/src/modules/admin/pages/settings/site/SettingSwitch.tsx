import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export default function SettingSwitch({ id, checked, onCheckedChange, label, hint, disabled }: Props) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border bg-secondary transition-colors checked:border-[var(--theme-price)] checked:bg-[var(--theme-price)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--theme-price)_30%,transparent)]"
        style={{
          backgroundImage: checked
            ? "radial-gradient(circle at 14px center, var(--background) 6px, transparent 6px)"
            : "radial-gradient(circle at 6px center, var(--muted-foreground) 5px, transparent 5px)",
          backgroundPosition: checked ? "right 4px center" : "left 4px center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </label>
  );
}
