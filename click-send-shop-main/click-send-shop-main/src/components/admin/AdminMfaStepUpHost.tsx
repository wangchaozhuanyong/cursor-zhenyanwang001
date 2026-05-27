import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/types/common";
import {
  cancelAdminMfaStepUp,
  completeAdminMfaStepUpWithResult,
  getPendingAdminMfaActionClass,
  registerAdminMfaStepUpOpener,
  type AdminMfaStepUpResult,
} from "@/lib/adminMfaStepUp";
import { fetchAdminProfile, reverifyAdminMfa, reverifyAdminPasskey } from "@/services/admin/accountService";
import { toastErrorMessage } from "@/utils/errorMessage";

const MFA_REVERIFY_TIMEOUT_MS = 15_000;

export default function AdminMfaStepUpHost() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);
  const openRef = useRef(false);
  const profileRequestedRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const resetRequestState = useCallback(() => {
    attemptRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setPasskeyLoading(false);
    setErrorText("");
  }, []);

  const show = useCallback(() => {
    if (openRef.current) return;
    resetRequestState();
    setCode("");
    setMfaEnabled(true);
    setOpen(true);
    if (profileRequestedRef.current) return;
    profileRequestedRef.current = true;
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
    profileRequestedRef.current = false;
    setOpen(false);
    cancelAdminMfaStepUp();
  };

  const finishSuccess = (message: string, result: AdminMfaStepUpResult) => {
    profileRequestedRef.current = false;
    setOpen(false);
    completeAdminMfaStepUpWithResult(result);
    toast.success(message);
  };

  const failAndCancel = (message: string) => {
    setErrorText(message);
    toast.error(message);
    profileRequestedRef.current = false;
    setOpen(false);
    cancelAdminMfaStepUp();
  };

  const handleSubmit = async () => {
    const normalized = code.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) {
      const message = "请输入身份验证器中的 6 位验证码";
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
      const result = await reverifyAdminMfa(normalized, {
        signal: controller.signal,
        actionClass: getPendingAdminMfaActionClass(),
      });
      if (attemptRef.current !== attemptId) return;
      finishSuccess("身份验证已通过", result);
    } catch (err) {
      if (attemptRef.current !== attemptId) return;

      const message = controller.signal.aborted
        ? "验证请求超时，请重新发起该操作后再验证"
        : toastErrorMessage(err, "验证失败");
      setErrorText(message);
      toast.error(message);

      if (controller.signal.aborted || (err instanceof ApiError && err.code !== 401)) {
        profileRequestedRef.current = false;
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

  const handlePasskey = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    const attemptId = attemptRef.current + 1;
    attemptRef.current = attemptId;
    abortControllerRef.current = controller;
    setErrorText("");
    setPasskeyLoading(true);

    const timeoutId = window.setTimeout(() => controller.abort(), MFA_REVERIFY_TIMEOUT_MS);
    try {
      const result = await reverifyAdminPasskey({
        signal: controller.signal,
        actionClass: getPendingAdminMfaActionClass(),
      });
      if (attemptRef.current !== attemptId) return;
      finishSuccess("Passkey 验证已通过", result);
    } catch (err) {
      if (attemptRef.current !== attemptId) return;
      const message = controller.signal.aborted
        ? "Passkey 验证超时，请重新发起该操作后再验证"
        : toastErrorMessage(err, "Passkey 验证失败");
      failAndCancel(message);
    } finally {
      window.clearTimeout(timeoutId);
      if (attemptRef.current === attemptId) {
        setPasskeyLoading(false);
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-mfa-step-up-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound size={18} />
          <span id="admin-mfa-step-up-title">需要二次身份验证</span>
        </div>
        {mfaEnabled === false ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前账号尚未绑定身份验证器，无法完成二次验证。请退出后重新登录并完成 MFA 绑定；或由超级管理员在「员工账号」中为您重置 MFA 后重新绑定。
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            该操作需要更高安全等级。可使用 Passkey，或输入身份验证器中的 6 位验证码后继续。
          </p>
        )}
        {mfaEnabled !== false ? (
          <>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50"
              disabled={loading || passkeyLoading}
              onClick={() => void handlePasskey()}
            >
              <Fingerprint size={16} />
              {passkeyLoading ? "正在验证 Passkey..." : "使用 Passkey 验证"}
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>或</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <label className="block text-xs font-medium text-muted-foreground">验证码</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus={typeof window !== "undefined" ? !window.matchMedia("(pointer: coarse)").matches : true}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (errorText) setErrorText("");
              }}
              placeholder="000000"
              className="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-center font-mono text-lg tracking-widest text-foreground outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              onKeyDown={(e) => e.key === "Enter" && !loading && !passkeyLoading && void handleSubmit()}
            />
            {errorText ? <p className="mt-2 text-xs leading-5 text-destructive">{errorText}</p> : null}
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
              disabled={loading || passkeyLoading}
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
