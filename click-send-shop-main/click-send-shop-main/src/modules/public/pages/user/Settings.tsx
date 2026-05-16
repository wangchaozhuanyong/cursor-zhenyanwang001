import { useRef, useState } from "react";
import { ArrowLeft, Camera, Lock, Palette, ChevronRight, ShieldCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import * as uploadService from "@/services/uploadService";
import * as userService from "@/services/userService";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import { IMAGE_UPLOAD_HINT_AVATAR } from "@/constants/imageUploadHints";

const CARD = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)] p-4";

export default function Settings() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { nickname, phone, avatar, wechat, whatsapp, profileSaving, setNickname, setPhone, setWechat, setWhatsapp, saveProfile } = useUserStore();
  const { skins, skinId } = useThemeRuntime();
  const currentSkinName = skins.find((s) => s.id === skinId)?.name || "默认皮肤";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadService.uploadSingle(file, { mode: "thumb" });
      useUserStore.setState({ avatar: data.url });
      await useUserStore.getState().saveProfile();
      const storage = uploadService.getUploadStorageStatus(data.url);
      toast.success(`头像已保存：${storage.host}${storage.isS3 ? "（S3）" : ""}`, toastPresetQuickSuccess);
    } catch {
      toast.error("头像上传或保存失败，请重试");
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    try {
      await saveProfile();
      toast.success("资料已保存", toastPresetQuickSuccess);
    } catch {
      toast.error("保存失败，请重试");
    }
  };

  const handleChangePwd = async () => {
    if (!oldPwd || !newPwd) return toast.error("请输入旧密码和新密码");
    if (newPwd.length < 6) return toast.error("新密码至少 6 位");
    if (newPwd !== confirmPwd) return toast.error("两次输入的密码不一致");
    setPwdSaving(true);
    try {
      await userService.changePassword(oldPwd, newPwd);
      toast.success("密码修改成功", toastPresetQuickSuccess);
      setShowPwdForm(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "密码修改失败");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleCancelAccount = async () => {
    if (cancelConfirmText.trim() !== "注销账号") return toast.error("请输入“注销账号”确认操作");
    setCancelSaving(true);
    try {
      await userService.cancelAccount(cancelConfirmText.trim());
      toast.success("账号已注销", toastPresetQuickSuccess);
      await useAuthStore.getState().logout();
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "注销失败，请重试");
    } finally {
      setCancelSaving(false);
    }
  };

  return (
    <div className="store-page min-h-screen text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">个人资料</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-3 px-4 py-4 pb-24">
        <section className={CARD}>
          <div className="flex flex-col items-center py-2">
            <div className="relative">
              {avatar ? (
                <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-[var(--theme-border)]">
                  <img src={avatar} alt="头像" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--theme-primary)] text-2xl font-bold text-[var(--theme-primary-foreground)]">
                  {nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
                <Camera size={13} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <p className="mt-3 text-center text-[10px] leading-snug text-[var(--theme-muted)]">{IMAGE_UPLOAD_HINT_AVATAR}</p>
          </div>
        </section>

        <section className={CARD}>
          <div className="space-y-4">
            {[
              { label: "昵称", value: nickname, onChange: setNickname },
              { label: "手机号", value: phone, onChange: setPhone },
              { label: "微信号", value: wechat, onChange: setWechat },
              { label: "WhatsApp", value: whatsapp, onChange: setWhatsapp },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="mb-1.5 block text-xs text-[var(--theme-muted)]">{field.label}</span>
                <input value={field.value} onChange={(e) => field.onChange(e.target.value)} className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-[var(--theme-secondary)]" />
              </label>
            ))}
          </div>
        </section>

        <SkinPickerDialog
          title="选择皮肤"
          trigger={
            <button type="button" className={`${CARD} flex w-full items-center justify-between`}>
              <div className="flex items-center gap-3"><Palette size={18} className="text-[var(--theme-secondary)]" /><span className="text-sm font-medium">皮肤</span></div>
              <span className="max-w-[11rem] truncate text-sm text-[var(--theme-muted)]">{currentSkinName}</span>
              <ChevronRight size={16} className="text-[var(--theme-muted)]" />
            </button>
          }
        />

        <button type="button" onClick={() => navigate("/settings/upload-verify")} className={`${CARD} flex w-full items-center justify-between`}>
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-emerald-600" /><span className="text-sm font-medium">上传验收</span></div>
          <span className="text-xs text-[var(--theme-muted)]">检查是否 S3</span>
          <ChevronRight size={16} className="text-[var(--theme-muted)]" />
        </button>

        <section className={CARD}>
          <button onClick={() => setShowPwdForm(!showPwdForm)} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3"><Lock size={18} className="text-[var(--theme-secondary)]" /><span className="text-sm font-medium">修改密码</span></div>
            <ArrowLeft size={14} className={`text-[var(--theme-muted)] transition-transform ${showPwdForm ? "rotate-90" : "-rotate-90"}`} />
          </button>
          {showPwdForm && (
            <div className="mt-4 space-y-3">
              <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="当前密码" className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-secondary)]" />
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="新密码（至少6位）" className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-secondary)]" />
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="确认新密码" className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-secondary)]" />
              <button onClick={handleChangePwd} disabled={pwdSaving} className="w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">{pwdSaving ? "修改中…" : "确认修改密码"}</button>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] ring-1 ring-[color-mix(in_srgb,var(--theme-danger)_35%,transparent)]">
          <button type="button" onClick={() => setShowCancelForm(!showCancelForm)} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-[var(--theme-danger)]" />
              <div className="text-left">
                <div className="text-sm font-medium text-[var(--theme-danger)]">注销账号</div>
                <div className="mt-0.5 text-xs text-[var(--theme-muted)]">注销后无法再登录，收货信息将被匿名化</div>
              </div>
            </div>
            <ArrowLeft size={14} className={`text-[var(--theme-muted)] transition-transform ${showCancelForm ? "rotate-90" : "-rotate-90"}`} />
          </button>
          {showCancelForm && (
            <div className="mt-4 space-y-3">
              <p className="text-xs leading-5 text-[var(--theme-muted)]">此操作会软删账号、清空地址，并脱敏历史订单中的收货姓名、电话、地址和备注。</p>
              <input value={cancelConfirmText} onChange={(e) => setCancelConfirmText(e.target.value)} placeholder="输入“注销账号”确认" className="h-11 w-full rounded-xl bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-secondary)]" />
              <button onClick={handleCancelAccount} disabled={cancelSaving} className="w-full rounded-full bg-[var(--theme-danger)] py-3 text-sm font-semibold text-white disabled:opacity-60">{cancelSaving ? "注销中…" : "确认注销账号"}</button>
            </div>
          )}
        </section>

        <button onClick={handleSave} disabled={profileSaving} className="w-full rounded-full bg-[var(--theme-primary)] py-3.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
          {profileSaving ? "保存中…" : "保存修改"}
        </button>
      </main>
    </div>
  );
}
