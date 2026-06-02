import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  settings: SiteSettings;
};

export default function SeoPreviewCard({ settings }: Props) {
  const title = String(settings.seoTitle || settings.siteName || "站点名称").trim() || "站点名称";
  const desc = String(settings.seoDescription || settings.siteDescription || "").trim() || "站点描述将显示在搜索结果摘要中。";
  const og = String(settings.ogImageUrl || settings.logoUrl || "").trim();

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="mb-2 font-medium text-foreground"><Tx>搜索预览</Tx></p>
        <p className="truncate text-[#1a0dab]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground">{desc}</p>
      </div>
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="mb-2 font-medium text-foreground"><Tx>分享卡片</Tx></p>
        {og ? (
          <img src={og} alt={`${title} 分享图预览`} className="mb-2 aspect-[1.91/1] w-full rounded-lg border border-border object-cover" />
        ) : (
          <div className="mb-2 flex aspect-[1.91/1] w-full items-center justify-center rounded-lg border border-dashed border-border bg-secondary text-muted-foreground">
            无 OG 图
          </div>
        )}
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
