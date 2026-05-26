import { Phone } from "lucide-react";
import type { KeyboardEventHandler } from "react";
import { cn } from "@/lib/utils";
import {
  COUNTRY_CODE_OPTIONS,
  type SupportedCountryCode,
} from "@/utils/authValidation";

const PHONE_INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";

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
};

export default function CountryPhoneInput({
  countryCode,
  onCountryCodeChange,
  phone,
  onPhoneChange,
  errorText,
  phoneInputId,
  phoneInputName,
  phonePlaceholder = "手机号",
  phoneAutoComplete = "tel",
  readOnly = false,
  disabled = false,
  enterKeyHint,
  onPhoneKeyDown,
  className,
  phoneClassName,
  selectAriaLabel = "国家或地区代码",
}: CountryPhoneInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-[minmax(6.5rem,7rem)_1fr] gap-2 sm:grid-cols-[112px_1fr]">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value as SupportedCountryCode)}
          aria-label={selectAriaLabel}
          disabled={disabled || readOnly}
          className="min-w-0 rounded-2xl border border-border bg-card px-2.5 py-3.5 text-base text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-70 sm:px-3"
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={phoneAutoComplete}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint={enterKeyHint}
            placeholder={phonePlaceholder}
            value={phone}
            readOnly={readOnly}
            disabled={disabled}
            onKeyDown={onPhoneKeyDown}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
            className={cn(
              PHONE_INPUT_CLASS,
              "pl-12 pr-4",
              (disabled || readOnly) && "cursor-default opacity-80",
              phoneClassName,
            )}
          />
        </div>
      </div>
      {errorText ? <p className="text-xs text-destructive">{errorText}</p> : null}
    </div>
  );
}
