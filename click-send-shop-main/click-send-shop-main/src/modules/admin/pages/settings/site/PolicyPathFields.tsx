import { Link } from "react-router-dom";
import { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";

const PATH_FIELDS: { key: keyof SiteSettings; label: string; placeholder: string }[] = [
  { key: "privacyPolicyPath", label: "隐私政策路径", placeholder: "/content/privacy-policy" },
  { key: "termsPath", label: "用户协议路径", placeholder: "/content/terms-of-service" },
  { key: "refundPolicyPath", label: "退款政策路径", placeholder: "/content/refund-policy" },
  { key: "shippingPolicyPath", label: "配送政策路径", placeholder: "/content/shipping-policy" },
];

type Props = {
  settings: SiteSettings;
  onChange: (key: keyof SiteSettings, value: string) => void;
};

export default function PolicyPathFields({ settings, onChange }: Props) {
  return (
    <div id="policy-paths" className="scroll-mt-24 space-y-3">
      <p className="text-xs text-muted-foreground">
        <Tx>政策正文请在</Tx>{" "}
        <Link to="/admin/content" className="text-theme-price underline-offset-2 hover:underline">
          <Tx>内容管理</Tx>
        </Link>
        <Tx>编辑；此处仅配置前台跳转路径（含登录页协议链接）。</Tx>
      </p>
      {PATH_FIELDS.map((f) => {
        const id = `policy-path-${String(f.key)}`;
        const value = String(settings[f.key] ?? "");
        return (
          <div key={String(f.key)}>
            <AdminLabelWithHint htmlFor={id} label={f.label} />
            <div className="flex gap-2">
              <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]"
              />
              {value.trim() ? (
                <Link
                  to={value.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl border border-border px-3 py-2.5 text-xs text-theme-price hover:bg-secondary"
                >
                  <Tx>预览</Tx>
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
