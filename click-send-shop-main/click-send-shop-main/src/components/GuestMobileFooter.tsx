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
    <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-[color-mix(in_srgb,var(--theme-price)_42%,var(--theme-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-surface)_92%,white),color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface)))] text-[var(--theme-primary)] shadow-[0_16px_34px_-26px_var(--theme-primary)]">
        <Sparkles size={19} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 max-w-full">
        <h2 className="max-w-[min(18rem,82vw)] font-display text-[30px] font-bold leading-[1.15] text-[var(--theme-text)] sm:max-w-none sm:text-[31px]">
          {base}
        </h2>
        <p className="mt-1 text-[12px] font-medium text-[var(--theme-text-muted)]">
          官方严选 · 本地服务
        </p>
      </div>
    </div>
  );
}

function FooterSectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4 text-center">
      {eyebrow ? (
        <p className="text-[12px] font-medium text-[var(--theme-text-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-price)_62%,transparent))]" />
        <h3 className="text-[17px] font-semibold text-[var(--theme-text)]">{title}</h3>
        <span className="h-px w-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--theme-price)_62%,transparent),transparent)]" />
      </div>
    </div>
  );
}

function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_90%,var(--theme-bg))]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex min-h-[3.35rem] w-full items-center justify-center px-12 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/35"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-semibold text-[var(--theme-text)]">{title}</span>
        <span className="absolute right-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-bg)_70%,var(--theme-surface))] text-[var(--theme-text-muted)]">
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
      className="group flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[14px] font-medium text-[var(--theme-text-muted)] transition-all hover:bg-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)] hover:text-[var(--theme-primary)] active:scale-[0.98] active:text-[var(--theme-primary)]"
    >
      <span className="min-w-0 truncate">{item.label}</span>
      <ChevronRight size={14} className="shrink-0 opacity-45 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
    </button>
  );
}

function ContactCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="group relative flex min-h-[4.75rem] items-center gap-3.5 overflow-hidden rounded-[1.05rem] border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface)_96%,white)_0%,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-bg))_100%)] px-3.5 py-3 text-left shadow-[0_18px_44px_-38px_var(--theme-primary)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-price)_42%,var(--theme-border))] hover:shadow-[0_20px_48px_-36px_var(--theme-primary)] active:scale-[0.99]">
      <span className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-price)_72%,transparent),color-mix(in_srgb,var(--theme-primary)_58%,transparent))] opacity-80" />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--theme-price)_32%,transparent)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface)),color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface)))] text-[var(--theme-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_-18px_var(--theme-primary)] transition-transform duration-300 group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-none text-[var(--theme-text-muted)]">{label}</span>
        <span className="mt-1.5 block max-w-full break-words text-[14px] font-semibold leading-snug text-[var(--theme-text)] [overflow-wrap:anywhere] sm:text-[15px]">
          {value}
        </span>
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
    whatsappDisplay ? { key: "whatsapp", label: "在线客服", value: whatsappDisplay, icon: <MessageCircle size={16} strokeWidth={1.8} /> } : null,
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
    <footer className="relative isolate z-0 w-full touch-pan-y">
      <div className="relative overflow-hidden touch-pan-y border-t border-[color-mix(in_srgb,var(--theme-border)_86%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-surface)_96%,white)_0%,color-mix(in_srgb,var(--theme-price)_7%,var(--theme-bg))_45%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-bg))_100%)] px-4 pb-8 pt-14 sm:border sm:px-6 sm:pt-14 sm:theme-shadow md:pb-10 lg:px-10 lg:pb-11 lg:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-primary)_42%,transparent),color-mix(in_srgb,var(--theme-price)_35%,transparent),transparent)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in srgb, var(--theme-price) 18%, transparent) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="pointer-events-none absolute -bottom-12 left-1/2 h-24 w-[118%] -translate-x-1/2 rounded-[50%] border-t border-[color-mix(in_srgb,var(--theme-price)_22%,transparent)] opacity-70" />
        <div className="pointer-events-none absolute -bottom-4 left-1/2 h-14 w-[106%] -translate-x-1/2 rounded-[50%] border-t border-[color-mix(in_srgb,var(--theme-primary)_14%,transparent)] opacity-60" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
          <section className="mx-auto flex max-w-2xl scroll-mt-[calc(var(--store-mobile-header-height,4.5rem)+1rem)] flex-col items-center">
            <GuestFooterBrandMark siteName={siteName || "站点"} />
            <div className="mt-5 space-y-2">
              <p className="text-[18px] font-semibold leading-snug text-[var(--theme-text)] sm:text-[20px]">{slogan}</p>
              <p className="mx-auto max-w-xl text-[13px] leading-7 text-[var(--theme-text-muted)] sm:text-[14px]">{description}</p>
            </div>
          </section>

          <section className="mt-8 hidden w-full max-w-3xl gap-4 lg:grid lg:grid-cols-2">
            <div className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_70%,transparent)] p-4">
              <FooterSectionTitle title="服务支持" />
              {supportLinks}
            </div>
            <div className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_70%,transparent)] p-4">
              <FooterSectionTitle title="政策与说明" />
              {policyLinks}
            </div>
          </section>

          <section className="mt-7 w-full max-w-lg space-y-3 lg:hidden">
            <AccordionItem title="服务支持">{supportLinks}</AccordionItem>
            <AccordionItem title="政策与说明">{policyLinks}</AccordionItem>
          </section>

          {hasContactBlock ? (
            <section className="mt-9 w-full lg:mt-10" aria-label="联系方式">
              <FooterSectionTitle title="联系我们" />
              <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {contactItems.map((item) => (
                  <ContactCard key={item.key} icon={item.icon} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          ) : null}

          {hasSocial ? (
            <section className="mt-9 w-full lg:mt-10">
              <FooterSectionTitle title="关注我们" />
              <SiteSocialLinks {...socialProps} tone="footer" labelMode="zhOnly" className="justify-center" />
            </section>
          ) : null}

          {hasLegal ? (
            <section className="mt-9 w-full max-w-4xl border-t border-[color-mix(in_srgb,var(--theme-border)_78%,transparent)] pt-5">
              <div className="flex flex-col items-center justify-center gap-1 text-center text-[12px] leading-6 text-[var(--theme-text-muted)] sm:flex-row sm:flex-wrap sm:gap-x-4">
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
