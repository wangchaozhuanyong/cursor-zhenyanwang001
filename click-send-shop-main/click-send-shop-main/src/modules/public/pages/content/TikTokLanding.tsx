import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Flame,
  GraduationCap,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function withViteBase(path: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${String(path || "").replace(/^\//, "")}`;
}

const FALLBACK_LOGO_SRC = withViteBase("/assets/tiktok-logo.jpeg");
const HERO_IMAGE = withViteBase("/assets/tiktok-hero-platform.webp");
const STUDY_IMAGE = withViteBase("/assets/tiktok-hero-study.webp");
const SUPPORT_IMAGE = withViteBase("/assets/tiktok-hero-support.webp");
const OFFICIAL_TARGET = "/";
const SUPPORT_TARGET = "/support-download?tab=support";

const sectionIds = {
  services: "tiktok-services",
  audiences: "tiktok-audiences",
  flow: "tiktok-flow",
  contact: "tiktok-contact",
} as const;

type NavItem = {
  label: string;
  target: keyof typeof sectionIds;
};

type ServiceCard = {
  title: string;
  text: string;
  icon: LucideIcon;
  tone: string;
  softTone: string;
  label: string;
};

type AudienceCard = {
  title: string;
  text: string;
  icon: LucideIcon;
  image: string;
  tone: string;
};

type StatCard = {
  value: string;
  label: string;
  icon: LucideIcon;
  tone: string;
};

const navItems: NavItem[] = [
  { label: "首页", target: "services" },
  { label: "服务分类", target: "services" },
  { label: "热门城市", target: "audiences" },
  { label: "使用流程", target: "flow" },
  { label: "联系我们", target: "contact" },
];

const stats: StatCard[] = [
  { value: "6+", label: "服务分类", icon: Sparkles, tone: "text-[#008775] bg-[#e5f7f1]" },
  { value: "10+", label: "热门城市", icon: Building2, tone: "text-[#c87806] bg-[#fff2dc]" },
  { value: "100+", label: "服务场景", icon: ClipboardList, tone: "text-[#007f6d] bg-[#e8f8f4]" },
  { value: "华人用户", label: "常用入口", icon: Users, tone: "text-[#ba7100] bg-[#fff1da]" },
];

const serviceCards: ServiceCard[] = [
  {
    title: "找房安家",
    text: "租房、购房、家具家电、入住支持",
    icon: Home,
    tone: "bg-[#dff6eb] text-[#068255]",
    softTone: "bg-[#f3fbf7]",
    label: "1",
  },
  {
    title: "留学陪读",
    text: "学校申请、住宿安排、家属陪读信息",
    icon: GraduationCap,
    tone: "bg-[#e7f2ff] text-[#1d72c9]",
    softTone: "bg-[#f6faff]",
    label: "2",
  },
  {
    title: "签证咨询",
    text: "长期签、材料准备、常见问题整理",
    icon: ShieldCheck,
    tone: "bg-[#efe8ff] text-[#7052bd]",
    softTone: "bg-[#faf8ff]",
    label: "3",
  },
  {
    title: "本地办事",
    text: "电话卡、缴费、交通、生活指南",
    icon: ClipboardList,
    tone: "bg-[#fff0dc] text-[#c97700]",
    softTone: "bg-[#fffaf3]",
    label: "4",
  },
  {
    title: "维修搬家",
    text: "维修、安装、清洁、搬运等上门服务",
    icon: Wrench,
    tone: "bg-[#e2f6f2] text-[#008775]",
    softTone: "bg-[#f4fbf9]",
    label: "5",
  },
  {
    title: "商务资源",
    text: "店铺、办公室、供应链、本地合作资源",
    icon: BriefcaseBusiness,
    tone: "bg-[#fff2d9] text-[#b96d00]",
    softTone: "bg-[#fffaf0]",
    label: "6",
  },
];

const audiences: AudienceCard[] = [
  {
    title: "初到马来",
    text: "刚落地，需要快速了解与解决问题",
    icon: MapPin,
    image: HERO_IMAGE,
    tone: "text-[#007f6d] bg-[#e5f8f3]",
  },
  {
    title: "留学家庭",
    text: "孩子留学、家长陪读、生活更安心",
    icon: Users,
    image: STUDY_IMAGE,
    tone: "text-[#1976cf] bg-[#eaf3ff]",
  },
  {
    title: "长期生活",
    text: "长期居住，日常生活更省心",
    icon: Home,
    image: HERO_IMAGE,
    tone: "text-[#0b8d58] bg-[#e8f7ec]",
  },
  {
    title: "创业与商务",
    text: "拓展业务，寻找本地资源与合作",
    icon: BriefcaseBusiness,
    image: SUPPORT_IMAGE,
    tone: "text-[#b96d00] bg-[#fff2db]",
  },
];

const flowSteps = [
  { title: "先看分类", text: "浏览服务分类，找到你需要的类型" },
  { title: "选择需求", text: "查看详情与资源，对比后选择合适服务" },
  { title: "进入平台或联系顾问", text: "一键进入大马通平台，或联系专属顾问协助" },
];

const testimonials = [
  { text: "不用再到处问人，入口更清晰，省了很多时间！", name: "留学生家长", city: "吉隆坡" },
  { text: "信息很全，服务分类清楚，第一次来马也不慌了。", name: "兼职创业", city: "上海" },
  { text: "找房、办卡、缴费都在这里，很方便，推荐给朋友了！", name: "长住居民", city: "槟城" },
];

const featureChips = ["中文沟通", "本地资源", "真实信息", "高频服务入口"];

function readHeadMeta(selector: string): string {
  if (typeof document === "undefined") return "";
  return document.head.querySelector<HTMLMetaElement>(selector)?.content?.trim() || "";
}

function isCrawlerSafeBrandImage(value: string): boolean {
  const clean = value.trim();
  if (!clean) return false;
  if (/^data:image\//i.test(clean)) return true;

  try {
    const url = new URL(clean, window.location.origin);
    if (url.hostname !== window.location.hostname) return true;
    return url.pathname.startsWith("/assets/tiktok-");
  } catch {
    return false;
  }
}

function resolveInitialBrandLogo() {
  const candidate = readHeadMeta("meta[property='og:image']") || readHeadMeta("meta[name='twitter:image']");
  return isCrawlerSafeBrandImage(candidate) ? candidate : FALLBACK_LOGO_SRC;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    document.head.appendChild(meta);
  }
  Object.entries(attributes).forEach(([key, value]) => meta.setAttribute(key, value));
}

function syncTikTokHead(brandLogoSrc: string) {
  const title = "大马通 TikTok 用户入口 | 马来西亚生活服务导航";
  const description = "从 TikTok 来到大马通，快速查看找房安家、留学陪读、签证咨询、本地办事、维修搬家和商务资源。";

  document.title = title;

  document.head.querySelectorAll<HTMLLinkElement>("link[rel='canonical']").forEach((el) => el.remove());
  document.head
    .querySelectorAll<HTMLMetaElement>(
      "meta[property^='og:'], meta[name^='twitter:'], meta[name='keywords'], meta[name='google-site-verification']",
    )
    .forEach((el) => el.remove());

  let robots = document.head.querySelector<HTMLMetaElement>("meta[name='robots']");
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }
  robots.content = "index,nofollow";

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = new URL("/tiktok", window.location.origin).href;
  document.head.appendChild(canonical);

  upsertMeta("meta[name='description']", { name: "description", content: description });
  upsertMeta("meta[name='keywords']", {
    name: "keywords",
    content: "大马通 TikTok,马来西亚生活服务,马来西亚找房,马来西亚留学,马来西亚签证",
  });
  upsertMeta("meta[property='og:title']", { property: "og:title", content: title });
  upsertMeta("meta[property='og:description']", { property: "og:description", content: description });
  upsertMeta("meta[property='og:image']", { property: "og:image", content: brandLogoSrc });
  upsertMeta("meta[property='og:type']", { property: "og:type", content: "website" });
  upsertMeta("meta[property='og:url']", { property: "og:url", content: canonical.href });
  upsertMeta("meta[name='twitter:card']", { name: "twitter:card", content: "summary_large_image" });
  upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: title });
  upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: description });
  upsertMeta("meta[name='twitter:image']", { name: "twitter:image", content: brandLogoSrc });

  document
    .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
    .forEach((el) => el.remove());

  [
    { rel: "icon", href: brandLogoSrc },
    { rel: "shortcut icon", href: brandLogoSrc },
  ].forEach(({ rel, href }) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  });
}

