import { useCallback, useRef, useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getColumnPreset,
  getReportColumnKind,
  type AdminTableColumnKind,
} from "@/utils/adminTableColumnPolicy";

function useOverflowCheck(ref: React.RefObject<HTMLElement | null>) {
  const [overflowing, setOverflowing] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  }, [ref]);

  return { check, overflowing };
}

export type AdminTableCellProps = {
  value: ReactNode;
  /** 悬停展示的完整文本；默认取 value 的字符串形式 */
  fullText?: string;
  columnKey?: string;
  kind?: AdminTableColumnKind;
  maxWidth?: string;
  mono?: boolean;
  lines?: 1 | 2;
  className?: string;
  muted?: boolean;
};

export function AdminTableCell({
  value,
  fullText,
  columnKey,
  kind,
  maxWidth,
  mono,
  lines = 1,
  className,
  muted,
}: AdminTableCellProps) {
  const resolvedKind = kind ?? (columnKey ? getReportColumnKind(columnKey) : "text");
  const preset = getColumnPreset(resolvedKind);
  const ref = useRef<HTMLDivElement>(null);
  const { check, overflowing } = useOverflowCheck(ref);
  const tooltipText = (fullText ?? (typeof value === "string" || typeof value === "number" ? String(value) : "")).trim();
  const width = maxWidth ?? preset.maxWidth;
  const canShowTooltip = preset.allowTooltip && tooltipText && tooltipText !== "-";

  const inner = (
    <div
      ref={ref}
      className={cn(
        "min-w-0",
        preset.nowrap || lines === 1 ? "truncate" : "line-clamp-2",
        mono && "font-mono text-[11px]",
        muted && "text-muted-foreground",
        className,
      )}
      style={{ maxWidth: width }}
    >
      {value}
    </div>
  );

  if (!canShowTooltip) {
    return inner;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="min-w-0 max-w-full cursor-default" onPointerEnter={check} onFocus={check}>{inner}</div>
      </TooltipTrigger>
      {overflowing ? (
        <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap break-words text-xs">
          {tooltipText}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

export type AdminTableCellLine = {
  text: string;
  muted?: boolean;
  mono?: boolean;
};

export type AdminTableCellGroupProps = {
  lines: AdminTableCellLine[];
  /** 悬停展示的完整说明（多行） */
  tooltipLines?: string[];
  maxWidth?: string;
  className?: string;
};

/** 订单等列表：主行 + 辅行，悬停显示完整信息 */
export function AdminTableCellGroup({
  lines,
  tooltipLines,
  maxWidth = "13rem",
  className,
}: AdminTableCellGroupProps) {
  const visible = lines.filter((l) => l.text?.trim());
  const tooltipText = (tooltipLines ?? visible.map((l) => l.text)).filter(Boolean).join("\n");
  const ref = useRef<HTMLDivElement>(null);
  const { check, overflowing } = useOverflowCheck(ref);
  const canShowTooltip = tooltipText.length > 0;

  const inner = (
    <div ref={ref} className={cn("min-w-0 space-y-0.5", className)} style={{ maxWidth }}>
      {visible.map((line, i) => (
        <div
          key={i}
          className={cn(
            "truncate text-xs",
            i === 0 ? "text-sm font-medium text-foreground" : "text-muted-foreground",
            line.muted && "text-muted-foreground",
            line.mono && "font-mono text-[11px]",
            i === 0 && !line.muted && "font-medium",
          )}
        >
          {line.text}
        </div>
      ))}
    </div>
  );

  if (!canShowTooltip) {
    return inner;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="min-w-0 cursor-default" onPointerEnter={check} onFocus={check}>{inner}</div>
      </TooltipTrigger>
      {overflowing ? (
        <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap break-words text-xs leading-relaxed">
          {tooltipText}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}
