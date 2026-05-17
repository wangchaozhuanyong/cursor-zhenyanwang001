import { useState } from "react";
import type { ReactNode } from "react";
import type { FooterNavItem } from "@/types/content";
import { SiteSocialLinks, hasAnySocialLink } from "@/components/SiteSocialLinks";

/** 末尾红色句号的品牌呈现，与移动端参考稿一致（大马通<span class=text-red>·</span>） */
export function GuestFooterBrandMark({ siteName }: { siteName: string }) {
  const base = siteName.trim().replace(/\.\s*$/, "");
  return (
    <h2 className="text-center text-[1.875rem] font-bold leading-none tracking-tight text-[var(--theme-text)]">
      {base}
      <span className="text-[var(--theme-price)]">.</span>
    </h2>
  );
}

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
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
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-5 pl-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FooterNavButton({
  item,
  onNavigate,
}: {
  item: FooterNavItem;
  onNavigate: (path: string) => void;
}) {
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
  onNavigate: (path: string) => void;
};

/**
 * 未登录首页专用页脚 — 布局对齐设计稿：
 * 上：品牌居中 + 两行文案 · 分隔线
 * 中：两行折叠导航（大号触控区）
 * 下：联系我们（左标签固定列 + 右值自适应，grid 排版避免重叠）
 */
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
  onNavigate,
}: GuestMobileFooterProps) {
  const hasContactBlock =
    !!(contactPhone || contactEmail || contactWhatsApp || businessHours || address);
  const socialProps = {
    whatsappUrl,
    contactWhatsApp,
    wechatId,
    instagramUrl,
    facebookUrl,
    tiktokUrl,
    xhsUrl,
  };
  const hasSocial = hasAnySocialLink(socialProps);

  return (
    <footer className="relative isolate z-0 mt-14 w-full max-w-lg md:mx-auto">
      {/* 独立卡片容器，与白底稿一致；留出底栏占位由页面根节点 pb 负责 */}
      <div className="rounded-none border-x-0 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 pb-10 pt-12 shadow-none sm:rounded-[1.75rem] sm:border sm:theme-shadow">
        <div className="flex flex-col items-center px-1 text-center">
          <GuestFooterBrandMark siteName={siteName || "大马通"} />
          <div className="mt-4 space-y-1">
            <p className="text-[15px] font-semibold leading-snug text-[var(--theme-text)]">{slogan}</p>
            <p className="text-[13px] leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
          </div>
        </div>

        {/* 品牌与导航之间的分隔 */}
        <div className="mx-auto mt-10 h-px w-full max-w-none bg-[var(--theme-border)]" />

        <div className="mt-0">
          <AccordionItem title="服务支持">
            <ul className="space-y-4">
              {supportNav.map((item, idx) => (
                <li key={`${item.label}-${item.path}-${idx}`}>
                  <FooterNavButton item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </AccordionItem>

          <AccordionItem title="政策与说明">
            <ul className="space-y-4">
              {policyNav.map((item, idx) => (
                <li key={`${item.label}-${item.path}-${idx}`}>
                  <FooterNavButton item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </AccordionItem>
        </div>

        {hasContactBlock && (
          <section className="mt-11">
            <h3 className="mb-5 text-[15px] font-medium text-[var(--theme-text)]">联系我们</h3>
            <div className="flex flex-col">
              {contactPhone && (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">
                    客服电话
                  </span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">
                    {contactPhone}
                  </span>
                </div>
              )}
              {contactEmail && (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">
                    电子邮箱
                  </span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">
                    {contactEmail}
                  </span>
                </div>
              )}
              {contactWhatsApp && (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">
                    客服专线
                  </span>
                  <span className="text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-all">
                    {contactWhatsApp}
                  </span>
                </div>
              )}
              {businessHours && (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">
                    服务时间
                  </span>
                  <span className="text-right text-[14px] font-semibold leading-snug text-[var(--theme-text)] break-words">
                    {businessHours}
                  </span>
                </div>
              )}
              {address && (
                <div className="grid grid-cols-[minmax(0,auto)_1fr] items-start gap-x-4 gap-y-1 py-[0.875rem]">
                  <span className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--theme-text-muted)]">
                    公司地址
                  </span>
                  <span className="text-right text-[14px] font-medium leading-snug text-[var(--theme-text)] break-words">
                    {address}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {hasSocial && (
          <section className="mt-11">
            <h3 className="mb-4 text-[15px] font-medium text-[var(--theme-text)]">关注我们</h3>
            <SiteSocialLinks {...socialProps} tone="footer" className="justify-start sm:justify-center" />
          </section>
        )}
      </div>
    </footer>
  );
}
