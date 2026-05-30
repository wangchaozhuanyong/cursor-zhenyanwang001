import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { FooterNavItem } from "@/types/content";
import { SiteSocialLinks, hasAnySocialLink } from "@/components/SiteSocialLinks";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { cn } from "@/lib/utils";

export function GuestFooterBrandMark({ siteName }: { siteName: string }) {
  const base = siteName.trim().replace(/\.\s*$/, "");
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_28%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_9%,var(--theme-surface))] text-[var(--theme-primary)]">
        <Sparkles size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <h2 className="truncate font-display text-[26px] font-bold leading-none text-[var(--theme-text)] sm:text-[30px]">
          {base}
          <span className="text-[var(--theme-price)]">.</span>
        </h2>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
          Curated in Malaysia
        </p>
      </div>
    </div>
  );
}

function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_88%,var(--theme-bg))]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex min-h-[3.35rem] w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/35"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-semibold text-[var(--theme-text)]">{title}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-bg)_70%,var(--theme-surface))] text-[var(--theme-text-muted)]">
          <ChevronDown
            size={16}
            strokeWidth={1.9}
            className={cn("transition-transform duration-300 ease-out", isOpen && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          {isOpen ? <div className="px-3 pb-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function FooterNavButton({ item, onNavigate }: { item: FooterNavItem; onNavigate: (path: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className="group flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-[var(--theme-text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-primary)_7%,transparent)] hover:text-[var(--theme-primary)] active:text-[var(--theme-primary)]"
    >
      <span className="min-w-0 truncate">{item.label}</span>
      <ChevronRight size={14} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </button>
  );
}

function FooterPill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,var(--theme-bg))] px-3 text-[12px] font-semibold text-[var(--theme-text)]">
      <span className="text-[var(--theme-primary)]">{icon}</span>
      {children}
    </span>
  );
}

function ContactCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[2.35rem_1fr] gap-3 rounded-[1.1rem] border border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_90%,var(--theme-bg))] p-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_9%,transparent)] text-[var(--theme-primary)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-[var(--theme-text-muted)]">{label}</span>
        <span className="mt-0.5 block break-words text-[14px] font-semibold leading-snug text-[var(--theme-text)]">{value}</span>
      </span>
    </div>
  );
}

type GuestMobileFooterProps = {
  slogan: string;
  description: string;
  siteName: string;
  supportNav: FooterNavItem[];
  policyNav: FooterNavItem[];
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  xhsUrl?: string;
  footerCompanyName?: string;
  footerCopyright?: string;
  footerIcpNo?: string;
  onNavigate: (path: string) => void;
};

