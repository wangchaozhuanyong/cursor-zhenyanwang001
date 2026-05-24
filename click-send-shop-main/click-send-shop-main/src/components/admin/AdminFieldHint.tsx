import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type AdminFieldHintProps = {
  text: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  contentClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

const ICON_SIZE = { sm: 13, md: 15 } as const;

/** 管理后台统一说明入口：悬停或聚焦可查看说明（可移入浮层选中复制）；点击 ? 可固定展开/收起。 */
export default function AdminFieldHint({
  text,
  size = "sm",
  className,
  contentClassName,
  side = "top",
  align = "start",
}: AdminFieldHintProps) {
  const { tText } = useAdminT();
  const [open, setOpen] = useState(false);
  const iconSize = ICON_SIZE[size];

  return (
    <Tooltip
      open={open}
      onOpenChange={setOpen}
      delayDuration={200}
      disableHoverableContent={false}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={tText("查看说明")}
          aria-expanded={open}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-[var(--theme-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/40",
            className,
          )}
          onPointerEnter={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <CircleHelp size={iconSize} strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          "pointer-events-auto max-w-sm select-text text-xs leading-relaxed",
          contentClassName,
        )}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

type AdminLabelWithHintProps = {
  htmlFor?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  hintContentClassName?: string;
};

export function AdminLabelWithHint({
  htmlFor,
  label,
  hint,
  className,
  hintContentClassName,
}: AdminLabelWithHintProps) {
  return (
    <div className={cn("mb-1 flex items-center gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {hint ? <AdminFieldHint text={hint} contentClassName={hintContentClassName} /> : null}
    </div>
  );
}

type AdminSectionTitleProps = {
  title: React.ReactNode;
  hint?: React.ReactNode;
  hintContentClassName?: string;
};

export function AdminSectionTitle({ title, hint, hintContentClassName }: AdminSectionTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hint ? (
        <AdminFieldHint text={hint} size="md" contentClassName={hintContentClassName} />
      ) : null}
    </div>
  );
}

type AdminPageTitleProps = {
  title: React.ReactNode;
  hint?: React.ReactNode;
  hintContentClassName?: string;
  className?: string;
};

/** 页面主标题 + 可选说明（点击 ? 展开） */
export function AdminPageTitle({ title, hint, hintContentClassName, className }: AdminPageTitleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {hint ? (
        <AdminFieldHint
          text={hint}
          size="md"
          contentClassName={cn("max-w-md", hintContentClassName)}
        />
      ) : null}
    </div>
  );
}
