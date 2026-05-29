import { Phone } from "lucide-react";
import type { KeyboardEventHandler } from "react";
import { cn } from "@/lib/utils";
import {
  COUNTRY_CODE_OPTIONS,
  type SupportedCountryCode,
} from "@/utils/authValidation";

const PHONE_INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
const PHONE_INPUT_ERROR_CLASS =
  "border-destructive focus:border-destructive focus:ring-destructive/20";

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
  hasError?: boolean;
  showErrorText?: boolean;
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
  hasError,
  showErrorText = true,
}: CountryPhoneInputProps) {
  const resolvedPhonePlaceholder =
    phonePlaceholder ?? (countryCode === "+60" ? "手机号，例如 0123456789" : "手机号，例如 13800138000");
  const phoneMaxLength = 11;
  const invalid = hasError ?? Boolean(errorText);

  return (
    <div className={cn(showErrorText && "space-y-2", className)}>
      <div className="grid grid-cols-[minmax(6.5rem,7rem)_1fr] gap-2 sm:grid-cols-[112px_1fr]">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value as SupportedCountryCode)}
          aria-label={selectAriaLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled || readOnly}
          className={cn(
            "min-w-0 rounded-2xl border border-border bg-card px-2.5 py-3.5 text-base text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-70 sm:px-3",
            invalid && PHONE_INPUT_ERROR_CLASS,
          )}
        >
          {COUNTRY_CODE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
            value={phone}
            maxLength={phoneMaxLength}
            readOnly={readOnly}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onKeyDown={onPhoneKeyDown}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
            className={cn(
              PHONE_INPUT_CLASS,
              "pl-12 pr-4",
              invalid && PHONE_INPUT_ERROR_CLASS,
              (disabled || readOnly) && "cursor-default opacity-80",
              phoneClassName,
            )}
          />
        </div>
      </div>
      {showErrorText ? (
        <p className={cn("min-h-[1.125rem] text-xs leading-snug", errorText ? "text-destructive" : "invisible")}>
          {errorText || "\u00a0"}
        </p>
      ) : null}
    </div>
  );
}
