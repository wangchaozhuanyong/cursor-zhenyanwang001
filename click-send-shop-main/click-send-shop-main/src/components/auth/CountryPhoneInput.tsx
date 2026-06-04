import { Check, ChevronDown, Phone, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState, type KeyboardEventHandler } from "react";
import { cn } from "@/lib/utils";
import { retainBottomSheetVisualState } from "@/modules/micro-interactions/modal/bottomSheetVisualState";
import type { SupportedCountryCode } from "@/utils/authValidation";

const PHONE_INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
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

  const chooseCountryCode = (value: SupportedCountryCode) => {
    onCountryCodeChange(value);
    setCountryPickerOpen(false);
  };

  useEffect(() => {
    if (!countryPickerOpen) return;
    return retainBottomSheetVisualState();
  }, [countryPickerOpen]);

  return (
    <div className={cn(showErrorText && "space-y-2", className)}>
      <div className="grid grid-cols-[minmax(6.5rem,7rem)_1fr] gap-2 sm:grid-cols-[112px_1fr]">
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
            "flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3.5 text-base font-semibold text-foreground transition-[border-color,box-shadow,background-color] focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-70",
            invalid && PHONE_INPUT_ERROR_CLASS,
          )}
        >
          <span>{countryCode}</span>
          <ChevronDown size={17} aria-hidden="true" className="text-muted-foreground" />
        </button>
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
        <p id={errorId} className={cn("min-h-[1.125rem] text-xs leading-snug", errorText ? "text-destructive" : "invisible")}>
          {errorText || "\u00a0"}
        </p>
      ) : errorText ? (
        <p id={errorId} className="sr-only">
          {errorText}
        </p>
      ) : null}
      <AnimatePresence>
        {countryPickerOpen ? (
          <motion.div
            className="app-bottom-sheet-layer app-country-picker-backdrop fixed inset-0 z-[80] flex items-end justify-center p-0 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={pickerTitleId}
            onClick={() => setCountryPickerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="app-bottom-sheet app-country-picker-sheet w-full overflow-hidden rounded-t-[30px] border-x-0 border-b-0 border-t sm:max-w-md sm:rounded-[30px] sm:border"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
            >
              <div className="flex justify-center pt-3">
                <span className="app-bottom-sheet-handle" />
              </div>
              <div className="app-bottom-sheet-header flex items-center justify-between px-5 pb-3 pt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">地区代码</p>
                  <h2 id={pickerTitleId} className="mt-1 text-lg font-bold text-foreground">
                    选择地区
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="关闭选择地区"
                  onClick={() => setCountryPickerOpen(false)}
                  className="app-bottom-sheet-close flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-gold/25"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="app-bottom-sheet-content space-y-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                          ? "border-gold bg-gold/10 shadow-[0_10px_24px_rgba(177,127,38,0.14)]"
                          : "border-border bg-background hover:border-gold/45",
                      )}
                    >
                      <span className="text-base font-semibold text-foreground">{item.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-base font-semibold text-foreground">{item.value}</span>
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border",
                            selected ? "border-gold bg-gold text-white" : "border-border bg-card",
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
