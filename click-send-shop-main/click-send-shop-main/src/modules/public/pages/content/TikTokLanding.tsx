import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";

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
  label: string;
};

type AudienceCard = {
  title: string;
  text: string;
  icon: LucideIcon;
  image: string;
  tone: string;
};

const navItems: NavItem[] = [
  { label: "首页", target: "services" },
  { label: "服务分类", target: "services" },
  { label: "适合人群", target: "audiences" },
  { label: "使用流程", target: "flow" },
  { label: "联系我们", target: "contact" },
];

const stats = [
  { value: "6+", label: "热门服务分类", icon: Sparkles, tone: "text-[#008775] bg-[#e4f7f1]" },
  { value: "10+", label: "覆盖热门城市", icon: Building2, tone: "text-[#c47a08] bg-[#fff3df]" },
  { value: "100+", label: "生活办事场景", icon: ClipboardList, tone: "text-[#007f6d] bg-[#e8f8f4]" },
  { value: "华人用户", label: "常用入口", icon: Users, tone: "text-[#b76d00] bg-[#fff1da]" },
];

const serviceCards: ServiceCard[] = [
  {
    title: "找房安家",
    text: "租房、购房、家具家电、入住支持",
    icon: Home,
    tone: "bg-[#e6f7ed] text-[#078a58]",
    label: "1",
  },
  {
    title: "留学陪读",
    text: "学校申请、住宿安排、家属陪读信息",
    icon: GraduationCap,
    tone: "bg-[#eaf3ff] text-[#1d73c9]",
    label: "2",
  },
  {
    title: "签证咨询",
    text: "长期签、材料准备、常见问题整理",
    icon: ShieldCheck,
    tone: "bg-[#f0eafe] text-[#7251bd]",
    label: "3",
  },
  {
    title: "本地办事",
    text: "电话卡、缴费、交通、生活指南",
    icon: ClipboardList,
    tone: "bg-[#fff0dc] text-[#c97700]",
    label: "4",
  },
  {
    title: "维修搬家",
    text: "维修、安装、清洁、搬运等上门服务",
    icon: Wrench,
    tone: "bg-[#e3f6f2] text-[#008775]",
    label: "5",
  },
  {
    title: "商务资源",
    text: "店铺、办公室、供应链、本地合作资源",
    icon: BriefcaseBusiness,
    tone: "bg-[#fff2d9] text-[#b96d00]",
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
  { text: "不用再到处问人，入口更清晰，省了很多时间。", name: "留学生家长", city: "吉隆坡" },
  { text: "信息很全，服务分类清楚，第一次来马也不慌了。", name: "兼职创业", city: "上海" },
  { text: "找房、办卡、缴费都在这里，很方便，推荐给朋友了。", name: "长住居民", city: "槟城" },
];

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
    content: "大马通,TikTok,马来西亚生活服务,马来西亚找房,马来西亚留学,马来西亚签证",
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
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      >
        <img
          src={brandLogoSrc}
          alt="大马通"
          width={compact ? 36 : 44}
          height={compact ? 36 : 44}
          className="h-full w-full object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
      <span className="min-w-0">
        <span className={`${compact ? "text-sm" : "text-xl"} block truncate font-bold leading-tight text-[#075f57]`}>
          大马通
        </span>
        <span className={`${compact ? "text-[10px]" : "text-xs"} block truncate font-semibold leading-tight text-[#0b7c70]`}>
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
    <div className="mx-auto mb-6 max-w-3xl text-center">
      <div className="inline-flex items-center justify-center gap-2 text-[#008775]">
        {Icon ? <Icon size={22} strokeWidth={2.2} /> : null}
        <h2 className="text-2xl font-bold text-[#121816] sm:text-3xl">{title}</h2>
      </div>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-[#62706c] sm:text-base">{subtitle}</p> : null}
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
    <main className="min-h-screen overflow-x-hidden bg-[#f7fbfa] text-[#121816]">
      <header className="border-b border-[#dfe9e6] bg-white/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <BrandMark brandLogoSrc={brandLogoSrc} />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="TikTok 页面导航">
            {navItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={`text-sm font-semibold transition hover:text-[#007f6d] ${
                  index === 0 ? "border-b-2 border-[#007f6d] pb-1 text-[#007f6d]" : "text-[#44514e]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={openSupport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#008775] bg-white px-5 text-sm font-bold text-[#007f6d] transition hover:bg-[#effaf7]"
            >
              <MessageCircle size={17} />
              客服咨询
            </button>
            <button
              type="button"
              onClick={enterOfficialSite}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#007f6d] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,127,109,0.22)] transition hover:bg-[#006c5d]"
            >
              立即进入大马通
              <ArrowRight size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-[#dfe9e6] bg-white text-[#121816] lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="打开导航菜单"
          >
            <Menu size={27} />
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[#dfe9e6] bg-white px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
              {navItems.slice(1).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className="h-10 rounded-lg border border-[#dfe9e6] bg-[#f7fbfa] text-sm font-semibold text-[#34413e]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden border-b border-[#dfe9e6] bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_42%,rgba(255,255,255,0.34)_100%)]" />
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-70"
          loading="eager"
          decoding="async"
          {...({ fetchpriority: "high" } as Record<string, string>)}
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
          <div className="flex min-h-[520px] flex-col justify-center lg:min-h-[620px]">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c88a21] bg-white/86 px-4 py-2 text-sm font-semibold text-[#80500b] shadow-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#111] text-xs font-bold text-white">T</span>
              TikTok 用户专属入口
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black text-[#050907] sm:text-5xl lg:text-6xl" style={{ lineHeight: 1.18 }}>
              来马来西亚，
              <br />
              生活办事<span className="text-[#007f6d]">不用到处问</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-[#3f4c49] sm:text-lg">
              找房安家、留学陪读、签证咨询、本地服务、商务资源，一站式集中查看。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={enterOfficialSite}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[#008775] px-7 text-base font-bold text-white shadow-[0_18px_32px_rgba(0,127,109,0.25)] transition hover:bg-[#006f61]"
              >
                立即进入大马通
                <ArrowRight size={21} />
              </button>
              <button
                type="button"
                onClick={openSupport}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-[#008775] bg-white px-7 text-base font-bold text-[#007f6d] transition hover:bg-[#effaf7]"
              >
                <MessageCircle size={21} />
                联系客服
              </button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["中文沟通", "本地资源", "真实信息", "高频服务入口"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full border border-[#dfe9e6] bg-white/88 px-3 py-2 text-sm font-semibold text-[#34413e] shadow-sm">
                  <CheckCircle2 size={17} className="shrink-0 text-[#008775]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden items-center justify-end lg:flex">
            <div className="w-full max-w-[660px] rounded-lg border border-[#dfe9e6] bg-white p-4 shadow-[0_28px_80px_rgba(21,67,61,0.16)]">
              <div className="rounded-lg border border-[#e5eeeb] bg-[#f9fcfb] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <BrandMark brandLogoSrc={brandLogoSrc} compact />
                  <div className="flex h-9 flex-1 items-center gap-2 rounded-full border border-[#dfe9e6] bg-white px-3 text-xs text-[#84918e]">
                    <Search size={15} />
                    搜索服务、城市或关键词
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
                  <div className="space-y-2">
                    {["首页", "服务分类", "热门城市", "消息中心", "个人中心"].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                          index === 0 ? "bg-[#e8f7f3] text-[#007f6d]" : "text-[#64716e]"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4">
                    <div className="relative min-h-[210px] overflow-hidden rounded-lg bg-[#007f6d]">
                      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="eager" decoding="async" />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,111,97,0.88),rgba(0,111,97,0.12))]" />
                      <div className="relative max-w-[310px] p-7 text-white">
                        <p className="text-2xl font-black leading-tight">在马来西亚的生活更简单，更安心</p>
                        <button type="button" onClick={() => scrollToSection("services")} className="mt-5 rounded-full bg-[#008775] px-5 py-2 text-sm font-bold text-white">
                          探索服务
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {serviceCards.slice(0, 6).map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.title} className="rounded-lg border border-[#e5eeeb] bg-white p-3">
                            <span className={`mb-2 grid h-9 w-9 place-items-center rounded-lg ${item.tone}`}>
                              <Icon size={20} />
                            </span>
                            <p className="text-sm font-bold text-[#121816]">{item.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-lg border border-[#dfe9e6] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-4 border-[#dfe9e6] px-2 py-2 lg:border-r last:lg:border-r-0">
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                  <Icon size={28} />
                </span>
                <div>
                  <p className="text-3xl font-black leading-tight text-[#121816]">{item.value}</p>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#64716e]">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id={sectionIds.services} className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle icon={Sparkles} title="服务分类" subtitle="把高频问题拆成清晰入口，新用户不用到处问。" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="grid min-h-[132px] grid-cols-[72px_1fr] items-center gap-4 rounded-lg border border-[#dfe9e6] bg-white p-5 shadow-sm">
                  <span className={`grid h-16 w-16 place-items-center rounded-lg ${item.tone}`}>
                    <Icon size={34} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-[#121816]">
                      {item.label}. {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#4f5d59]">{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id={sectionIds.audiences} className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle icon={Users} title="适合这样的你" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="overflow-hidden rounded-lg border border-[#dfe9e6] bg-white shadow-sm">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover object-right" loading="lazy" decoding="async" />
                  </div>
                  <div className="flex min-h-[116px] gap-3 p-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                      <Icon size={24} />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#007f6d]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#4f5d59]">{item.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id={sectionIds.flow} className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="使用流程" />
          <div className="grid gap-4 rounded-lg border border-[#dfe9e6] bg-white p-4 shadow-sm md:grid-cols-3">
            {flowSteps.map((step, index) => (
              <article key={step.title} className="flex min-h-[118px] items-center gap-4 rounded-lg bg-[#f7fbfa] p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#008775] text-xl font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-black text-[#007f6d]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#4f5d59]">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="真实用户的声音" />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-lg border border-[#dfe9e6] bg-white p-5 shadow-sm">
                <div className="mb-3 flex gap-1 text-[#f4a51c]" aria-label="五星评价">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-[#26322f]">“{item.text}”</p>
                <p className="mt-4 text-sm font-semibold text-[#64716e]">
                  {item.name} · {item.city}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id={sectionIds.contact} className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-[#008775] bg-[#e9f8f4] md:grid-cols-[280px_1fr]">
          <img src={HERO_IMAGE} alt="" className="hidden h-full min-h-[190px] w-full object-cover md:block" loading="lazy" decoding="async" />
          <div className="flex flex-col items-center justify-between gap-5 p-6 text-center md:flex-row md:text-left lg:p-8">
            <div>
              <h2 className="text-3xl font-black leading-tight text-[#007064] sm:text-4xl">把高频问题，变成清晰入口</h2>
              <p className="mt-3 text-base leading-7 text-[#34413e]">
                现在进入大马通，快速查看适合你的马来西亚生活服务。
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={enterOfficialSite}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#008775] px-7 py-3 text-base font-bold text-white shadow-[0_18px_32px_rgba(0,127,109,0.25)] transition hover:bg-[#006f61]"
              >
                立即进入大马通
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={openSupport}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#008775] bg-white px-7 py-3 text-base font-bold text-[#007f6d] transition hover:bg-[#effaf7]"
              >
                <MessageCircle size={20} />
                客服咨询
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dfe9e6] bg-white px-4 py-8 sm:px-6 lg:px-8">
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
              <button type="button" onClick={openSupport} className="flex items-center gap-2 text-left font-semibold text-[#007f6d]">
                <MessageCircle size={18} />
                官方客服入口
              </button>
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
