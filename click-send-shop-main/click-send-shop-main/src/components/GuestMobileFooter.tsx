import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { FooterNavItem, SupportDownloadChannel } from "@/types/content";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { buildWhatsAppLink } from "@/utils/supportChannels";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const FOOTER_BRAND_FALLBACK = "大马通";
const FOOTER_HEADLINE_FALLBACK = "马来西亚华人一站式生活服务与优选商城";
const FOOTER_DESCRIPTION_FALLBACK =
  "大马通专注服务马来西亚华人，整合本地优选商品、中国好物、正品保税、工厂货源、签证留学、第二家园与商业服务资源，让在马生活、采购、办事更省心。";

function cleanFooterText(value?: string) {
  return String(value || "").trim();
}

function resolveFooterBrand(siteName: string) {
  const base = cleanFooterText(siteName).replace(/[.。]\s*$/, "");
  if (!base || base === "官方商城" || base === "站点") return FOOTER_BRAND_FALLBACK;
  return base;
}

function resolveFooterCopy(value: string, fallback: string, genericValues: string[]) {
  const clean = cleanFooterText(value);
  if (!clean || genericValues.includes(clean)) return fallback;
  return clean;
}

function buildTelHref(phone: string) {
  const normalized = cleanFooterText(phone).replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}

function buildMailHref(email: string) {
  const normalized = cleanFooterText(email);
  return normalized ? `mailto:${normalized}` : undefined;
}

