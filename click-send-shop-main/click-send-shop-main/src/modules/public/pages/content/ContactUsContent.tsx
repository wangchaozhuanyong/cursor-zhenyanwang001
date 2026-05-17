import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { copyToClipboard } from "@/utils/clipboard";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";

type Row = { icon: typeof Phone; label: string; action?: () => void };

export default function ContactUsContent({ intro }: { intro?: string }) {
  const siteInfo = useSiteInfo();

  const whatsappUrl =
    (siteInfo.whatsappUrl || "").trim()
    || (siteInfo.contactWhatsApp
      ? `https://wa.me/${siteInfo.contactWhatsApp.replace(/\D/g, "")}?text=你好，我需要帮助`
      : "");

  const rows: Row[] = [
    siteInfo.contactPhone ? { icon: Phone, label: siteInfo.contactPhone } : null,
    siteInfo.contactEmail ? { icon: Mail, label: siteInfo.contactEmail } : null,
    siteInfo.wechatId
      ? {
          icon: MessageCircle,
          label: `微信：${siteInfo.wechatId}`,
          action: async () => {
            const copied = await copyToClipboard(siteInfo.wechatId!);
            if (copied) toast.success("客服微信号已复制", toastPresetQuickSuccess);
            else toast.error("复制失败，请手动复制微信号");
          },
        }
      : null,
    siteInfo.businessHours ? { icon: Phone, label: `服务时间：${siteInfo.businessHours}` } : null,
    siteInfo.address ? { icon: MapPin, label: siteInfo.address } : null,
  ].filter((r): r is Row => Boolean(r));

  return (
    <div className="space-y-4">
      {intro ? <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p> : null}

      {rows.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">联系方式</h2>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.label}>
                {row.action ? (
                  <button
                    type="button"
                    onClick={() => void row.action?.()}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <row.icon size={18} className="mt-0.5 shrink-0 text-[var(--theme-price)]" />
                    <span className="text-sm text-foreground">{row.label}</span>
                  </button>
                ) : (
                  <div className="flex items-start gap-3">
                    <row.icon size={18} className="mt-0.5 shrink-0 text-[var(--theme-price)]" />
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          管理员尚未配置联系方式，请到后台「站点设置」填写电话、邮箱或微信。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <MessageCircle size={17} />
            WhatsApp
          </a>
        ) : null}
        <a
          href="/help"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
        >
          帮助中心
        </a>
      </div>
    </div>
  );
}
