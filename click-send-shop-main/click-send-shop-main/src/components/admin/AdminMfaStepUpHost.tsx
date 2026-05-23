import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  cancelAdminMfaStepUp,
  completeAdminMfaStepUp,
  registerAdminMfaStepUpOpener,
} from "@/lib/adminMfaStepUp";
import { fetchAdminProfile, reverifyAdminMfa } from "@/services/admin/accountService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

const MFA_REVERIFY_TIMEOUT_MS = 15_000;

export default function AdminMfaStepUpHost() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const suppressAbortToastRef = useRef(false);

  const show = useCallback(() => {
    setCode("");
    setLoading(false);
    setMfaEnabled(true);
    setOpen(true);
    void fetchAdminProfile()
      .then((profile) => {
        const enabled = Boolean((profile as { mfa?: { enabled?: boolean } }).mfa?.enabled);
        setMfaEnabled(enabled);
      })
      .catch(() => setMfaEnabled(true));
  }, []);

  useEffect(() => {
    registerAdminMfaStepUpOpener(show);
    return () => registerAdminMfaStepUpOpener(null);
  }, [show]);

  const handleClose = () => {
    suppressAbortToastRef.current = true;
    abortController?.abort();
    setAbortController(null);
    setLoading(false);
    setOpen(false);
    cancelAdminMfaStepUp();
  };

  const handleSubmit = async () => {
    const normalized = code.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) {
      toast.error(tText("请输入身份验证器中的 6 位验证码"));
      return;
    }
    abortController?.abort();
    const controller = new AbortController();
    suppressAbortToastRef.current = false;
    setAbortController(controller);
    setLoading(true);
    const timeoutId = window.setTimeout(() => controller.abort(), MFA_REVERIFY_TIMEOUT_MS);
    try {
      await reverifyAdminMfa(normalized, { signal: controller.signal });
      setOpen(false);
      completeAdminMfaStepUp();
      toast.success(tText("身份验证已通过"));
    } catch (err) {
      if (controller.signal.aborted && !suppressAbortToastRef.current) {
        toast.error(tText("验证请求超时或已取消，请重新点击确认验证"));
      } else if (!controller.signal.aborted) {
        toast.error(toastErrorMessage(err, "验证失败"));
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
      setAbortController((current) => (current === controller ? null : current));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound size={18} />
          需要二次身份验证
        </div>
        {mfaEnabled === false ? (
          <p className="mt-2 text-sm text-muted-foreground">
            当前账号尚未绑定身份验证器，无法完成二次验证。请退出后重新登录并完成 MFA 绑定；或由超级管理员在「员工账号」中为您重置 MFA 后重新绑定。
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            该操作需要更高安全等级。请打开身份验证器（如 Google Authenticator），输入当前 6 位验证码后继续。
          </p>
        )}
        {mfaEnabled !== false ? (
          <>
            <label className="mt-4 block text-xs font-medium text-muted-foreground"><Tx>验证码</Tx></label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-center font-mono text-lg tracking-widest text-foreground outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
            />
          </>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
            disabled={loading}
            onClick={handleClose}
          >
            取消
          </button>
          {mfaEnabled === false ? (
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                handleClose();
                navigate("/admin/login");
              }}
            >
              前往登录页
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={loading}
              onClick={() => void handleSubmit()}
            >
              {loading ? "验证中..." : "确认验证"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
