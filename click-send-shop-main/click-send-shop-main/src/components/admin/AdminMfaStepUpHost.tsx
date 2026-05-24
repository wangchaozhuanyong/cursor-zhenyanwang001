import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/types/common";
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
  const [errorText, setErrorText] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);

  const resetRequestState = useCallback(() => {
    attemptRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setErrorText("");
  }, []);

  const show = useCallback(() => {
    resetRequestState();
    setCode("");
    setMfaEnabled(true);
    setOpen(true);
    void fetchAdminProfile()
      .then((profile) => {
        const enabled = Boolean((profile as { mfa?: { enabled?: boolean } }).mfa?.enabled);
        setMfaEnabled(enabled);
      })
      .catch(() => setMfaEnabled(true));
  }, [resetRequestState]);

  useEffect(() => {
    registerAdminMfaStepUpOpener(show);
    return () => {
      resetRequestState();
      registerAdminMfaStepUpOpener(null);
    };
  }, [resetRequestState, show]);

  const handleClose = () => {
    resetRequestState();
    setOpen(false);
    cancelAdminMfaStepUp();
  };

  const handleSubmit = async () => {
    const normalized = code.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) {
      const message = tText("请输入身份验证器中的 6 位验证码");
      setErrorText(message);
      toast.error(message);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    const attemptId = attemptRef.current + 1;
    attemptRef.current = attemptId;
    abortControllerRef.current = controller;
    setErrorText("");
    setLoading(true);

    const timeoutId = window.setTimeout(() => controller.abort(), MFA_REVERIFY_TIMEOUT_MS);
    try {
      await reverifyAdminMfa(normalized, { signal: controller.signal });
      if (attemptRef.current !== attemptId) return;
      setOpen(false);
      completeAdminMfaStepUp();
      toast.success(tText("身份验证已通过"));
    } catch (err) {
      if (attemptRef.current !== attemptId) return;

      const message = controller.signal.aborted
        ? tText("验证请求超时，请重新发起该操作后再验证")
        : toastErrorMessage(err, tText("验证失败"));
      setErrorText(message);
      toast.error(message);

      if (controller.signal.aborted || (err instanceof ApiError && err.code !== 401)) {
        setOpen(false);
        cancelAdminMfaStepUp();
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (attemptRef.current === attemptId) {
        setLoading(false);
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound size={18} />
          需要二次身份验证
        </div>
        {mfaEnabled === false ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前账号尚未绑定身份验证器，无法完成二次验证。请退出后重新登录并完成 MFA 绑定；或由超级管理员在「员工账号」中为您重置 MFA 后重新绑定。
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (errorText) setErrorText("");
              }}
              placeholder="000000"
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-center font-mono text-lg tracking-widest text-foreground outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              onKeyDown={(e) => e.key === "Enter" && !loading && void handleSubmit()}
            />
            {errorText ? (
              <p className="mt-2 text-xs leading-5 text-destructive">{errorText}</p>
            ) : null}
          </>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
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