function BrandMark({ brandLogoSrc, compact = false }: { brandLogoSrc: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="大马通">
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-[#d9ece8] bg-white shadow-sm ${
          compact ? "h-8 w-8" : "h-10 w-10 sm:h-11 sm:w-11"
        }`}
      >
        <img
          src={brandLogoSrc}
          alt="大马通"
          width={compact ? 32 : 44}
          height={compact ? 32 : 44}
          className="h-full w-full object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
      <span className="min-w-0">
        <span className={`${compact ? "text-sm" : "text-xl sm:text-2xl"} block truncate font-black leading-tight text-[#075f57]`}>
          大马通
        </span>
        <span className={`${compact ? "text-[10px]" : "text-[11px] sm:text-xs"} block truncate font-bold leading-tight text-[#0b7c70]`}>
          Damatong.net
        </span>
      </span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-5 max-w-3xl text-center sm:mb-7">
      <div className="inline-flex items-center justify-center gap-2 text-[#008775]">
        {Icon ? <Icon size={21} strokeWidth={2.4} /> : null}
        <h2 className="text-[22px] font-black leading-tight text-[#111816] sm:text-3xl">{title}</h2>
      </div>
      {subtitle ? <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#62706c] sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

function TikTokBadge() {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#bf811e] bg-white px-3.5 py-2 text-[13px] font-bold text-[#80500b] shadow-[0_8px_24px_rgba(112,78,23,0.08)] sm:px-4 sm:text-sm">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#111] text-[13px] font-black text-white">♪</span>
      TikTok 用户专属入口
    </div>
  );
}

function PlatformPreview({ brandLogoSrc }: { brandLogoSrc: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[430px] lg:max-w-[660px]">
      <div className="absolute -right-9 top-16 hidden h-56 w-56 rounded-full bg-[#9bd2c8] opacity-80 sm:block lg:-right-16 lg:top-28 lg:h-72 lg:w-72" />
      <div className="relative rounded-[28px] border border-[#e9efee] bg-white p-2.5 shadow-[0_22px_60px_rgba(24,67,61,0.14)] sm:p-3 lg:rounded-[24px] lg:p-4">
        <div className="rounded-[22px] border border-[#e7efec] bg-[#fbfefd] p-3 lg:rounded-lg lg:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <BrandMark brandLogoSrc={brandLogoSrc} compact />
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#dfe9e6] bg-white text-[#64716e] lg:hidden">
              <Search size={18} />
            </div>
            <div className="hidden h-9 flex-1 items-center gap-2 rounded-full border border-[#dfe9e6] bg-white px-3 text-xs text-[#84918e] lg:flex">
              <Search size={15} />
              搜索服务、城市或关键词
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[116px_1fr] lg:gap-4">
            <div className="hidden space-y-2 lg:block">
              {["首页", "服务分类", "热门城市", "我的收藏", "消息中心", "个人中心"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold ${
                    index === 0 ? "bg-[#e8f7f3] text-[#007f6d]" : "text-[#64716e]"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="relative min-h-[145px] overflow-hidden rounded-lg bg-[#007f6d] sm:min-h-[175px] lg:min-h-[210px]">
                <img
                  src={HERO_IMAGE}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-right opacity-90"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,111,97,0.9),rgba(0,111,97,0.12))]" />
                <div className="relative max-w-[250px] p-4 text-white sm:p-5 lg:max-w-[330px] lg:p-7">
                  <p className="text-xl font-black leading-snug sm:text-2xl">在马来西亚的生活更简单，更安心</p>
                  <UnifiedButton
                    type="button"
                    className="mt-4 rounded-full bg-[#008775] px-4 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(0,91,78,0.24)] sm:text-sm"
                  >
                    探索服务
                  </UnifiedButton>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {serviceCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="min-h-[72px] rounded-lg border border-[#e6eeeb] bg-white p-2 shadow-sm sm:min-h-[84px] sm:p-3">
                      <span className={`mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-lg ${item.tone} sm:h-10 sm:w-10`}>
                        <Icon size={20} />
                      </span>
                      <p className="truncate text-center text-[11px] font-black text-[#121816] sm:text-xs">{item.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TikTokLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const brandLogoSrc = useMemo(resolveInitialBrandLogo, []);

  useEffect(() => {
    syncTikTokHead(brandLogoSrc);
  }, [brandLogoSrc]);

  const enterOfficialSite = () => {
    window.location.assign(OFFICIAL_TARGET);
  };

  const openSupport = () => {
    window.location.assign(SUPPORT_TARGET);
  };

  const scrollToSection = (target: keyof typeof sectionIds) => {
    document.getElementById(sectionIds[target])?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fbfa] text-[#121816]">
      <header className="border-b border-[#e0ebe8] bg-white/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:h-20 lg:px-8">
          <BrandMark brandLogoSrc={brandLogoSrc} />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="TikTok 页面导航">
            {navItems.map((item, index) => (
              <UnifiedButton
                key={item.label}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={`text-sm font-bold transition hover:text-[#007f6d] ${
                  index === 0 ? "border-b-2 border-[#007f6d] pb-1 text-[#007f6d]" : "text-[#44514e]"
                }`}
              >
                {item.label}
              </UnifiedButton>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <UnifiedButton
              type="button"
              onClick={openSupport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#008775] bg-white px-5 text-sm font-black text-[#007f6d] transition hover:bg-[#effaf7]"
            >
              <MessageCircle size={17} />
              客服咨询
            </UnifiedButton>
            <UnifiedButton
              type="button"
              onClick={enterOfficialSite}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#007f6d] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(0,127,109,0.22)] transition hover:bg-[#006c5d]"
            >
              立即进入大马通
              <ArrowRight size={17} />
            </UnifiedButton>
          </div>

          <UnifiedButton
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[#101614] lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="打开导航菜单"
          >
            <Menu size={30} strokeWidth={2.6} />
          </UnifiedButton>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[#e0ebe8] bg-white px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
              {navItems.slice(1).map((item) => (
                <UnifiedButton
                  key={item.label}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className="h-10 rounded-lg border border-[#dfe9e6] bg-[#f7fbfa] text-sm font-bold text-[#34413e]"
                >
                  {item.label}
                </UnifiedButton>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden border-b border-[#e0ebe8] bg-white">
        <div className="absolute -left-32 top-28 h-64 w-64 rounded-full border border-[#d8efea] bg-[#effaf7]" />
        <div className="absolute -right-36 top-48 h-80 w-80 rounded-full bg-[#9bd2c8] opacity-80 sm:-right-24 lg:top-44 lg:h-[420px] lg:w-[420px]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-8 pt-8 sm:px-6 sm:pb-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8 lg:py-14">
          <div className="flex min-h-[360px] flex-col justify-center sm:min-h-[420px] lg:min-h-[620px]">
            <TikTokBadge />

            <h1 className="mt-5 max-w-[680px] text-[34px] font-black tracking-normal text-[#050907] min-[390px]:text-[36px] sm:text-5xl lg:text-6xl" style={{ lineHeight: 1.1 }}>
              来马来西亚，
              <br />
              生活办事<span className="text-[#007f6d]">不用到处问</span>
            </h1>

            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#3f4c49] sm:text-lg sm:leading-8">
              找房安家、留学陪读、签证咨询、本地服务、商务资源，一站式集中查看。
            </p>

            <div className="mt-6 grid grid-cols-[1fr_0.9fr] gap-3 sm:flex sm:flex-wrap">
              <UnifiedButton
                type="button"
                onClick={enterOfficialSite}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#008775] px-4 text-sm font-black text-white shadow-[0_16px_30px_rgba(0,127,109,0.26)] transition hover:bg-[#006f61] sm:min-w-[220px] sm:px-7 sm:text-base"
              >
                立即进入大马通
                <ArrowRight size={18} />
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={openSupport}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#008775] bg-white px-4 text-sm font-black text-[#007f6d] transition hover:bg-[#effaf7] sm:min-w-[180px] sm:px-7 sm:text-base"
              >
                <MessageCircle size={18} />
                联系客服
              </UnifiedButton>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {featureChips.map((item) => (
                <div key={item} className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#dfe9e6] bg-white/90 px-3 text-xs font-bold text-[#34413e] shadow-sm sm:text-sm">
                  <CheckCircle2 size={16} className="shrink-0 text-[#008775]" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <PlatformPreview brandLogoSrc={brandLogoSrc} />
          </div>
        </div>
      </section>

      <section className="px-5 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#dfe9e6] bg-[#dfe9e6] shadow-[0_14px_40px_rgba(22,64,58,0.08)] sm:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex min-h-[92px] items-center gap-3 bg-white px-4 py-4 sm:min-h-[104px] sm:justify-center sm:gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${item.tone} sm:h-14 sm:w-14`}>
                  <Icon size={26} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black leading-tight text-[#121816] sm:text-3xl">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#64716e] sm:text-sm">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id={sectionIds.services} className="px-5 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle icon={Flame} title="热门服务分类" subtitle="把高频问题拆成清晰入口，新用户不用到处问。" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {serviceCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`grid min-h-[116px] grid-cols-[64px_1fr] items-center gap-4 rounded-lg border border-[#dfe9e6] ${item.softTone} p-4 shadow-sm sm:min-h-[132px] sm:grid-cols-[76px_1fr] sm:p-5`}
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-full ${item.tone} sm:h-16 sm:w-16`}>
                    <Icon size={31} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-[#121816] sm:text-lg">
                      {item.label}. {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4f5d59]">{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id={sectionIds.audiences} className="px-5 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle icon={Users} title="适合这样的你" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {audiences.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="overflow-hidden rounded-lg border border-[#dfe9e6] bg-white shadow-sm">
                  <div className="aspect-[16/8.5] overflow-hidden">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover object-right" loading="lazy" decoding="async" />
                  </div>
                  <div className="flex min-h-[108px] gap-3 p-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${item.tone}`}>
                      <Icon size={24} />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-[#007f6d] sm:text-lg">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#4f5d59]">{item.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id={sectionIds.flow} className="px-5 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="3 步开始使用" />
          <div className="grid gap-3 rounded-lg border border-[#dfe9e6] bg-white p-3 shadow-sm md:grid-cols-3 md:gap-0">
            {flowSteps.map((step, index) => (
              <article key={step.title} className="relative flex min-h-[106px] items-center gap-4 rounded-lg bg-[#f4fbf9] p-4 md:rounded-none md:bg-white">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#008775] text-xl font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-black text-[#007f6d]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#4f5d59]">{step.text}</p>
                </div>
                {index < flowSteps.length - 1 ? (
                  <ArrowRight className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-[#a5b2af] md:block" size={26} />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="真实用户反馈" />
          <div className="grid gap-3 md:grid-cols-3 lg:gap-4">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-lg border border-[#dfe9e6] bg-white p-5 shadow-sm">
                <Quote className="mb-3 text-[#008775]" size={24} fill="currentColor" />
                <p className="text-sm leading-7 text-[#26322f]">{item.text}</p>
                <div className="mt-4 flex gap-1 text-[#f4a51c]" aria-label="五星评价">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold text-[#64716e]">
                  {item.name} · {item.city}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id={sectionIds.contact} className="px-5 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-[#008775] bg-[#e9f8f4] shadow-[0_18px_44px_rgba(0,127,109,0.12)] md:grid-cols-[280px_1fr]">
          <img src={HERO_IMAGE} alt="" className="hidden h-full min-h-[190px] w-full object-cover md:block" loading="lazy" decoding="async" />
          <div className="flex flex-col items-center justify-between gap-5 p-5 text-center sm:p-6 md:flex-row md:text-left lg:p-8">
            <div>
              <h2 className="text-[28px] font-black leading-tight text-[#007064] sm:text-4xl">把高频问题，变成清晰入口</h2>
              <p className="mt-3 text-sm leading-7 text-[#34413e] sm:text-base">
                现在进入大马通，快速查看适合你的马来西亚生活服务。
              </p>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              <UnifiedButton
                type="button"
                onClick={enterOfficialSite}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#008775] px-6 py-3 text-sm font-black text-white shadow-[0_18px_32px_rgba(0,127,109,0.25)] transition hover:bg-[#006f61] sm:text-base"
              >
                立即进入大马通
                <ArrowRight size={20} />
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={openSupport}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#008775] bg-white px-6 py-3 text-sm font-black text-[#007f6d] transition hover:bg-[#effaf7] sm:text-base"
              >
                <MessageCircle size={20} />
                WhatsApp 咨询
              </UnifiedButton>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dfe9e6] bg-white px-5 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.15fr_0.85fr_0.85fr_1fr]">
          <div>
            <BrandMark brandLogoSrc={brandLogoSrc} />
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#64716e]">
              面向在马来西亚生活、留学、工作和创业的中文用户，集中整理常用服务入口。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black text-[#121816]">平台服务</h3>
            <div className="mt-3 grid gap-2 text-sm text-[#64716e]">
              <span>服务分类</span>
              <span>热门城市</span>
              <span>使用流程</span>
              <span>帮助中心</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-[#121816]">热门分类</h3>
            <div className="mt-3 grid gap-2 text-sm text-[#64716e]">
              <span>找房安家</span>
              <span>留学陪读</span>
              <span>签证咨询</span>
              <span>商务资源</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-[#121816]">联系方式</h3>
            <div className="mt-3 grid gap-3 text-sm text-[#64716e]">
              <UnifiedButton type="button" onClick={openSupport} className="flex items-center gap-2 text-left font-semibold text-[#007f6d]">
                <MessageCircle size={18} />
                官方客服入口
              </UnifiedButton>
              <span className="flex items-center gap-2">
                <Mail size={18} />
                邮箱与服务时间以客服页为准
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck size={18} />
                当前入口仅用于 TikTok 落地页
              </span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-[#dfe9e6] pt-5 text-center text-xs text-[#84918e]">
          © 2025 大马通 Damatong.net · 保留所有权利
        </div>
      </footer>
    </main>
  );
}
