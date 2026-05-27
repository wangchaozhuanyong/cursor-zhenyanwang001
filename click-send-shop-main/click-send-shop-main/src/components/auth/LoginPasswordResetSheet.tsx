import { AppModal, LoadingButton } from "@/modules/micro-interactions";

const RESET_INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";

type LoginPasswordResetSheetProps = {
  open: boolean;
  onClose: () => void;
  supportContact: string;
  resetToken: string;
  onResetTokenChange: (value: string) => void;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  devResetToken: string;
  resetLoading: boolean;
  onRequestReset: () => void | Promise<void>;
  onConfirmReset: () => void | Promise<void>;
};

export function LoginPasswordResetSheet({
  open,
  onClose,
  supportContact,
  resetToken,
  onResetTokenChange,
  newPassword,
  onNewPasswordChange,
  devResetToken,
  resetLoading,
  onRequestReset,
  onConfirmReset,
}: LoginPasswordResetSheetProps) {
  return (
    <AppModal
      tier="form"
      open={open}
      onClose={onClose}
      title="重置密码"
      description="先用当前手机号申请重置令牌，再输入令牌和新密码完成重置。线上环境请根据客服发送的令牌操作。"
      height="auto"
      stickyFooter
      footer={
        <LoadingButton
          type="button"
          state={resetLoading ? "loading" : "normal"}
          loadingText="处理中..."
          className="min-h-12 w-full rounded-2xl btn-theme-price text-sm font-bold text-primary-foreground"
          onClick={() => void onConfirmReset()}
        >
          确认重置密码
        </LoadingButton>
      }
    >
      <div className="space-y-3 pb-2">
        <button
          type="button"
          onClick={() => void onRequestReset()}
          disabled={resetLoading}
          className="w-full rounded-xl border border-gold/30 bg-gold/10 py-2.5 text-xs font-semibold text-theme-price disabled:opacity-60"
        >
          {resetLoading ? "处理中..." : "发送重置令牌"}
        </button>

        {devResetToken ? (
          <p className="break-all rounded-xl bg-secondary p-2 text-[11px] leading-relaxed text-muted-foreground">
            开发环境令牌：{devResetToken}
          </p>
        ) : null}

        <input
          type="text"
          placeholder="输入重置令牌"
          value={resetToken}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          enterKeyHint="next"
          onChange={(e) => onResetTokenChange(e.target.value)}
          className={RESET_INPUT_CLASS}
        />
        <input
          type="password"
          placeholder="新密码（至少 8 位，含大小写和数字）"
          value={newPassword}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          enterKeyHint="done"
          onChange={(e) => onNewPasswordChange(e.target.value)}
          className={RESET_INPUT_CLASS}
        />

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          没收到令牌？请联系客服：{supportContact}
        </p>
      </div>
    </AppModal>
  );
}

export default LoginPasswordResetSheet;
