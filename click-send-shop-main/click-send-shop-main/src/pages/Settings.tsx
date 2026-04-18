import { useRef, useState } from "react";
import { ArrowLeft, Camera, Moon, Sun, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import * as uploadService from "@/services/uploadService";
import * as userService from "@/services/userService";

export default function Settings() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { nickname, phone, avatar, wechat, whatsapp, profileSaving, setNickname, setPhone, setWechat, setWhatsapp, saveProfile } = useUserStore();
  const { theme, toggle } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadService.uploadSingle(file);
      useUserStore.setState({ avatar: data.url });
      toast.success("头像已上传，点击保存生效");
    } catch {
      toast.error("头像上传失败");
    }
  };

  const handleSave = async () => {
    try {
      await saveProfile();
      toast.success("资料已保存");
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
      toast.success("密码修改成功");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
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
              <img src={avatar} alt="头像" className="h-24 w-24 rounded-full object-cover shadow-lg shadow-gold/20" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-3xl font-bold text-primary-foreground shadow-lg shadow-gold/20">
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

        {/* Dark mode toggle */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon size={18} className="text-gold" /> : <Sun size={18} className="text-gold" />}
            <span className="text-sm font-medium text-foreground">深色模式</span>
          </div>
          <button
            onClick={toggle}
            className={`relative h-7 w-12 rounded-full transition-colors ${theme === "dark" ? "bg-gold" : "bg-secondary"}`}
          >
            <div
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Change password */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
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

        <button
          onClick={handleSave}
          disabled={profileSaving}
          className="mt-8 w-full rounded-full bg-gold py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {profileSaving ? "保存中…" : "保存修改"}
        </button>
      </main>
    </div>
  );
}
