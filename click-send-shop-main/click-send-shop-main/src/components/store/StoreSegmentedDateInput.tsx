import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

import { UnifiedButton } from "@/components/ui/UnifiedButton";

type DateParts = {
  year: string;
  month: string;
  day: string;
};

type StoreSegmentedDateInputProps = {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  controlClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
};

function parseDateValue(value: string): DateParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { year: "", month: "", day: "" };
  }
  const [year, month, day] = value.split("-");
  return {
    year,
    month: String(Number(month)),
    day: String(Number(day)),
  };
}

function normalizeDateValue(year: string, month: string, day: string): string | null {
  if (year.length !== 4 || !month || !day) return null;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (
    !Number.isInteger(monthNumber)
    || !Number.isInteger(dayNumber)
    || monthNumber < 1
    || monthNumber > 12
    || dayNumber < 1
    || dayNumber > 31
  ) {
    return null;
  }

  const normalizedMonth = String(monthNumber).padStart(2, "0");
  const normalizedDay = String(dayNumber).padStart(2, "0");
  const date = new Date(`${year}-${normalizedMonth}-${normalizedDay}T12:00:00`);
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() + 1 !== monthNumber
    || date.getDate() !== dayNumber
  ) {
    return null;
  }
  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function focusInput(input: HTMLInputElement | null) {
  queueMicrotask(() => {
    input?.focus();
    input?.select();
  });
}

export default function StoreSegmentedDateInput({
  value,
  onChange,
  className = "w-full",
  controlClassName = "",
  disabled = false,
  readOnly = false,
  id,
}: StoreSegmentedDateInputProps) {
  const parsed = parseDateValue(value);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = parseDateValue(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const emitIfComplete = (nextYear: string, nextMonth: string, nextDay: string) => {
    if (readOnly || disabled) return;
    if (!nextYear && !nextMonth && !nextDay) {
      onChange("");
      return;
    }
    const normalized = normalizeDateValue(nextYear, nextMonth, nextDay);
    if (normalized) onChange(normalized);
  };

  const restoreOrCommit = (relatedTarget: EventTarget | null, container: HTMLDivElement) => {
    if (container.contains(relatedTarget as Node | null)) return;
    if (!year && !month && !day) {
      onChange("");
      return;
    }
    const normalized = normalizeDateValue(year, month, day);
    if (normalized) {
      onChange(normalized);
      const next = parseDateValue(normalized);
      setYear(next.year);
      setMonth(next.month);
      setDay(next.day);
      return;
    }
    const previous = parseDateValue(value);
    setYear(previous.year);
    setMonth(previous.month);
    setDay(previous.day);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex min-h-[44px] w-full items-center gap-1 border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground ${controlClassName}`}
        onBlur={(event) => restoreOrCommit(event.relatedTarget, event.currentTarget)}
      >
        <input
          ref={yearRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="年"
          aria-label="年（4 位）"
          disabled={disabled}
          readOnly={readOnly}
          maxLength={4}
          value={year}
          className="h-11 w-[52px] min-w-[52px] bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(event) => {
            const next = onlyDigits(event.target.value, 4);
            setYear(next);
            if (next.length === 4) focusInput(monthRef.current);
            emitIfComplete(next, month, day);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" && year.length === 4) focusInput(monthRef.current);
          }}
        />
        <span className="select-none text-muted-foreground" aria-hidden>
          /
        </span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="月"
          aria-label="月（2 位）"
          disabled={disabled}
          readOnly={readOnly}
          maxLength={2}
          value={month}
          className="h-11 w-11 min-w-11 bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(event) => {
            const next = onlyDigits(event.target.value, 2);
            setMonth(next);
            if (next.length === 2) focusInput(dayRef.current);
            emitIfComplete(year, next, day);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && month === "") {
              event.preventDefault();
              focusInput(yearRef.current);
            }
            if (event.key === "ArrowLeft" && month === "") focusInput(yearRef.current);
            if (event.key === "ArrowRight" && month.length === 2) focusInput(dayRef.current);
          }}
        />
        <span className="select-none text-muted-foreground" aria-hidden>
          /
        </span>
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="日"
          aria-label="日（2 位）"
          disabled={disabled}
          readOnly={readOnly}
          maxLength={2}
          value={day}
          className="h-11 w-11 min-w-11 bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onChange={(event) => {
            const next = onlyDigits(event.target.value, 2);
            setDay(next);
            emitIfComplete(year, month, next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && day === "") {
              event.preventDefault();
              focusInput(monthRef.current);
            }
            if (event.key === "ArrowLeft" && day === "") focusInput(monthRef.current);
          }}
        />
        <UnifiedButton
          type="button"
          disabled={disabled || readOnly}
          title="打开日历"
          aria-label="打开日历"
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-40"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const picker = pickerRef.current;
            if (!picker) return;
            if (typeof picker.showPicker === "function") picker.showPicker();
            else picker.click();
          }}
        >
          <Calendar size={16} aria-hidden />
        </UnifiedButton>
      </div>
      <input
        ref={pickerRef}
        type="date"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        value={normalizeDateValue(year, month, day) || ""}
        disabled={disabled || readOnly}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (!nextValue) return;
          const next = parseDateValue(nextValue);
          setYear(next.year);
          setMonth(next.month);
          setDay(next.day);
          onChange(nextValue);
        }}
      />
    </div>
  );
}
