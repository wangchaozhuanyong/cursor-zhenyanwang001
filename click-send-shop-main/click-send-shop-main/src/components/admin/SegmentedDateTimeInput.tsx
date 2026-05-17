import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  SEGMENT_DAY_LEN,
  SEGMENT_HOUR_LEN,
  SEGMENT_MINUTE_LEN,
  SEGMENT_MONTH_LEN,
  SEGMENT_YEAR_INPUT_CLASS,
  SEGMENT_YEAR_LEN,
  applyYearSegmentInput,
  focusNextAfterDayComplete,
  focusNextAfterHourComplete,
  focusNextAfterMonthComplete,
  handleYearSegmentPaste,
  segmentDigits,
} from "./segmentedDateField";

function parseDateTimeLocal(v: string): { y: string; m: string; d: string; h: string; mi: string } {
  if (!v || !v.trim()) return { y: "", m: "", d: "", h: "", mi: "" };
  const s = v.trim();
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m1) {
    return {
      y: m1[1],
      m: String(parseInt(m1[2], 10)),
      d: String(parseInt(m1[3], 10)),
      h: String(parseInt(m1[4], 10)),
      mi: String(parseInt(m1[5], 10)),
    };
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      y: String(d.getFullYear()),
      m: String(d.getMonth() + 1),
      d: String(d.getDate()),
      h: String(d.getHours()),
      mi: String(d.getMinutes()),
    };
  }
  return { y: "", m: "", d: "", h: "", mi: "" };
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

/** 输入过程中：仅当年月日合法且时、分都有有效数字时提交（与 SegmentedDateInput 行为一致）。 */
function normalizeDatetimeLocal(y: string, m: string, d: string, h: string, mi: string): string | null {
  const ymd = normalizeYmd(y, m, d);
  if (!ymd) return null;
  const hs = h.replace(/\D/g, "");
  const ms = mi.replace(/\D/g, "");
  if (hs === "" || ms === "") return null;
  const hhNum = parseInt(hs, 10);
  const mmNum = parseInt(ms, 10);
  if (!Number.isFinite(hhNum) || !Number.isFinite(mmNum) || hhNum < 0 || hhNum > 23 || mmNum < 0 || mmNum > 59) {
    return null;
  }
  return `${ymd}T${String(hhNum).padStart(2, "0")}:${String(mmNum).padStart(2, "0")}`;
}

