import { Check, ChevronDown, Phone } from "lucide-react";
import { useId, useState, type KeyboardEventHandler } from "react";
import { cn } from "@/lib/utils";
import { AppModal } from "@/modules/micro-interactions";
import type { SupportedCountryCode } from "@/utils/authValidation";

const PHONE_INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]";
const PHONE_INPUT_ERROR_CLASS =
  "border-destructive focus:border-destructive focus:ring-destructive/20";

const COUNTRY_PICKER_OPTIONS: Array<{ value: SupportedCountryCode; name: string }> = [
  { value: "+86", name: "中国大陆" },
  { value: "+60", name: "马来西亚" },
];

type CountryPhoneInputProps = {
  countryCode: SupportedCountryCode;
  onCountryCodeChange: (value: SupportedCountryCode) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  errorText?: string;
  phoneInputId?: string;
  phoneInputName?: string;
  phonePlaceholder?: string;
  phoneAutoComplete?: string;
  readOnly?: boolean;
  disabled?: boolean;
  enterKeyHint?: "next" | "done" | "go" | "send" | "search";
  onPhoneKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  phoneClassName?: string;
  selectAriaLabel?: string;
  phoneAriaLabel?: string;
  hasError?: boolean;
  showErrorText?: boolean;
  variant?: "split" | "joined";
};

export default function CountryPhoneInput({
  countryCode,
  onCountryCodeChange,
  phone,
  onPhoneChange,
  errorText,
  phoneInputId,
  phoneInputName,
  phonePlaceholder,
  phoneAutoComplete = "tel",
  readOnly = false,
  disabled = false,
  enterKeyHint,
  onPhoneKeyDown,
  className,
  phoneClassName,
  selectAriaLabel = "国家或地区代码",
  phoneAriaLabel = "手机号",
  hasError,
  showErrorText = true,
  variant = "split",
}: CountryPhoneInputProps) {
  const generatedId = useId();
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const resolvedPhonePlaceholder =
    phonePlaceholder ?? (countryCode === "+60" ? "例如 123456789" : "例如 13800138000");
  const phoneMaxLength = 11;
  const invalid = hasError ?? Boolean(errorText);
  const errorId = phoneInputId ? `${phoneInputId}-error` : `country-phone-error-${generatedId}`;
  const pickerTitleId = `country-picker-title-${generatedId}`;
  const describedBy = errorText ? errorId : undefined;
  const countryPickerDisabled = disabled || readOnly;
  const joined = variant === "joined";

  const chooseCountryCode = (value: SupportedCountryCode) => {
    onCountryCodeChange(value);
    setCountryPickerOpen(false);
  };

  return (
    <div className={cn(showErrorText && "space-y-2", className)}>
      <div
        className={cn(
          joined
            ? "grid grid-cols-[5rem_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] bg-[var(--theme-bg)] transition-[border-color,box-shadow] focus-within:border-[color-mix(in_srgb,var(--theme-primary)_40%,var(--theme-border))] focus-within:shadow-[var(--theme-focus-ring)]"
            : "grid grid-cols-[minmax(6.5rem,7rem)_1fr] gap-2 sm:grid-cols-[112px_1fr]",
          invalid && joined && "border-destructive focus-within:border-destructive focus-within:shadow-none focus-within:ring-2 focus-within:ring-destructive/20",
        )}
      >
        <button
          type="button"
          aria-label={selectAriaLabel}
          aria-haspopup="dialog"
          aria-expanded={countryPickerOpen}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={countryPickerDisabled}
          onClick={() => setCountryPickerOpen(true)}
          className={cn(
            joined
              ? "flex min-w-0 items-center justify-center gap-1.5 border-r border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] bg-transparent px-3 py-3 text-base font-semibold text-foreground transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-80"
              : "flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3.5 text-base font-semibold text-foreground transition-[border-color,box-shadow,background-color] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)] disabled:cursor-not-allowed disabled:opacity-70",
            invalid && !joined && PHONE_INPUT_ERROR_CLASS,
          )}
        >
          <span>{countryCode}</span>
          <ChevronDown size={17} aria-hidden="true" className="text-muted-foreground" />
        </button>
        <div className="relative">
          <Phone
            size={18}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
              joined && "hidden",
            )}
          />
          <input
            id={phoneInputId}
            name={phoneInputName}
            type="tel"
            inputMode="tel"
            pattern="[0-9]*"
            autoComplete={phoneAutoComplete}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint={enterKeyHint}
            placeholder={resolvedPhonePlaceholder}
            aria-label={phoneAriaLabel}
            aria-describedby={describedBy}
            value={phone}
            maxLength={phoneMaxLength}
            readOnly={readOnly}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onKeyDown={onPhoneKeyDown}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
            className={cn(
              joined
                ? "h-12 w-full bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-default disabled:opacity-80"
                : PHONE_INPUT_CLASS,
              !joined && "pl-12 pr-4",
              invalid && PHONE_INPUT_ERROR_CLASS,
              (disabled || readOnly) && "cursor-default opacity-80",
              phoneClassName,
            )}
          />
        </div>
      </div>
      {showErrorText ? (
        <p id={errorId} className={cn("min-h-[1.125rem] text-xs leading-snug", errorText ? "text-destructive" : "invisible")}>
          {errorText || "\u00a0"}
        </p>
      ) : errorText ? (
        <p id={errorId} className="sr-only">
          {errorText}
        </p>
      ) : null}
      <AppModal
        tier="standard"
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title={<span id={pickerTitleId}>选择地区</span>}
        height="auto"
        className="app-country-picker-sheet"
      >
        <div className="space-y-2 pb-2">
          {COUNTRY_PICKER_OPTIONS.map((item) => {
            const selected = item.value === countryCode;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseCountryCode(item.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-[background-color,border-color,box-shadow]",
                  selected
                    ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-primary)_14%,transparent)]"
                    : "border-border bg-background hover:border-[color-mix(in_srgb,var(--theme-primary)_45%,var(--theme-border))]",
                )}
              >
                <span className="text-base font-semibold text-foreground">{item.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground">{item.value}</span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border",
                      selected ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "border-border bg-card",
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <Check size={15} strokeWidth={2.5} /> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </AppModal>
    </div>
  );
}
