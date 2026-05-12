import { useRef, useState } from "react";
import { ArrowLeft, Camera, Lock, Palette, ChevronRight, Trash2 } from "lucide-react";
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

export default function Settings() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const {
    nickname,
    phone,
    avatar,
    wechat,
    whatsapp,
    profileSaving,
    setNickname,
    setPhone,
    setWechat,
    setWhatsapp,
    saveProfile,
  } = useUserStore();
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
      const data = await uploadService.uploadSingle(file);
      useUserStore.setState({ avatar: data.url });
      await useUserStore.getState().saveProfile();
      toast.success("头像已保存", toastPresetQuickSuccess);
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
    if (!oldPwd || !newPwd) { toast.error("请输入旧密码和新密码"); return; }
    if (newPwd.length < 6) { toast.error("新密码至少6位"); return; }
    if (newPwd !== confirmPwd) { toast.error("两次输入的密码不一致"); return; }
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
    if (cancelConfirmText.trim() !== "注销账号") {
      toast.error("请输入“注销账号”确认操作");
      return;
    }
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
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md border-b border-[var(--theme-border)]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">个人资料</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            {avatar ? (
              <div className="h-24 w-24 overflow-hidden rounded-full theme-shadow">
                <img
                  src={avatar}
                  alt="头像"
                  className="block h-full w-full scale-110 object-cover object-center"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white theme-shadow" style={{ background: "var(--theme-gradient)" }}>
                {nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:scale-95"
            >
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <p className="mt-3 max-w-xs px-2 text-center text-[10px] leading-snug text-muted-foreground">
            {IMAGE_UPLOAD_HINT_AVATAR}
          </p>
        </div>

        <div className="space-y-5">
          {[
            { label: "昵称", value: nickname, onChange: setNickname },
            { label: "手机号", value: phone, onChange: setPhone },
            { label: "微信号", value: wechat, onChange: setWechat },
            { label: "WhatsApp", value: whatsapp, onChange: setWhatsapp },
          ].map((field) => (
            <div key={field.label}>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.label}</label>
              <input
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2"
              />
            </div>
          ))}
        </div>

        {/* Skin select */}
        <SkinPickerDialog
          title="选择皮肤"
          trigger={
            <button
              type="button"
              className="mt-6 flex w-full items-center justify-between theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-4 theme-shadow"
            >
              <div className="flex items-center gap-3">
                <Palette size={18} className="text-gold" />
                <span className="text-sm font-medium text-foreground">皮肤</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground truncate max-w-[12rem]">
                {currentSkinName}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          }
        />

        {/* Change password */}
        <div className="mt-6 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <button
            onClick={() => setShowPwdForm(!showPwdForm)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-gold" />
              <span className="text-sm font-medium text-foreground">修改密码</span>
            </div>
            <ArrowLeft size={14} className={`text-muted-foreground transition-transform ${showPwdForm ? "rotate-90" : "-rotate-90"}`} />
          </button>
          {showPwdForm && (
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                placeholder="当前密码"
                className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground"
              />
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="新密码（至少6位）"
                className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground"
              />
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="确认新密码"
                className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground"
              />
              <button
                onClick={handleChangePwd}
                disabled={pwdSaving}
                className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {pwdSaving ? "修改中…" : "确认修改密码"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 theme-rounded border border-destructive/30 bg-[var(--theme-surface)] p-4 theme-shadow">
          <button
            type="button"
            onClick={() => setShowCancelForm(!showCancelForm)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-destructive" />
              <div className="text-left">
                <div className="text-sm font-medium text-destructive">注销账号</div>
                <div className="mt-0.5 text-xs text-muted-foreground">注销后无法再登录，收货信息将被匿名化</div>
              </div>
            </div>
            <ArrowLeft size={14} className={`text-muted-foreground transition-transform ${showCancelForm ? "rotate-90" : "-rotate-90"}`} />
          </button>
          {showCancelForm && (
            <div className="mt-4 space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                此操作会软删账号、清空地址，并脱敏历史订单中的收货姓名、电话、地址和备注。请先导出需要保留的数据。
              </p>
              <input
                value={cancelConfirmText}
                onChange={(e) => setCancelConfirmText(e.target.value)}
                placeholder="输入“注销账号”确认"
                className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground"
              />
              <button
                onClick={handleCancelAccount}
                disabled={cancelSaving}
                className="w-full rounded-full bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {cancelSaving ? "注销中…" : "确认注销账号"}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={profileSaving}
          className="mt-8 w-full rounded-full py-3.5 text-sm font-bold text-white theme-shadow transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "var(--theme-gradient)" }}
        >
          {profileSaving ? "保存中…" : "保存修改"}
        </button>
      </main>
    </div>
  );
}
