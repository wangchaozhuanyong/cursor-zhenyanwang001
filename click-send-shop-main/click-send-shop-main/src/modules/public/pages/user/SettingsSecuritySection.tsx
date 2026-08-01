import { useCallback, useId, useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, Lock, Trash2 } from "lucide-react";

import { showStoreToast } from "@/utils/storeToast";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as userService from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

const CARD = "sf-next-settings-card";
const INPUT = "sf-next-settings-security-input";

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
    <div className={`sf-next-settings-security-row${danger ? " is-danger" : ""}${expanded ? " is-expanded" : ""}`}>
      <UnifiedButton
        type="button"
        id={`${rowId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={disabled}
        onClick={onToggle}
        className="sf-next-settings-security-trigger"
      >
        <span className="sf-next-settings-security-icon">
          {icon}
        </span>
        <span className="sf-next-settings-security-copy">
          <span className="sf-next-settings-security-title">{title}</span>
          <span className="sf-next-settings-security-description">{description}</span>
        </span>
        <ChevronRight
          size={16}
          className="sf-next-settings-security-chevron"
          aria-hidden
        />
      </UnifiedButton>

      {expanded && children ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${rowId}-trigger`}
          className="sf-next-settings-security-panel"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsSecuritySection() {
  const sectionId = useId();
  const navigate = useStorefrontNavigate();

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
    if (!oldPwd || !newPwd) return showStoreToast.error("请输入旧密码和新密码");
    if (newPwd.length < 6) return showStoreToast.error("新密码至少 6 位");
    if (newPwd !== confirmPwd) return showStoreToast.error("两次输入密码不一致");

    setPanelBusy(true);
    try {
      await userService.changePassword(oldPwd, newPwd);
      showStoreToast.success("密码修改成功", toastPresetQuickSuccess);
      resetPasswordFields();
      setActivePanel(null);
    } catch (err) {
      showStoreToast.error(err instanceof Error ? err.message : "密码修改失败");
    } finally {
      setPanelBusy(false);
    }
  };

  const handleCancelAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (panelBusy) return;
    if (cancelConfirmText.trim() !== "注销账号") return showStoreToast.error("请输入“注销账号”确认操作");

    setPanelBusy(true);
    try {
      await userService.cancelAccount(cancelConfirmText.trim());
      showStoreToast.success("账号已注销", toastPresetQuickSuccess);
      await useAuthStore.getState().logout();
      navigate("/", { replace: true });
    } catch (err) {
      showStoreToast.error(err instanceof Error ? err.message : "注销失败，请重试");
    } finally {
      setPanelBusy(false);
    }
  };

  const passwordExpanded = activePanel === "password";
  const cancelExpanded = activePanel === "cancel";
  const cancelConfirmReady = cancelConfirmText.trim() === "注销账号";

  return (
    <section className="sf-next-settings-section" aria-label="账户安全">
      <div className={CARD}>
        <SecurityActionRow
          rowId={`${sectionId}-password`}
          expanded={passwordExpanded}
          icon={<Lock size={18} strokeWidth={2} />}
          title="修改密码"
          description="定期更换密码，保障账号登录安全"
          disabled={panelBusy}
          onToggle={() => togglePanel("password")}
        >
          <form className="sf-next-settings-security-form" onSubmit={handleChangePwd} aria-busy={panelBusy}>
            <input
              type="password"
              autoComplete="current-password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="当前密码"
              disabled={panelBusy}
              className={INPUT}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="新密码（至少 6 位）"
              disabled={panelBusy}
              className={INPUT}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="确认新密码"
              disabled={panelBusy}
              className={INPUT}
            />
            <UnifiedButton
              type="submit"
              disabled={panelBusy}
              className="sf-next-settings-security-submit"
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
          description="注销后无法恢复，请谨慎操作"
          danger
          disabled={panelBusy}
          onToggle={() => togglePanel("cancel")}
        >
          <form className="sf-next-settings-security-form" onSubmit={handleCancelAccount} aria-busy={panelBusy}>
            <p className="sf-next-settings-security-help">
              按照提示输入“注销账号”，即可注销成功。如再次使用本站需重新注册。
            </p>
            <input
              value={cancelConfirmText}
              onChange={(e) => setCancelConfirmText(e.target.value)}
              placeholder="输入“注销账号”确认"
              disabled={panelBusy}
              className={INPUT}
            />
            <UnifiedButton
              type="submit"
              disabled={panelBusy || !cancelConfirmReady}
              className="sf-next-settings-security-submit sf-next-settings-security-submit--danger"
            >
              {panelBusy ? "注销中..." : "确认注销账号"}
            </UnifiedButton>
          </form>
        </SecurityActionRow>
      </div>
    </section>
  );
}
