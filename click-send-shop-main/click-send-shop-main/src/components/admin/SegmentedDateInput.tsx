import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { useAdminTOptional } from "@/hooks/useAdminT";
import {
  SEGMENT_DAY_LEN,
  SEGMENT_MONTH_LEN,
  SEGMENT_YEAR_INPUT_CLASS,
  SEGMENT_YEAR_LEN,
  applyYearSegmentInput,
  focusNextAfterMonthComplete,
  handleYearSegmentPaste,
  segmentDigits,
} from "./segmentedDateField";

function parseDateValue(v: string): { y: string; m: string; d: string } {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return { y: "", m: "", d: "" };
  }
  const [a, b, c] = v.split("-");
  return { y: a, m: String(parseInt(b, 10)), d: String(parseInt(c, 10)) };
}

function normalizeYmd(y: string, m: string, d: string): string | null {
  if (y.length !== 4 || !m || !d) return null;
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dt = new Date(`${y}-${mm}-${dd}T12:00:00`);
  if (dt.getFullYear() !== +y || dt.getMonth() + 1 !== month || dt.getDate() !== day) {
    return null;
  }
  return `${y}-${mm}-${dd}`;
}

export type SegmentedDateInputProps = {
  value: string;
  onChange: (isoDate: string) => void;
  /** 外层容器，默认 `w-full` */
  className?: string;
  /** 输入框外观类，默认沿用后台表单样式 */
  controlClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
};

/**
 * 替代原生 `type="date"`：年最多 4 位、月/日各 2 位，满位自动跳到下一段；值始终为 `YYYY-MM-DD` 或空字符串。
 * 若需日期+时间，请使用 `SegmentedDateTimeInput`（`YYYY-MM-DDTHH:mm`）。
 */
export default function SegmentedDateInput({
  value,
  onChange,
  className = "w-full",
  controlClassName = "",
  disabled = false,
  readOnly = false,
  id,
}: SegmentedDateInputProps) {
  const { tText } = useAdminTOptional();
  const parsed = parseDateValue(value);
  const [y, setY] = useState(parsed.y);
  const [m, setM] = useState(parsed.m);
  const [d, setD] = useState(parsed.d);

  const yRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const dRef = useRef<HTMLInputElement>(null);
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = parseDateValue(value);
    setY(p.y);
    setM(p.m);
    setD(p.d);
  }, [value]);

  const tryEmit = (ny: string, nm: string, nd: string) => {
    if (readOnly || disabled) return;
    if (!ny && !nm && !nd) {
      onChange("");
      return;
    }
    const norm = normalizeYmd(ny, nm, nd);
    if (norm) onChange(norm);
  };

  const handleBlurContainer = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (e.currentTarget.contains(next)) return;

    if (!y && !m && !d) {
      onChange("");
      return;
    }
    const norm = normalizeYmd(y, m, d);
    if (norm) {
      onChange(norm);
      const p = parseDateValue(norm);
      setY(p.y);
      setM(p.m);
      setD(p.d);
      return;
    }
    const p = parseDateValue(value);
    setY(p.y);
    setM(p.m);
    setD(p.d);
  };

  const setYearFromInput = (raw: string) => {
    if (readOnly || disabled) return;
    const v = applyYearSegmentInput(raw, mRef);
    setY(v);
    tryEmit(v, m, d);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex min-h-[44px] w-full items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground ${controlClassName}`}
        onBlur={handleBlurContainer}
      >
        <input
          ref={yRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={tText("年")}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={SEGMENT_YEAR_LEN}
          size={SEGMENT_YEAR_LEN}
          value={y}
          aria-label={tText("年（4 位）")}
          className={SEGMENT_YEAR_INPUT_CLASS}
          onChange={(e) => setYearFromInput(e.target.value)}
          onInput={(e) => setYearFromInput(e.currentTarget.value)}
          onPaste={(e) => handleYearSegmentPaste(e, mRef, setYearFromInput)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && y.length === SEGMENT_YEAR_LEN) mRef.current?.focus();
          }}
        />
        <span className="text-muted-foreground select-none" aria-hidden>
          /
        </span>
        <input
          ref={mRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={tText("月")}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={SEGMENT_MONTH_LEN}
          value={m}
          aria-label={tText("月（2 位）")}
          className="w-[2.75ch] min-w-0 tabular-nums bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = segmentDigits(e.target.value, SEGMENT_MONTH_LEN);
            setM(v);
            focusNextAfterMonthComplete(v, dRef.current);
            tryEmit(y, v, d);
          }}
          onInput={(e) => {
            const v = segmentDigits(e.currentTarget.value, SEGMENT_MONTH_LEN);
            setM(v);
            focusNextAfterMonthComplete(v, dRef.current);
            tryEmit(y, v, d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && m === "") {
              e.preventDefault();
              yRef.current?.focus();
            }
            if (e.key === "ArrowLeft" && m === "") yRef.current?.focus();
            if (e.key === "ArrowRight" && m.length === 2) dRef.current?.focus();
          }}
        />
        <span className="text-muted-foreground select-none" aria-hidden>
          /
        </span>
        <input
          ref={dRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={tText("日")}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={SEGMENT_DAY_LEN}
          value={d}
          aria-label={tText("日（2 位）")}
          className="w-[2.75ch] min-w-0 tabular-nums bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = segmentDigits(e.target.value, SEGMENT_DAY_LEN);
            setD(v);
            tryEmit(y, m, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && d === "") {
              e.preventDefault();
              mRef.current?.focus();
            }
            if (e.key === "ArrowLeft" && d === "") mRef.current?.focus();
          }}
        />
        <button
          type="button"
          disabled={disabled || readOnly}
          title={tText("打开日历")}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-40"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = hiddenPickerRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.click();
          }}
        >
          <Calendar size={16} />
        </button>
      </div>
      <input
        ref={hiddenPickerRef}
        type="date"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        value={normalizeYmd(y, m, d) || ""}
        disabled={disabled || readOnly}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const p = parseDateValue(v);
          setY(p.y);
          setM(p.m);
          setD(p.d);
          onChange(v);
        }}
      />
    </div>
  );
}
