import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useSiteInfo } from "@/hooks/useSiteInfo";

type Row = { icon: typeof Phone; label: string };

export default function ContactUsContent({ intro }: { intro?: string }) {
  const siteInfo = useSiteInfo();
  const rows: Row[] = [
    siteInfo.contactPhone ? { icon: Phone, label: siteInfo.contactPhone } : null,
    siteInfo.contactEmail ? { icon: Mail, label: siteInfo.contactEmail } : null,
    siteInfo.address ? { icon: MapPin, label: siteInfo.address } : null,
  ].filter(Boolean) as Row[];

  return (
    <div className="space-y-4">
      {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">联系方式</h2>
        <ul className="space-y-3">{rows.map((row) => <li key={row.label} className="flex items-start gap-3"><row.icon size={18} className="mt-0.5 shrink-0 text-[var(--theme-price)]" /><span className="text-sm">{row.label}</span></li>)}</ul>
      </div>
      {siteInfo.whatsappUrl ? <a href={siteInfo.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"><MessageCircle size={17} />WhatsApp</a> : null}
    </div>
  );
}
