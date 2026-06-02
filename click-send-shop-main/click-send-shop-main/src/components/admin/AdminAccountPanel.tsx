import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Lock, Mail, Phone, User } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import { AdminTabsPanelSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { toast } from "sonner";
import {
  changeAdminPassword,
  fetchAdminProfile,
  registerAdminPasskey,
  updateAdminProfile,
} from "@/services/admin/accountService";
import { toastErrorMessage } from "@/utils/errorMessage";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminTOptional } from "@/hooks/useAdminT";

export type AdminAccountTab = "profile" | "password" | "security";

interface AdminAccountPanelProps {
  initialTab?: AdminAccountTab;
  embedded?: boolean;
}

export default function AdminAccountPanel({ initialTab = "profile", embedded = false }: AdminAccountPanelProps) {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = useCallback((zh: string, en: string) => (isEn ? en : zh), [isEn]);
  const [activeTab, setActiveTab] = useState<AdminAccountTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pwd, setPwd] = useState({ old: "", new1: "", new2: "" });
  const [passkeyLabel, setPasskeyLabel] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setLoading(true);
    fetchAdminProfile()
      .then((data: { nickname?: string; username?: string; email?: string; phone?: string }) => {
        setProfile({
          name: data?.nickname || data?.username || "Admin",
          email: data?.email ?? "",
          phone: data?.phone ?? "",
        });
      })
      .catch((e) => toast.error(toastErrorMessage(e, L("加载账号信息失败", "Failed to load account information"))))
      .finally(() => setLoading(false));
  }, [L]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateAdminProfile({
        nickname: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
      toast.success(L("个人信息已更新", "Profile updated"));
    } catch (e) {
      toast.error(toastErrorMessage(e, L("保存失败", "Save failed")));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (!pwd.old || !pwd.new1 || !pwd.new2) {
      toast.error(L("请填写完整", "Please complete all fields"));
      return;
    }
    if (pwd.new1 !== pwd.new2) {
      toast.error(L("两次密码不一致", "The two passwords do not match"));
      return;
    }
    if (pwd.new1.length < 6) {
      toast.error(L("密码至少 6 位", "Password must be at least 6 characters"));
      return;
    }
    setSaving(true);
    try {
      await changeAdminPassword(pwd.old, pwd.new1);
      toast.success(L("密码已修改", "Password changed"));
      setPwd({ old: "", new1: "", new2: "" });
    } catch (e) {
      toast.error(toastErrorMessage(e, L("修改失败，请检查原密码", "Change failed. Please check your current password")));
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setSaving(true);
    try {
      await registerAdminPasskey(passkeyLabel.trim() || undefined);
      toast.success(L("Passkey 已添加", "Passkey added"));
      setPasskeyLabel("");
    } catch (e) {
      toast.error(toastErrorMessage(e, L("Passkey 添加失败", "Failed to add Passkey")));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "profile" as const, label: L("个人信息", "Profile"), icon: User },
    { key: "password" as const, label: L("修改密码", "Change password"), icon: Lock },
    { key: "security" as const, label: L("安全验证", "Security"), icon: Fingerprint },
  ];

  const panelBody = (
    <>
      <div className="flex gap-1 rounded-2xl bg-secondary p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminTabsPanelSkeleton />
      ) : activeTab === "profile" ? (
        <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-bold text-primary-foreground">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-foreground">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">{L("管理员", "Administrator")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{L("昵称", "Nickname")}</span>
              <div className="relative mt-1">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{L("邮箱", "Email")}</span>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{L("手机", "Phone")}</span>
              <div className="relative mt-1">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold"
                />
              </div>
            </label>
          </div>
          <LoadingButton
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText={L("保存中...", "Saving...")}
            onClick={() => void handleSaveProfile()}
            className="w-full rounded-xl py-3 text-sm font-bold"
          >
            {L("保存修改", "Save changes")}
          </LoadingButton>
        </div>
      ) : activeTab === "password" ? (
        <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-bold text-foreground">{L("修改密码", "Change password")}</h3>
          {[
            { label: L("当前密码", "Current password"), key: "old" as const, placeholder: L("请输入当前密码", "Enter your current password") },
            { label: L("新密码", "New password"), key: "new1" as const, placeholder: L("请输入新密码，至少 6 位", "Enter a new password, at least 6 characters") },
            { label: L("确认密码", "Confirm password"), key: "new2" as const, placeholder: L("请再次输入新密码", "Re-enter the new password") },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder={f.placeholder}
                  value={pwd[f.key]}
                  onChange={(e) => setPwd({ ...pwd, [f.key]: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold"
                />
              </div>
            </label>
          ))}
          <LoadingButton
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText={L("提交中...", "Submitting...")}
            onClick={() => void handleChangePwd()}
            className="w-full rounded-xl py-3 text-sm font-bold"
          >
            {L("确认修改", "Confirm change")}
          </LoadingButton>
        </div>
      ) : (
        <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h3 className="font-bold text-foreground">Passkey</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {L(
                "添加后可使用设备解锁、指纹或安全密钥完成后台登录 MFA 和敏感操作二次验证。",
                "After adding a Passkey, you can use device unlock, fingerprint, or a security key to complete MFA and sensitive actions.",
              )}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{L("设备名称", "Device name")}</span>
            <div className="relative mt-1">
              <Fingerprint size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={passkeyLabel}
                onChange={(e) => setPasskeyLabel(e.target.value)}
                placeholder={L("例如：办公室电脑", "For example: office computer")}
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold"
              />
            </div>
          </label>
          <LoadingButton
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText={L("添加中...", "Adding...")}
            onClick={() => void handleRegisterPasskey()}
            className="w-full rounded-xl py-3 text-sm font-bold"
          >
            {L("添加 Passkey", "Add Passkey")}
          </LoadingButton>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{panelBody}</div>;
  }

  return (
    <AdminPageShell hint={L("管理您的账号信息、密码与 Passkey 安全验证。", "Manage your account info, password, and Passkey security.")}>
      {panelBody}
    </AdminPageShell>
  );
}