export function GuestFooterBrandMark({ siteName, logoSrc }: { siteName: string; logoSrc?: string }) {
  const base = resolveFooterBrand(siteName);
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);
  const cleanLogoSrc = cleanFooterText(logoSrc);
  const showLogo = Boolean(cleanLogoSrc && failedLogoSrc !== cleanLogoSrc);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#bfe9ce] bg-white text-[#078437] shadow-[0_18px_34px_-28px_rgba(7,132,55,0.55)] sm:h-14 sm:w-14">
        {showLogo ? (
          <img
            src={cleanLogoSrc}
            alt=""
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            loading="eager"
            decoding="async"
            aria-hidden="true"
            onError={() => setFailedLogoSrc(cleanLogoSrc)}
          />
        ) : (
          <Sparkles size={24} strokeWidth={1.8} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[28px] font-bold leading-none text-[#17231c] sm:text-[34px]">
          {base}
        </span>
        <span className="mt-1 block text-[12px] font-semibold leading-none text-[#5f6f65]">
          Damatong.net
        </span>
      </span>
    </div>
  );
}

function TrustPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex w-[6.35rem] min-w-0 items-center justify-start gap-2 text-left text-[13px] font-semibold text-[#254232]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#078437] shadow-[0_12px_28px_-22px_rgba(7,132,55,0.7)]">
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

function FooterColumn({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <h3 className="text-[17px] font-bold leading-none text-[#151f19]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccordionItem({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-[#dce9e1] bg-white shadow-[0_18px_42px_-34px_rgba(20,70,41,0.34)]">
      <UnifiedButton
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7fbf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078437]/25"
        aria-expanded={isOpen}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef9f1] text-[#078437]">
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-[16px] font-bold leading-snug text-[#17231c]">
          {title}
        </span>
        <ChevronDown
          size={19}
          strokeWidth={2.1}
          className={cn("shrink-0 text-[#078437] transition-transform duration-300 ease-out", isOpen && "rotate-180")}
          aria-hidden
        />
      </UnifiedButton>
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
    <UnifiedButton
      type="button"
      onClick={() => onNavigate(item.path)}
      className="group flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] font-medium text-[#526157] transition-all hover:bg-[#eef9f1] hover:text-[#078437] active:scale-[0.99]"
    >
      <span className="min-w-0 truncate">{item.label}</span>
      <ChevronRight size={15} className="shrink-0 opacity-45 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
    </UnifiedButton>
  );
}

function ContactLine({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const accessibleValue = lines.join(" ") || value;
  const className =
    "group flex min-h-[62px] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f4fbf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078437]/25";
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef9f1] text-[#078437]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-none text-[#151f19]">{label}</span>
        <span className="mt-1.5 block max-w-full text-[13px] leading-5 text-[#607066] [overflow-wrap:anywhere]">
          {lines.length > 1
            ? lines.map((line, index) => (
              <span key={`${line}-${index}`} className="block">
                {line}
              </span>
            ))
            : value}
        </span>
      </span>
      {href ? <ChevronRight size={16} className="shrink-0 text-[#9aa9a0] transition group-hover:translate-x-0.5 group-hover:text-[#078437]" aria-hidden /> : null}
    </>
  );

  if (href) {
    const external = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className}
        aria-label={`${label} ${accessibleValue}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} aria-label={`${label} ${accessibleValue}`}>
      {content}
    </div>
  );
}

function getChannelLabel(type: SupportDownloadChannel["type"]) {
  if (type === "wechat") return "微信咨询";
  if (type === "whatsapp") return "WhatsApp 咨询";
  return "Telegram 咨询";
}

function getChannelIcon(type: SupportDownloadChannel["type"]) {
  if (type === "telegram") return <Send size={18} strokeWidth={1.9} />;
  if (type === "whatsapp") return <MessageCircle size={18} strokeWidth={1.9} />;
  return <MessageCircle size={18} strokeWidth={1.9} />;
}

function FollowButton({
  channel,
  icon,
  label,
  onClick,
}: {
  channel?: SupportDownloadChannel;
  icon: ReactNode;
  label: string;
  onClick: (channel?: SupportDownloadChannel) => void;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={() => onClick(channel)}
      className="flex min-h-[42px] min-w-0 items-center justify-center gap-2 rounded-lg border border-[#bfe9ce] bg-white px-3 py-2 text-[13px] font-semibold text-[#234130] shadow-[0_16px_34px_-32px_rgba(7,132,55,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#078437] hover:text-[#078437] active:scale-[0.99]"
    >
      <span className="shrink-0 text-[#078437]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </UnifiedButton>
  );
}

type GuestMobileFooterProps = {
  slogan: string;
  description: string;
  siteName: string;
  logoSrc?: string;
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
  logoSrc,
  slogan,
  description,
  supportNav,
  policyNav,
  contactPhone,
  contactEmail,
  address,
  footerCompanyName,
  footerCopyright,
  footerIcpNo,
  onNavigate,
}: GuestMobileFooterProps) {
  const siteInfo = useSiteInfo();
  const { buildSupportPageUrl, channels, openChannel, workingHours: serviceHours } = useSupportRuntime();
  const brandName = resolveFooterBrand(siteName || siteInfo.siteName || FOOTER_BRAND_FALLBACK);
  const footerLogoSrc = cleanFooterText(logoSrc) || resolveSiteLogoUrl(siteInfo);
  const headline = resolveFooterCopy(slogan, FOOTER_HEADLINE_FALLBACK, ["官方商品与服务平台"]);
  const intro = resolveFooterCopy(description, FOOTER_DESCRIPTION_FALLBACK, ["本平台提供商品、服务与客户支持信息。"]);

  const whatsappChannel = channels.find((channel) => channel.type === "whatsapp");
  const whatsappDisplay = whatsappChannel?.account?.trim();
  const displayPhone = cleanFooterText(contactPhone) || "+60182778801";
  const displayEmail = cleanFooterText(contactEmail) || "ppfzj1314@gmail.com";
  const displayWhatsapp = whatsappDisplay || "5325325235";
  const whatsappHref = whatsappChannel
    ? buildWhatsAppLink(whatsappChannel)
    : buildWhatsAppLink({ account: displayWhatsapp, linkUrl: "" });
  const displayHours = cleanFooterText(serviceHours) || "工作日 09:00 - 18:00\n下午客服全天 24 小时";
  const displayAddress = cleanFooterText(address) || "Komplek Bandar Park";

  const legalCompanyRaw = cleanFooterText(footerCompanyName);
  const legalCompany = !legalCompanyRaw || legalCompanyRaw === "官方商城" ? `${brandName}平台` : legalCompanyRaw;
  const legalCopyrightRaw = cleanFooterText(footerCopyright);
  const legalCopyright =
    !legalCopyrightRaw || legalCopyrightRaw.includes("官方商城")
      ? `© ${new Date().getFullYear()} ${brandName}, 保留所有权利.`
      : legalCopyrightRaw;
  const legalIcp = cleanFooterText(footerIcpNo);
  const legalParts = [legalCompany, legalCopyright, legalIcp].filter(Boolean);

  const contactItems = [
    { key: "whatsapp", label: "WhatsApp", value: displayWhatsapp, href: whatsappHref, icon: <MessageCircle size={20} strokeWidth={1.8} /> },
    { key: "phone", label: "电话", value: displayPhone, href: buildTelHref(displayPhone), icon: <Phone size={19} strokeWidth={1.8} /> },
    { key: "email", label: "邮箱", value: displayEmail, href: buildMailHref(displayEmail), icon: <Mail size={19} strokeWidth={1.8} /> },
    { key: "hours", label: "服务时间", value: displayHours, icon: <Clock3 size={19} strokeWidth={1.8} /> },
    { key: "address", label: "地址", value: displayAddress, icon: <MapPin size={20} strokeWidth={1.8} /> },
  ];

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

  const orderedChannels = (["wechat", "whatsapp", "telegram"] as const).map((type) => ({
    channel: channels.find((item) => item.type === type),
    icon: getChannelIcon(type),
    label: getChannelLabel(type),
    type,
  }));

  const handleFollowClick = async (channel?: SupportDownloadChannel) => {
    if (!channel) {
      onNavigate(buildSupportPageUrl());
      return;
    }

    const action = openChannel(channel);
    if (action === "wechat_copy") {
      const account = cleanFooterText(channel.account);
      if (!account) {
        onNavigate(buildSupportPageUrl(channel.id));
        return;
      }
      const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(account)]);
      if (copied) {
        toast.success("微信号已复制", toastPresetQuickSuccess);
      } else {
        toast.error("复制失败，请手动复制微信号");
      }
      return;
    }

    if (action === "none") {
      onNavigate(buildSupportPageUrl(channel.id));
    }
  };

  return (
    <footer className="guest-mobile-footer relative isolate z-0 w-full touch-pan-y">
      <div className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] pb-7 pt-2 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-[#cdebd7] bg-[linear-gradient(120deg,#f4fff7_0%,#fbfffc_46%,#e9f8ef_100%)] px-5 py-8 shadow-[0_22px_60px_-42px_rgba(7,132,55,0.48)] md:px-10 md:py-10" aria-label="页脚服务入口">
          <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#078437]">一站式在马生活服务</p>
              <h2 className="mt-3 font-display text-[28px] font-bold leading-tight text-[#08632f] sm:text-[40px]">
                还没找到你需要的服务？
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#415146]">
                在{brandName}，找房、留学、签证、本地办事和生活服务，一站式查看。
              </p>
              <div className="mt-6 grid gap-3 sm:max-w-xl sm:grid-cols-2">
                <UnifiedButton
                  type="button"
                  onClick={() => onNavigate("/categories")}
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg bg-[#078437] px-5 text-[16px] font-bold text-white shadow-[0_18px_34px_-26px_rgba(7,132,55,0.76)] transition hover:bg-[#046d2d] active:scale-[0.99]"
                >
                  浏览全部服务
                </UnifiedButton>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg border border-[#078437] bg-white px-5 text-[16px] font-bold text-[#078437] transition hover:bg-[#f4fbf6] active:scale-[0.99]"
                >
                  <MessageCircle size={20} strokeWidth={2.1} />
                  WhatsApp 咨询
                </a>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-4 border-t border-[#d7ebde] pt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-7">
                <TrustPill icon={<MessageCircle size={18} strokeWidth={1.9} />} label="中文沟通" />
                <TrustPill icon={<MapPin size={18} strokeWidth={1.9} />} label="本地资源" />
                <TrustPill icon={<ShieldCheck size={18} strokeWidth={1.9} />} label="真实信息" />
                <TrustPill icon={<Zap size={18} strokeWidth={1.9} />} label="高频服务入口" />
              </div>
            </div>
            <div className="relative hidden min-h-[210px] lg:block" aria-hidden>
              <div className="absolute bottom-0 right-0 h-48 w-72 rounded-full bg-[#b7edc8]/40 blur-3xl" />
              <div className="absolute bottom-0 right-6 h-24 w-32 rounded-lg border border-[#9ad7ad] bg-white/70 shadow-[0_24px_50px_-36px_rgba(7,132,55,0.58)]" />
              <div className="absolute bottom-7 right-36 h-16 w-24 rounded-lg border border-[#bfe9ce] bg-white/80 shadow-[0_20px_44px_-34px_rgba(7,132,55,0.5)]" />
            </div>
          </div>
        </section>

        <div className="mt-8 hidden grid-cols-[1.3fr_0.7fr_0.8fr_1fr] gap-8 border-b border-[#dde7e0] pb-9 md:grid lg:gap-12">
          <FooterColumn title={brandName}>
            <GuestFooterBrandMark siteName={brandName} logoSrc={footerLogoSrc} />
            <p className="mt-5 max-w-[25rem] text-[14px] leading-7 text-[#607066]">
              {intro}
            </p>
            <div className="mx-auto mt-6 grid w-fit grid-cols-2 gap-x-5 gap-y-3">
              <TrustPill icon={<ShieldCheck size={17} strokeWidth={1.9} />} label="安全可靠" />
              <TrustPill icon={<MapPin size={17} strokeWidth={1.9} />} label="本地资源" />
              <TrustPill icon={<MessageCircle size={17} strokeWidth={1.9} />} label="中文支持" />
              <TrustPill icon={<Zap size={17} strokeWidth={1.9} />} label="高效便捷" />
            </div>
          </FooterColumn>

          <FooterColumn title="平台服务">
            {supportLinks}
          </FooterColumn>

          <FooterColumn title="帮助与政策">
            {policyLinks}
          </FooterColumn>

          <FooterColumn title="联系我们">
            <div className="space-y-1">
              {contactItems.slice(0, 4).map((item) => (
                <ContactLine
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  href={item.href}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              {orderedChannels.map((item) => (
                <FollowButton
                  key={item.type}
                  channel={item.channel}
                  icon={item.icon}
                  label={item.label}
                  onClick={handleFollowClick}
                />
              ))}
            </div>
          </FooterColumn>
        </div>

        <div className="mt-5 space-y-3 md:hidden">
          <section className="rounded-lg border border-[#dce9e1] bg-white px-4 py-5 shadow-[0_18px_42px_-34px_rgba(20,70,41,0.34)]">
            <GuestFooterBrandMark siteName={brandName} logoSrc={footerLogoSrc} />
            <p className="mt-4 text-[14px] leading-7 text-[#607066]">
              {intro}
            </p>
            <div className="mx-auto mt-5 grid w-fit grid-cols-2 gap-x-5 gap-y-3">
              <TrustPill icon={<ShieldCheck size={17} strokeWidth={1.9} />} label="安全可靠" />
              <TrustPill icon={<MapPin size={17} strokeWidth={1.9} />} label="本地资源" />
              <TrustPill icon={<MessageCircle size={17} strokeWidth={1.9} />} label="中文支持" />
              <TrustPill icon={<Zap size={17} strokeWidth={1.9} />} label="高效便捷" />
            </div>
          </section>

          <AccordionItem title="平台服务" icon={<Headphones size={21} strokeWidth={1.8} />}>
            {supportLinks}
          </AccordionItem>
          <AccordionItem title="帮助与政策" icon={<ShieldCheck size={21} strokeWidth={1.8} />}>
            {policyLinks}
          </AccordionItem>

          <AccordionItem title="联系我们" icon={<Phone size={21} strokeWidth={1.8} />}>
            <div className="space-y-1">
              {contactItems.map((item) => (
                <ContactLine
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  href={item.href}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              {orderedChannels.map((item) => (
                <FollowButton
                  key={item.type}
                  channel={item.channel}
                  icon={item.icon}
                  label={item.label}
                  onClick={handleFollowClick}
                />
              ))}
            </div>
          </AccordionItem>
        </div>

        {legalParts.length > 0 ? (
          <section className="border-t border-[#dde7e0] pt-5 md:border-t-0" aria-label="版权信息">
            <div className="flex flex-col items-center justify-between gap-3 text-center text-[12px] leading-5 text-[#718077] md:flex-row md:text-left">
              <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-4">
                {legalParts.map((item, index) => (
                  <span key={`${item}-${index}`} className="inline-flex items-center justify-center gap-4">
                    {index > 0 ? <span className="hidden h-4 w-px bg-[#ccd9d1] md:block" aria-hidden /> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4">
                {policyNav.slice(0, 2).map((item, index) => (
                  <UnifiedButton
                    key={`${item.label}-${item.path}`}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className="text-[12px] font-medium text-[#526157] transition hover:text-[#078437]"
                  >
                    {index > 0 ? <span className="mr-4 text-[#c9d5cd]" aria-hidden>|</span> : null}
                    {item.label}
                  </UnifiedButton>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </footer>
  );
}
