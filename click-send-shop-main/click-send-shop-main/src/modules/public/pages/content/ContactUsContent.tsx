import { Mail, MapPin, Phone } from "lucide-react";
import SupportContactSection from "@/components/support/SupportContactSection";
import { useSiteInfo } from "@/hooks/useSiteInfo";

type Row = { icon: typeof Phone; label: string; href?: string };

function buildTelHref(phone: string) {
  const normalized = String(phone || "").trim().replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}

function buildMailHref(email: string) {
  const normalized = String(email || "").trim();
  return normalized ? `mailto:${normalized}` : undefined;
}

export default function ContactUsContent({ intro }: { intro?: string }) {
  const siteInfo = useSiteInfo();
  const rows: Row[] = [
    siteInfo.contactPhone ? { icon: Phone, label: siteInfo.contactPhone, href: buildTelHref(siteInfo.contactPhone) } : null,
    siteInfo.contactEmail ? { icon: Mail, label: siteInfo.contactEmail, href: buildMailHref(siteInfo.contactEmail) } : null,
    siteInfo.address ? { icon: MapPin, label: siteInfo.address } : null,
  ].filter(Boolean) as Row[];

  return (
    <div className="space-y-4">
      {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">联系方式</h2>
        <ul className="space-y-3">
          {rows.map((row) => {
            const content = (
              <>
                <row.icon size={18} className="mt-0.5 shrink-0 text-[var(--theme-price)]" />
                <span className="text-sm">{row.label}</span>
              </>
            );
            return (
              <li key={row.label}>
                {row.href ? (
                  <a href={row.href} className="flex items-start gap-3 rounded-lg outline-none hover:text-[var(--theme-price)] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]">
                    {content}
                  </a>
                ) : (
                  <span className="flex items-start gap-3">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <SupportContactSection className="rounded-2xl border border-border bg-card p-4" />
    </div>
  );
}
