import { useState } from "react";
import type { ReactNode } from "react";
import type { FooterNavItem } from "@/types/content";
import { SiteSocialLinks, hasAnySocialLink } from "@/components/SiteSocialLinks";

export function GuestFooterBrandMark({ siteName }: { siteName: string }) {
  const base = siteName.trim().replace(/\.\s*$/, "");
  return (
    <h2 className="text-center text-[24px] font-bold leading-none tracking-tight text-[var(--theme-text)] sm:text-[26px] lg:text-left">
      {base}
      <span className="text-[var(--theme-price)]">.</span>
    </h2>
  );
}

function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[color-mix(in_srgb,var(--theme-border)_92%,transparent)] last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full min-h-[3.25rem] items-center justify-between gap-3 bg-transparent py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-surface)]"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-medium text-[var(--theme-text)]">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          {isOpen ? <div className="pb-5 pl-0.5">{children}</div> : null}
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
      className="block w-full text-left text-[14px] font-medium text-[var(--theme-text-muted)] transition-colors hover:text-[var(--theme-primary)] active:text-[var(--theme-primary)]"
    >
      {item.label}
    </button>
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
  contactWhatsApp?: string;
  businessHours?: string;
  address?: string;
  whatsappUrl?: string;
  wechatId?: string;
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
  contactWhatsApp,
  businessHours,
  address,
  whatsappUrl,
  wechatId,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  xhsUrl,
  footerCompanyName,
  footerCopyright,
  footerIcpNo,
  onNavigate,
}: GuestMobileFooterProps) {
  const hasContactBlock = !!(contactPhone || contactEmail || contactWhatsApp || businessHours || address);
  const socialProps = { whatsappUrl, contactWhatsApp, wechatId, instagramUrl, facebookUrl, tiktokUrl, xhsUrl };
  const hasSocial = hasAnySocialLink(socialProps);

  const legalCompany = (footerCompanyName || siteName || "").trim();
  const legalCopyright = (footerCopyright || "").trim();
  const legalIcp = (footerIcpNo || "").trim();
  const hasLegal = Boolean(legalCompany || legalCopyright || legalIcp);

  const supportLinks = (
    <ul className="space-y-3 lg:space-y-2.5">
      {supportNav.map((item, idx) => (
        <li key={`${item.label}-${item.path}-${idx}`}>
          <FooterNavButton item={item} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  const policyLinks = (
    <ul className="space-y-3 lg:space-y-2.5">
      {policyNav.map((item, idx) => (
        <li key={`${item.label}-${item.path}-${idx}`}>
          <FooterNavButton item={item} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="relative isolate z-0 w-full max-w-lg md:mx-auto lg:max-w-none">
      <div className="rounded-none border-x-0 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 pb-6 pt-8 shadow-none sm:rounded-[1.75rem] sm:border sm:theme-shadow md:pb-8 lg:px-10 lg:pb-10 lg:pt-10">
        <div className="flex flex-col items-center px-1 text-center lg:items-start lg:text-left">
          <GuestFooterBrandMark siteName={siteName || "站点"} />
          <div className="mt-4 space-y-1">
            <p className="text-[15px] font-semibold leading-snug text-[var(--theme-text)]">{slogan}</p>
            <p className="text-[13px] leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
          </div>
        </div>

        <div className="mx-auto mt-7 h-px w-full max-w-none bg-[var(--theme-border)]" />

        <div className="mt-0 lg:hidden">
          <AccordionItem title="服务支持">{supportLinks}</AccordionItem>
          <AccordionItem title="政策与说明">{policyLinks}</AccordionItem>
        </div>

        <div className="mt-7 hidden gap-8 lg:grid lg:grid-cols-2 xl:grid-cols-4">
          <div>
            <h3 className="mb-4 text-[15px] font-semibold text-[var(--theme-text)]">服务支持</h3>
            {supportLinks}
          </div>
          <div>
            <h3 className="mb-4 text-[15px] font-semibold text-[var(--theme-text)]">政策与说明</h3>
            {policyLinks}
          </div>
          {hasContactBlock ? (
            <div className="xl:col-span-2">
              <h3 className="mb-4 text-[15px] font-semibold text-[var(--theme-text)]">联系我们</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {contactPhone ? (
                  <p className="text-sm text-[var(--theme-text-muted)]">
                    <span className="font-medium text-[var(--theme-text)]">客服电话：</span>
                    {contactPhone}
                  </p>
                ) : null}
                {contactEmail ? (
                  <p className="text-sm text-[var(--theme-text-muted)]">
                    <span className="font-medium text-[var(--theme-text)]">邮箱：</span>
                    {contactEmail}
                  </p>
                ) : null}
                {contactWhatsApp ? (
                  <p className="text-sm text-[var(--theme-text-muted)]">
                    <span className="font-medium text-[var(--theme-text)]">客服专线：</span>
                    {contactWhatsApp}
                  </p>
                ) : null}
                {businessHours ? (
                  <p className="text-sm text-[var(--theme-text-muted)]">
                    <span className="font-medium text-[var(--theme-text)]">服务时间：</span>
                    {businessHours}
                  </p>
                ) : null}
                {address ? (
                  <p className="text-sm text-[var(--theme-text-muted)] sm:col-span-2">
                    <span className="font-medium text-[var(--theme-text)]">地址：</span>
                    {address}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {hasContactBlock ? (
          <section className="mt-8 lg:hidden">
            <h3 className="mb-4 text-[15px] font-medium text-[var(--theme-text)]">联系我们</h3>
            <div className="flex flex-col">
              {contactPhone ? (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">客服电话</span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">{contactPhone}</span>
                </div>
              ) : null}
              {contactEmail ? (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">电子邮箱</span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">{contactEmail}</span>
                </div>
              ) : null}
              {contactWhatsApp ? (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">客服专线</span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">{contactWhatsApp}</span>
                </div>
              ) : null}
              {businessHours ? (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">服务时间</span>
                  <span className="text-right text-[14px] font-semibold leading-snug text-[var(--theme-text)] break-words">{businessHours}</span>
                </div>
              ) : null}
              {address ? (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">公司地址</span>
                  <span className="text-right text-[14px] font-medium leading-snug text-[var(--theme-text)] break-words">{address}</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasSocial ? (
          <section className="mt-8 lg:mt-10">
            <h3 className="mb-4 text-[15px] font-medium text-[var(--theme-text)]">关注我们</h3>
            <SiteSocialLinks {...socialProps} tone="footer" className="justify-start sm:justify-center lg:justify-start" />
          </section>
        ) : null}

        {hasLegal ? (
          <section className="mt-8 border-t border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] pt-4 text-center lg:text-left">
            {legalCompany ? <p className="text-xs text-[var(--theme-text-muted)]">{legalCompany}</p> : null}
            {legalCopyright ? <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{legalCopyright}</p> : null}
            {legalIcp ? <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{legalIcp}</p> : null}
          </section>
        ) : null}
      </div>
    </footer>
  );
}
