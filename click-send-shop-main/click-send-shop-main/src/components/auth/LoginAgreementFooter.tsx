import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  return (
    <footer
      className={cn(
        "auth-page-footer store-caption shrink-0 border-t border-border/50 bg-background px-[var(--store-page-x)] py-3 text-center leading-relaxed text-muted-foreground",
        hiddenOnKeyboard && "max-md:hidden",
        className,
      )}
    >
      {mode === "login" ? "登录" : "注册"}即代表您同意
      <button
        type="button"
        onClick={() => navigate(termsPath)}
        className="mx-0.5 text-theme-price hover:underline"
      >
        《用户协议》
      </button>
      和
      <button
        type="button"
        onClick={() => navigate(privacyPath)}
        className="mx-0.5 text-theme-price hover:underline"
      >
        《隐私政策》
      </button>
    </footer>
  );
}
