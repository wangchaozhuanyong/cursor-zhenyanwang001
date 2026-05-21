import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getColumnPreset,
  getReportColumnKind,
  type AdminTableColumnKind,
} from "@/utils/adminTableColumnPolicy";

function useIsOverflowing(ref: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  const [overflowing, setOverflowing] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  }, [ref]);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [check, deps]);

  return overflowing;
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
  const overflowing = useIsOverflowing(ref, [value, fullText, maxWidth, lines]);
  const tooltipText = (fullText ?? (typeof value === "string" || typeof value === "number" ? String(value) : "")).trim();
  const width = maxWidth ?? preset.maxWidth;
  const showTooltip = preset.allowTooltip && overflowing && tooltipText && tooltipText !== "-";

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

  if (!showTooltip) {
    return inner;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="min-w-0 max-w-full cursor-default">{inner}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap break-words text-xs">
        {tooltipText}
      </TooltipContent>
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
  const overflowing = useIsOverflowing(ref, [lines, tooltipLines, maxWidth]);
  const showTooltip = overflowing && tooltipText.length > 0;

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

  if (!showTooltip) {
    return inner;
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="min-w-0 cursor-default">{inner}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap break-words text-xs leading-relaxed">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
