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
} from "lucide-react";
import type { FooterNavItem, SupportDownloadChannel } from "@/types/content";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";

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

export function GuestFooterBrandMark({ siteName }: { siteName: string }) {
  const base = resolveFooterBrand(siteName);
  return (
    <div className="flex items-center justify-start gap-4 text-left">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#df4f55]/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,230,226,0.86))] text-[#d8474f] shadow-[0_18px_34px_-28px_rgba(139,48,48,0.65),inset_0_0_0_6px_rgba(255,255,255,0.7)]">
        <Sparkles size={27} strokeWidth={1.7} />
      </span>
      <span className="min-w-0">
        <span className="block max-w-[min(17rem,70vw)] font-display text-[36px] font-bold leading-none text-[#2a1714] sm:max-w-none sm:text-[42px]">
          {base}
          <span className="text-[#d8474f]">.</span>
        </span>
        <span className="mt-2 block text-[13px] font-semibold uppercase leading-none text-[#ad772e]">
          Curated in Malaysia
        </span>
      </span>
    </div>
  );
}

function FooterSkylineArt() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-6 hidden h-44 w-[420px] text-[#d8a973] opacity-[0.28] md:block"
      viewBox="0 0 420 176"
      fill="none"
      aria-hidden
    >
      <path d="M10 142H410" stroke="currentColor" strokeWidth="1.4" />
      <path d="M50 142V104H77V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M92 142V82H116V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M104 82C104 63 122 54 138 54C154 54 172 63 172 82V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M132 142V94H144V142" stroke="currentColor" strokeWidth="1.2" />
      <path d="M190 142V56M190 56L198 46L206 56V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M214 142V36M214 36L224 20L234 36V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M214 56H234M214 76H234M214 96H234M214 116H234" stroke="currentColor" strokeWidth="1" />
      <path d="M248 142V32M248 32L258 16L268 32V142" stroke="currentColor" strokeWidth="1.4" />
      <path d="M248 56H268M248 76H268M248 96H268M248 116H268" stroke="currentColor" strokeWidth="1" />
      <path d="M234 82H248" stroke="currentColor" strokeWidth="1.2" />
      <path d="M292 142V78H318V142M305 78V52" stroke="currentColor" strokeWidth="1.4" />
      <path d="M334 142V95H358V142M346 95V66" stroke="currentColor" strokeWidth="1.4" />
      <path d="M374 142V106H398V142" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function FooterLeafArt() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-0 h-28 w-32 text-[#e1aaa2] opacity-[0.28]"
      viewBox="0 0 140 110"
      fill="none"
      aria-hidden
    >
      <path d="M132 6C101 23 84 52 76 103" stroke="currentColor" strokeWidth="1.2" />
      <path d="M119 16C96 15 84 25 78 45C99 45 113 34 119 16Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M100 41C78 39 65 50 59 70C81 69 94 60 100 41Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M85 70C63 67 49 77 41 96C63 98 78 89 85 70Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function FooterSectionTitle({
  aside,
  eyebrow,
  title,
}: {
  aside?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="shrink-0 text-left">
        {eyebrow ? (
          <p className="mb-1 text-[13px] font-semibold uppercase leading-none text-[#b47b32]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="font-display text-[30px] font-bold leading-tight text-[#2a1714]">
          {title}
        </h3>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 pb-2">
        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(196,152,91,0.16),rgba(196,152,91,0.58))]" />
        <Sparkles size={14} strokeWidth={1.6} className="shrink-0 text-[#c49555]" aria-hidden />
        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(196,152,91,0.58),rgba(196,152,91,0.16))]" />
      </div>
      {aside ? (
        <p className="shrink-0 pb-1 text-left text-[14px] font-medium text-[#c08757] sm:text-right">
          {aside}
        </p>
      ) : null}
    </div>
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
    <div className="overflow-hidden rounded-[1.25rem] border border-[#ead8c7] bg-white/74 shadow-[0_18px_46px_-40px_rgba(92,52,24,0.5)]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex min-h-[72px] w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/54 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c79c5d]/35"
        aria-expanded={isOpen}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[#b57628]">
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-[20px] font-bold leading-snug text-[#2a1714]">
          {title}
        </span>
        <ChevronDown
          size={23}
          strokeWidth={2.1}
          className={cn("shrink-0 text-[#a2661f] transition-transform duration-300 ease-out", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          {isOpen ? <div className="px-4 pb-5">{children}</div> : null}
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
      className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-[0.9rem] px-4 py-2.5 text-left text-[15px] font-medium text-[#6b5148] transition-all hover:bg-[#fff8ef] hover:text-[#8b541c] active:scale-[0.98]"
    >
      <span className="min-w-0 truncate">{item.label}</span>
      <ChevronRight size={16} className="shrink-0 opacity-45 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
    </button>
  );
}

function ContactCard({
  icon,
  label,
  value,
  wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return (
    <div
      className={cn(
        "relative flex min-h-[106px] items-center gap-5 overflow-hidden rounded-[1.2rem] border border-[#ead8c7] bg-white/72 px-5 py-4 text-left shadow-[0_20px_48px_-42px_rgba(83,49,29,0.58)]",
        wide && "sm:col-span-2",
      )}
    >
      {wide ? (
        <MapPin
          size={96}
          strokeWidth={1.1}
          className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 text-[#e5b9a5] opacity-25 sm:block"
          aria-hidden
        />
      ) : null}
      <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff6f4_0%,#ffdedd_56%,#f7c3c2_100%)] text-[#d64a51] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {icon}
      </span>
      <span className="relative z-10 min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-none text-[#765a51]">{label}</span>
        <span className="mt-2 block max-w-full text-[18px] font-bold leading-snug text-[#241716] [overflow-wrap:anywhere]">
          {lines.length > 1
            ? lines.map((line, index) => (
              <span key={`${line}-${index}`} className="block">
                {line}
              </span>
            ))
            : value}
        </span>
      </span>
    </div>
  );
}

function getChannelLabel(type: SupportDownloadChannel["type"]) {
  if (type === "wechat") return "微信客服";
  if (type === "whatsapp") return "WhatsApp 客服";
  return "Telegram 客服";
}

function getChannelIcon(type: SupportDownloadChannel["type"]) {
  if (type === "telegram") return <Send size={23} strokeWidth={1.9} />;
  if (type === "whatsapp") return <MessageCircle size={24} strokeWidth={1.9} />;
  return <MessageCircle size={24} strokeWidth={1.9} />;
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
    <button
      type="button"
      onClick={() => onClick(channel)}
      className="flex min-h-[58px] min-w-0 items-center justify-center gap-3 rounded-[1.05rem] border border-[#d7ac73] bg-white/74 px-5 py-3 text-[17px] font-medium text-[#2c201d] shadow-[0_16px_34px_-34px_rgba(105,62,27,0.7)] transition-all hover:-translate-y-0.5 hover:bg-white hover:text-[#8b541c] active:scale-[0.98]"
    >
      <span className="shrink-0 text-[#b9833f]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
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
  footerCompanyName,
  footerCopyright,
  footerIcpNo,
  onNavigate,
}: GuestMobileFooterProps) {
  const siteInfo = useSiteInfo();
  const { buildSupportPageUrl, channels, openChannel, workingHours: serviceHours } = useSupportRuntime();
  const brandName = resolveFooterBrand(siteName || siteInfo.siteName || FOOTER_BRAND_FALLBACK);
  const headline = resolveFooterCopy(slogan, FOOTER_HEADLINE_FALLBACK, ["官方商品与服务平台"]);
  const intro = resolveFooterCopy(description, FOOTER_DESCRIPTION_FALLBACK, ["本平台提供商品、服务与客户支持信息。"]);

  const whatsappDisplay = channels.find((channel) => channel.type === "whatsapp")?.account?.trim();
  const displayPhone = cleanFooterText(contactPhone) || "+60182778801";
  const displayEmail = cleanFooterText(contactEmail) || "ppfzj1314@gmail.com";
  const displayWhatsapp = whatsappDisplay || "5325325235";
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
    { key: "phone", label: "客服热线", value: displayPhone, icon: <Phone size={28} strokeWidth={1.75} /> },
    { key: "email", label: "电子邮箱", value: displayEmail, icon: <Mail size={29} strokeWidth={1.75} /> },
    { key: "whatsapp", label: "WhatsApp", value: displayWhatsapp, icon: <MessageCircle size={30} strokeWidth={1.75} /> },
    { key: "hours", label: "服务时间", value: displayHours, icon: <Clock3 size={29} strokeWidth={1.75} /> },
    { key: "address", label: "公司地址", value: displayAddress, icon: <MapPin size={30} strokeWidth={1.75} />, wide: true },
  ];

  const supportLinks = (
    <ul className="space-y-1.5">
      {supportNav.map((item, idx) => (
        <li key={`${item.label}-${item.path}-${idx}`}>
          <FooterNavButton item={item} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  const policyLinks = (
    <ul className="space-y-1.5">
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
    <footer className="relative isolate z-0 w-full touch-pan-y">
      <div className="relative overflow-hidden touch-pan-y border-t border-[#eadbcc] bg-[linear-gradient(180deg,#fffaf3_0%,#fffdf8_36%,#fff8f3_100%)] px-5 pb-8 pt-12 sm:border sm:px-8 sm:pt-14 md:pb-10 lg:px-12 lg:pb-12">
        <FooterSkylineArt />
        <FooterLeafArt />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(199,151,86,0.48),rgba(216,75,81,0.22),transparent)]" />

        <div className="relative mx-auto max-w-[940px]">
          <section className="text-left">
            <GuestFooterBrandMark siteName={brandName} />
            <div className="mt-10 space-y-6">
              <h2 className="font-display text-[28px] font-bold leading-snug text-[#2a1714] sm:text-[36px]">
                {headline}
              </h2>
              <p className="max-w-[830px] text-[18px] font-medium leading-[1.95] text-[#765a51]">
                {intro}
              </p>
            </div>
          </section>

          <section className="mt-10 space-y-5">
            <AccordionItem title="服务支持" icon={<Headphones size={27} strokeWidth={1.8} />}>
              {supportLinks}
            </AccordionItem>
            <AccordionItem title="政策与说明" icon={<ShieldCheck size={27} strokeWidth={1.8} />}>
              {policyLinks}
            </AccordionItem>
          </section>

          <section className="mt-12" aria-label="联系方式">
            <FooterSectionTitle eyebrow="Concierge" title="联系我们" aside="随时为您服务 ♡" />
            <div className="grid gap-5 sm:grid-cols-2">
              {contactItems.map((item) => (
                <ContactCard
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  wide={item.wide}
                />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <FooterSectionTitle title="关注我们" />
            <div className="grid gap-5 sm:grid-cols-3">
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
          </section>

          {legalParts.length > 0 ? (
            <section className="mt-12 border-t border-[#ead8c7] pt-6">
              <div className="flex flex-col gap-2 text-[14px] leading-6 text-[#9b8b83] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
                {legalParts.map((item, index) => (
                  <span key={`${item}-${index}`} className="flex items-center gap-5">
                    {index > 0 ? <span className="hidden h-4 w-px bg-[#d8c4b4] sm:block" aria-hidden /> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
