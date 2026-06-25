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
    <div className="sf-next-contact-stack">
      {intro ? <p className="sf-next-contact-intro">{intro}</p> : null}
      <div className="sf-next-contact-panel">
        <h2>联系方式</h2>
        <ul>
          {rows.map((row) => {
            const content = (
              <>
                <row.icon size={18} aria-hidden />
                <span>{row.label}</span>
              </>
            );
            return (
              <li key={row.label}>
                {row.href ? (
                  <a href={row.href}>
                    {content}
                  </a>
                ) : (
                  <span>{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <SupportContactSection className="sf-next-contact-support" />
    </div>
  );
}
