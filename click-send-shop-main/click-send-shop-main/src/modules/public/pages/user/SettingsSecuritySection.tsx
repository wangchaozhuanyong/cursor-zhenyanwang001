import { useCallback, useId, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Lock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as userService from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const CARD = "rounded-2xl bg-[var(--theme-surface)] px-[var(--store-card-x)] py-[var(--store-card-y)] shadow-[var(--theme-shadow)] sm:p-4";
const INPUT =
  "h-11 w-full rounded-xl bg-[var(--theme-surface)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 disabled:opacity-60";

type SecurityPanel = "password" | "cancel";

type SecurityActionRowProps = {
  rowId: string;
  expanded: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  danger?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

function SecurityActionRow({
  rowId,
  expanded,
  icon,
  title,
  description,
  danger,
  disabled,
  onToggle,
  children,
}: SecurityActionRowProps) {
  const panelId = `${rowId}-panel`;

  return (
    <div className="border-t border-[var(--theme-border)] first:border-t-0">
      <UnifiedButton
        type="button"
        id={`${rowId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={disabled}
        onClick={onToggle}
        className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)_1.25rem] items-start gap-x-3 px-3 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
          danger && expanded
            ? "bg-[color-mix(in_srgb,var(--theme-danger)_8%,transparent)]"
            : danger
              ? "bg-[color-mix(in_srgb,var(--theme-danger)_4%,transparent)]"
              : ""
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
            danger
              ? "bg-[color-mix(in_srgb,var(--theme-danger)_12%,transparent)] text-[var(--theme-danger)]"
              : "bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] text-[var(--theme-primary)]"
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span
            className={`block text-sm font-medium leading-snug ${
              danger ? "text-[var(--theme-danger)]" : "text-[var(--theme-text)]"
            }`}
          >
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--theme-muted)]">{description}</span>
        </span>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-[var(--theme-muted)] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </UnifiedButton>

      {expanded && children ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${rowId}-trigger`}
          className={`border-t px-3 py-3 ${
            danger
              ? "border-[color-mix(in_srgb,var(--theme-danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--theme-danger)_6%,transparent)]"
              : "border-[var(--theme-border)] bg-[var(--theme-bg)]"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsSecuritySection() {
  const sectionId = useId();
  const navigate = useNavigate();

  const [activePanel, setActivePanel] = useState<SecurityPanel | null>(null);
  const [panelBusy, setPanelBusy] = useState(false);

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [cancelConfirmText, setCancelConfirmText] = useState("");

  const resetPasswordFields = useCallback(() => {
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
  }, []);

  const resetCancelFields = useCallback(() => {
    setCancelConfirmText("");
  }, []);

  const togglePanel = useCallback(
    (panel: SecurityPanel) => {
      if (panelBusy) return;
      setActivePanel((current) => {
        if (current === panel) {
          if (panel === "password") resetPasswordFields();
          else resetCancelFields();
          return null;
        }
        if (panel === "password") resetCancelFields();
        else resetPasswordFields();
        return panel;
      });
    },
    [panelBusy, resetCancelFields, resetPasswordFields],
  );

  const handleChangePwd = async (e: FormEvent) => {
    e.preventDefault();
    if (panelBusy) return;
    if (!oldPwd || !newPwd) return toast.error("请输入旧密码和新密码");
    if (newPwd.length < 6) return toast.error("新密码至少 6 位");
    if (newPwd !== confirmPwd) return toast.error("两次输入密码不一致");

    setPanelBusy(true);
    try {
      await userService.changePassword(oldPwd, newPwd);
      toast.success("密码修改成功", toastPresetQuickSuccess);
      resetPasswordFields();
      setActivePanel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "密码修改失败");
    } finally {
      setPanelBusy(false);
    }
  };

  const handleCancelAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (panelBusy) return;
    if (cancelConfirmText.trim() !== "注销账号") return toast.error("请输入“注销账号”确认操作");

    setPanelBusy(true);
    try {
      await userService.cancelAccount(cancelConfirmText.trim());
      toast.success("账号已注销", toastPresetQuickSuccess);
      await useAuthStore.getState().logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注销失败，请重试");
    } finally {
      setPanelBusy(false);
    }
  };

  const passwordExpanded = activePanel === "password";
  const cancelExpanded = activePanel === "cancel";

  return (
    <section className={CARD}>
      <h2 className="mb-2 text-xs font-medium text-[var(--theme-muted)]">账户安全</h2>
      <div className="isolate overflow-hidden rounded-xl ring-1 ring-[var(--theme-border)]">
        <SecurityActionRow
          rowId={`${sectionId}-password`}
          expanded={passwordExpanded}
          icon={<Lock size={18} strokeWidth={2} />}
          title="修改密码"
          description="定期更换密码，保障账号登录安全"
          disabled={panelBusy}
          onToggle={() => togglePanel("password")}
        >
          <form className="space-y-3" onSubmit={handleChangePwd} aria-busy={panelBusy}>
            <input
              type="password"
              autoComplete="current-password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="当前密码"
              disabled={panelBusy}
              className={`${INPUT} focus:ring-[var(--theme-primary)]`}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="新密码（至少 6 位）"
              disabled={panelBusy}
              className={`${INPUT} focus:ring-[var(--theme-primary)]`}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="确认新密码"
              disabled={panelBusy}
              className={`${INPUT} focus:ring-[var(--theme-primary)]`}
            />
            <UnifiedButton
              type="submit"
              disabled={panelBusy}
              className="w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
            >
              {panelBusy ? "修改中..." : "确认修改密码"}
            </UnifiedButton>
          </form>
        </SecurityActionRow>

        <SecurityActionRow
          rowId={`${sectionId}-cancel`}
          expanded={cancelExpanded}
          icon={<Trash2 size={18} strokeWidth={2} />}
          title="注销账号"
          description="注销后无法再次登录"
          danger
          disabled={panelBusy}
          onToggle={() => togglePanel("cancel")}
        >
          <form className="space-y-3" onSubmit={handleCancelAccount} aria-busy={panelBusy}>
            <p className="text-xs leading-5 text-[var(--theme-muted)]">
              按照提示输入“注销账号”，即可注销成功。如再次使用本站需重新注册。
            </p>
            <input
              value={cancelConfirmText}
              onChange={(e) => setCancelConfirmText(e.target.value)}
              placeholder="输入“注销账号”确认"
              disabled={panelBusy}
              className={`${INPUT} focus:ring-[var(--theme-danger)]`}
            />
            <UnifiedButton
              type="submit"
              disabled={panelBusy}
              className="w-full rounded-full bg-[var(--theme-danger)] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {panelBusy ? "注销中..." : "确认注销账号"}
            </UnifiedButton>
          </form>
        </SecurityActionRow>
      </div>
    </section>
  );
}
