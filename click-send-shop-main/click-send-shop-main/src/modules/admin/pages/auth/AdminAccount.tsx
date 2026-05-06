import { useState, useEffect } from "react";
import { User, Lock, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminProfile, updateAdminProfile, changeAdminPassword } from "@/services/admin/accountService";

export default function AdminAccount() {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pwd, setPwd] = useState({ old: "", new1: "", new2: "" });

  useEffect(() => {
    setLoading(true);
    fetchAdminProfile()
      .then((data: any) => {
        setProfile({
          name: data?.nickname || data?.username || "Admin",
          email: data?.email ?? "",
          phone: data?.phone ?? "",
        });
      })
      .catch(() => toast.error("加载数据失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateAdminProfile({
        nickname: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
      toast.success("个人信息已更新");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (!pwd.old || !pwd.new1 || !pwd.new2) { toast.error("请填写完整"); return; }
    if (pwd.new1 !== pwd.new2) { toast.error("两次密码不一致"); return; }
    if (pwd.new1.length < 6) { toast.error("密码至少6位"); return; }
    setSaving(true);
    try {
      await changeAdminPassword(pwd.old, pwd.new1);
      toast.success("密码已修改");
      setPwd({ old: "", new1: "", new2: "" });
    } catch {
      toast.error("修改失败，请检查原密码");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "profile" as const, label: "个人信息", icon: User },
    { key: "password" as const, label: "修改密码", icon: Lock },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">账号设置</h1>
        <p className="text-sm text-muted-foreground">管理您的账号信息</p>
      </div>

      <div className="flex gap-1 rounded-2xl bg-secondary p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-bold text-primary-foreground">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-foreground">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">管理员</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">昵称</span>
              <div className="relative mt-1">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">邮箱</span>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">手机</span>
              <div className="relative mt-1">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold" />
              </div>
            </label>
          </div>
          <button disabled={saving} onClick={handleSaveProfile} className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "保存修改"}
          </button>
        </div>
      )}

      {activeTab === "password" && (
        <div className="max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-bold text-foreground">修改密码</h3>
          {[
            { label: "当前密码", key: "old" as const, placeholder: "请输入当前密码" },
            { label: "新密码", key: "new1" as const, placeholder: "请输入新密码（至少6位）" },
            { label: "确认密码", key: "new2" as const, placeholder: "请再次输入新密码" },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="password" placeholder={f.placeholder} value={pwd[f.key]} onChange={(e) => setPwd({ ...pwd, [f.key]: e.target.value })} className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-gold" />
              </div>
            </label>
          ))}
          <button disabled={saving} onClick={handleChangePwd} className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "确认修改"}
          </button>
        </div>
      )}
    </div>
  );
}
