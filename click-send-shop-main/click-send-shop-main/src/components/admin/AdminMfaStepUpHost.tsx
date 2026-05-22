import { useCallback, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  cancelAdminMfaStepUp,
  completeAdminMfaStepUp,
  registerAdminMfaStepUpOpener,
} from "@/lib/adminMfaStepUp";
import { reverifyAdminMfa } from "@/services/admin/accountService";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminMfaStepUpHost() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const show = useCallback(() => {
    setCode("");
    setOpen(true);
  }, []);

  useEffect(() => {
    registerAdminMfaStepUpOpener(show);
    return () => registerAdminMfaStepUpOpener(() => {});
  }, [show]);

  const handleClose = () => {
    setOpen(false);
    cancelAdminMfaStepUp();
  };

  const handleSubmit = async () => {
    const normalized = code.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) {
      toast.error("请输入身份验证器中的 6 位验证码");
      return;
    }
    setLoading(true);
    try {
      await reverifyAdminMfa(normalized);
      setOpen(false);
      completeAdminMfaStepUp();
      toast.success("身份验证已通过");
    } catch (err) {
      toast.error(toastErrorMessage(err, "验证失败"));
    } finally {
      setLoading(false);
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
        <p className="mt-2 text-sm text-muted-foreground">
          该操作需要更高安全等级。请打开身份验证器（如 Google Authenticator），输入当前 6 位验证码后继续。
        </p>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">验证码</label>
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
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
            disabled={loading}
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={loading}
            onClick={() => void handleSubmit()}
          >
            {loading ? "验证中..." : "确认验证"}
          </button>
        </div>
      </div>
    </div>
  );
}