export default function GuestMobileFooter({
  siteName,
  slogan,
  description,
  supportNav,
  policyNav,
  contactPhone,
  contactEmail,
  address,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  xhsUrl,
  footerCompanyName,
  footerCopyright,
  footerIcpNo,
  onNavigate,
}: GuestMobileFooterProps) {
  const siteInfo = useSiteInfo();
  const { channels, workingHours: serviceHours } = useSupportRuntime();
  const whatsappDisplay = channels.find((channel) => channel.type === "whatsapp")?.account?.trim();
  const socialProps = {
    supportDownloadConfig: siteInfo.supportDownloadConfig,
    instagramUrl,
    facebookUrl,
    tiktokUrl,
    xhsUrl,
  };
  const hasSocial = hasAnySocialLink(socialProps);

  const legalCompany = (footerCompanyName || siteName || "").trim();
  const legalCopyright = (footerCopyright || "").trim();
  const legalIcp = (footerIcpNo || "").trim();
  const hasLegal = Boolean(legalCompany || legalCopyright || legalIcp);

  const contactItems = [
    contactPhone ? { key: "phone", label: "客服电话", value: contactPhone, icon: <Phone size={16} strokeWidth={1.8} /> } : null,
    contactEmail ? { key: "email", label: "电子邮箱", value: contactEmail, icon: <Mail size={16} strokeWidth={1.8} /> } : null,
    whatsappDisplay ? { key: "whatsapp", label: "WhatsApp", value: whatsappDisplay, icon: <MessageCircle size={16} strokeWidth={1.8} /> } : null,
    serviceHours ? { key: "hours", label: "服务时间", value: serviceHours, icon: <Clock3 size={16} strokeWidth={1.8} /> } : null,
    address ? { key: "address", label: "公司地址", value: address, icon: <MapPin size={16} strokeWidth={1.8} /> } : null,
  ].filter((item): item is { key: string; label: string; value: string; icon: ReactNode } => Boolean(item));
  const hasContactBlock = contactItems.length > 0;

  const supportLinks = (
    <ul className="space-y-1">
      {supportNav.map((item, idx) => (
        <li key={`${item.label}-${item.path}-${idx}`}>
          <FooterNavButton item={item} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  const policyLinks = (
    <ul className="space-y-1">
      {policyNav.map((item, idx) => (
        <li key={`${item.label}-${item.path}-${idx}`}>
          <FooterNavButton item={item} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="relative isolate z-0 w-full max-w-lg touch-pan-y md:mx-auto lg:max-w-none">
      <div className="relative touch-pan-y border-t border-[color-mix(in_srgb,var(--theme-border)_86%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_92%,var(--theme-bg))] px-4 pb-7 pt-8 sm:border sm:px-6 sm:theme-shadow md:pb-9 lg:px-10 lg:pb-10 lg:pt-11">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-primary)_42%,transparent),color-mix(in_srgb,var(--theme-price)_35%,transparent),transparent)]" />

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1.45fr] lg:gap-12">
            <section className="space-y-5">
              <GuestFooterBrandMark siteName={siteName || "站点"} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold leading-snug text-[var(--theme-text)] sm:text-[20px]">{slogan}</p>
                <p className="max-w-xl text-[13px] leading-7 text-[var(--theme-text-muted)] sm:text-[14px]">{description}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <FooterPill icon={<ShieldCheck size={14} strokeWidth={1.9} />}>正品保障</FooterPill>
                <FooterPill icon={<MapPin size={14} strokeWidth={1.9} />}>本地配送</FooterPill>
                <FooterPill icon={<MessageCircle size={14} strokeWidth={1.9} />}>中文客服</FooterPill>
              </div>
            </section>

            <section className="hidden gap-5 lg:grid lg:grid-cols-2">
              <div className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-bg)_35%,transparent)] p-4">
                <h3 className="mb-2 px-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">服务支持</h3>
                {supportLinks}
              </div>
              <div className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-bg)_35%,transparent)] p-4">
                <h3 className="mb-2 px-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">政策与说明</h3>
                {policyLinks}
              </div>
            </section>
          </div>

          <section className="mt-7 space-y-3 lg:hidden">
            <AccordionItem title="服务支持">{supportLinks}</AccordionItem>
            <AccordionItem title="政策与说明">{policyLinks}</AccordionItem>
          </section>

          {hasContactBlock ? (
            <section className="mt-8 lg:mt-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Concierge</p>
                  <h3 className="mt-1 text-[18px] font-semibold text-[var(--theme-text)]">联系我们</h3>
                </div>
                <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--theme-border)_74%,transparent)]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {contactItems.map((item) => (
                  <ContactCard key={item.key} icon={item.icon} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          ) : null}

          {hasSocial ? (
            <section className="mt-8 lg:mt-10">
              <h3 className="mb-4 text-[15px] font-semibold text-[var(--theme-text)]">关注我们</h3>
              <SiteSocialLinks {...socialProps} tone="footer" className="justify-start" />
            </section>
          ) : null}

          {hasLegal ? (
            <section className="mt-8 border-t border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] pt-5">
              <div className="flex flex-col gap-1 text-[12px] leading-6 text-[var(--theme-text-muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                {legalCompany ? <span>{legalCompany}</span> : null}
                {legalCopyright ? <span>{legalCopyright}</span> : null}
                {legalIcp ? <span>{legalIcp}</span> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
