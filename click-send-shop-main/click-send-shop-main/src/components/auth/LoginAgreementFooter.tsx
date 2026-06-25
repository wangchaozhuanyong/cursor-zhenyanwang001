import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";

type LoginAgreementFooterProps = {
  mode: "login" | "register";
  termsPath?: string;
  privacyPath?: string;
  /** 触屏软键盘弹起时隐藏，避免与键盘争抢底部空间导致闪跳 */
  hiddenOnKeyboard?: boolean;
  className?: string;
};

export function LoginAgreementFooter({
  mode,
  termsPath = "/content/terms-of-service",
  privacyPath = "/content/privacy-policy",
  hiddenOnKeyboard = false,
  className,
}: LoginAgreementFooterProps) {
  const navigate = useNavigate();
  const { localizedPath, t } = usePublicLocale();

  return (
    <footer
      className={cn(
        "auth-page-footer auth-login-agreement-footer sf-next-auth-caption shrink-0 border-t border-border/50 bg-background px-[var(--store-page-x)] py-3 text-center leading-relaxed text-muted-foreground",
        hiddenOnKeyboard && "max-md:hidden",
        className,
      )}
    >
      {mode === "login" ? t("auth.loginAgreementAction") : t("auth.registerAgreementAction")}{" "}
      {t("auth.termsPrefix")}{" "}
      <UnifiedButton
        type="button"
        onClick={() => navigate(localizedPath(termsPath))}
        className="mx-0.5 inline-flex min-h-9 items-center rounded-full px-1.5 align-middle text-theme-price hover:underline"
      >
        {t("auth.terms")}
      </UnifiedButton>
      {" "}{t("auth.termsJoiner")}{" "}
      <UnifiedButton
        type="button"
        onClick={() => navigate(localizedPath(privacyPath))}
        className="mx-0.5 inline-flex min-h-9 items-center rounded-full px-1.5 align-middle text-theme-price hover:underline"
      >
        {t("auth.privacyPolicy")}
      </UnifiedButton>
    </footer>
  );
}