export type SegmentedDateTimeInputProps = {
  value: string;
  onChange: (isoDatetimeLocal: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * 替代原生 `type="datetime-local"`：年 4 位、月/日各最多 2 位、时/分各最多 2 位，满位自动跳到下一段。
 * 受控值为 `YYYY-MM-DDTHH:mm` 或空字符串（与 `datetime-local` 一致，不含秒）。
 */
export default function SegmentedDateTimeInput({
  value,
  onChange,
  className = "w-full",
  disabled = false,
  id,
}: SegmentedDateTimeInputProps) {
  const parsed = parseDateTimeLocal(value);
  const [y, setY] = useState(parsed.y);
  const [m, setM] = useState(parsed.m);
  const [d, setD] = useState(parsed.d);
  const [h, setH] = useState(parsed.h);
  const [mi, setMi] = useState(parsed.mi);

  const yRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const dRef = useRef<HTMLInputElement>(null);
  const hRef = useRef<HTMLInputElement>(null);
  const miRef = useRef<HTMLInputElement>(null);
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = parseDateTimeLocal(value);
    setY(p.y);
    setM(p.m);
    setD(p.d);
    setH(p.h);
    setMi(p.mi);
  }, [value]);

  const tryEmit = (ny: string, nm: string, nd: string, nh: string, nmi: string) => {
    if (!ny && !nm && !nd && !nh && !nmi) {
      onChange("");
      return;
    }
    const norm = normalizeDatetimeLocal(ny, nm, nd, nh, nmi);
    if (norm) onChange(norm);
  };

  const handleBlurContainer = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (e.currentTarget.contains(next)) return;

    if (!y && !m && !d && !h && !mi) {
      onChange("");
      return;
    }

    const ymd = normalizeYmd(y, m, d);
    if (!ymd) {
      const p = parseDateTimeLocal(value);
      setY(p.y);
      setM(p.m);
      setD(p.d);
      setH(p.h);
      setMi(p.mi);
      return;
    }

    const hs = h.replace(/\D/g, "");
    const ms = mi.replace(/\D/g, "");
    const hhNum = hs === "" ? 0 : Math.min(23, parseInt(hs, 10) || 0);
    const mmNum = ms === "" ? 0 : Math.min(59, parseInt(ms, 10) || 0);
    const norm = `${ymd}T${String(hhNum).padStart(2, "0")}:${String(mmNum).padStart(2, "0")}`;
    onChange(norm);
    const p = parseDateTimeLocal(norm);
    setY(p.y);
    setM(p.m);
    setD(p.d);
    setH(p.h);
    setMi(p.mi);
  };

  /** 供原生选择器使用：日期未齐时为空，避免非法 value。 */
  const hiddenPickerDisplay = (() => {
    const ymd = normalizeYmd(y, m, d);
    if (!ymd) return "";
    const hs = h.replace(/\D/g, "");
    const ms = mi.replace(/\D/g, "");
    const hhNum = hs === "" ? 0 : Math.min(23, parseInt(hs, 10) || 0);
    const mmNum = ms === "" ? 0 : Math.min(59, parseInt(ms, 10) || 0);
    return `${ymd}T${String(hhNum).padStart(2, "0")}:${String(mmNum).padStart(2, "0")}`;
  })();

  const setYearFromInput = (raw: string) => {
    const v = applyYearSegmentInput(raw, mRef);
    setY(v);
    tryEmit(v, m, d, h, mi);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex min-h-[44px] w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        onBlur={handleBlurContainer}
      >
        <input
          ref={yRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="年"
          disabled={disabled}
          maxLength={4}
          value={y}
          aria-label="年（4 位）"
          className="w-[4.25ch] min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = digitOnly(e.target.value, 4);
            setY(v);
            if (v.length === 4) mRef.current?.focus();
            tryEmit(v, m, d, h, mi);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && y.length === 4) mRef.current?.focus();
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
          placeholder="月"
          disabled={disabled}
          maxLength={2}
          value={m}
          aria-label="月（2 位）"
          className="w-[2.75ch] min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = segmentDigits(e.target.value, SEGMENT_MONTH_LEN);
            setM(v);
            focusNextAfterMonthComplete(v, dRef.current);
            tryEmit(y, v, d, h, mi);
          }}
          onInput={(e) => {
            const v = segmentDigits(e.currentTarget.value, SEGMENT_MONTH_LEN);
            setM(v);
            focusNextAfterMonthComplete(v, dRef.current);
            tryEmit(y, v, d, h, mi);
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
          placeholder="日"
          disabled={disabled}
          maxLength={2}
          value={d}
          aria-label="日（2 位）"
          className="w-[2.75ch] min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = segmentDigits(e.target.value, SEGMENT_DAY_LEN);
            setD(v);
            focusNextAfterDayComplete(v, hRef.current);
            tryEmit(y, m, v, h, mi);
          }}
          onInput={(e) => {
            const v = segmentDigits(e.currentTarget.value, SEGMENT_DAY_LEN);
            setD(v);
            focusNextAfterDayComplete(v, hRef.current);
            tryEmit(y, m, v, h, mi);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && d === "") {
              e.preventDefault();
              mRef.current?.focus();
            }
            if (e.key === "ArrowLeft" && d === "") mRef.current?.focus();
            if (e.key === "ArrowRight" && d.length === 2) hRef.current?.focus();
          }}
        />

        <span className="mx-0.5 text-muted-foreground select-none" aria-hidden>
          ·
        </span>

        <input
          ref={hRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="时"
          disabled={disabled}
          maxLength={2}
          value={h}
          aria-label="时（0–23，2 位）"
          className="w-[2.75ch] min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = digitOnly(e.target.value, 2);
            setH(v);
            if (v.length === 2) miRef.current?.focus();
            tryEmit(y, m, d, v, mi);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && h === "") {
              e.preventDefault();
              dRef.current?.focus();
            }
            if (e.key === "ArrowLeft" && h === "") dRef.current?.focus();
            if (e.key === "ArrowRight" && h.length === 2) miRef.current?.focus();
          }}
        />
        <span className="text-muted-foreground select-none" aria-hidden>
          :
        </span>
        <input
          ref={miRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="分"
          disabled={disabled}
          maxLength={2}
          value={mi}
          aria-label="分（0–59，2 位）"
          className="w-[2.75ch] min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(e) => {
            const v = segmentDigits(e.target.value, SEGMENT_MINUTE_LEN);
            setMi(v);
            tryEmit(y, m, d, h, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && mi === "") {
              e.preventDefault();
              hRef.current?.focus();
            }
            if (e.key === "ArrowLeft" && mi === "") hRef.current?.focus();
          }}
        />

        <button
          type="button"
          disabled={disabled}
          title="打开日期与时间"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-40"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = hiddenPickerRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.click();
          }}
        >
          <CalendarClock size={16} />
        </button>
      </div>
      <input
        ref={hiddenPickerRef}
        type="datetime-local"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        value={hiddenPickerDisplay}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const p = parseDateTimeLocal(v);
          setY(p.y);
          setM(p.m);
          setD(p.d);
          setH(p.h);
          setMi(p.mi);
          const local = v.length >= 16 ? v.slice(0, 16) : v;
          onChange(local);
        }}
      />
    </div>
  );
}
