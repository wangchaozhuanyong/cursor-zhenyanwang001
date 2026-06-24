import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  GraduationCap,
  Grid2X2,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";
import { markStoreSpaReady } from "@/lib/pwaOfflineNavigation";

function withViteBase(path: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${String(path || "").replace(/^\//, "")}`;
}

const FALLBACK_LOGO_SRC = withViteBase("/assets/tiktok-logo.jpeg");
const OFFICIAL_TARGET = "/";
const SUPPORT_TARGET = "/support-download?tab=support";

type ServiceEntry = {
  id: string;
  title: string;
  text: string;
  icon: LucideIcon;
  target: string;
  keywords: string[];
};

type CityEntry = {
  city: string;
  state: string;
  text: string;
  target: string;
};

const services: ServiceEntry[] = [
  {
    id: "home",
    title: "找房安家",
    text: "租房、家电、入住准备",
    icon: Home,
    target: "/search?keyword=%E6%89%BE%E6%88%BF",
    keywords: ["房", "租房", "安家", "家具", "家电"],
  },
  {
    id: "study",
    title: "留学陪读",
    text: "学校、住宿、陪读信息",
    icon: GraduationCap,
    target: "/search?keyword=%E7%95%99%E5%AD%A6",
    keywords: ["留学", "陪读", "学校", "住宿"],
  },
  {
    id: "visa",
    title: "签证咨询",
    text: "材料、长期签、常见问题",
    icon: ShieldCheck,
    target: "/help",
    keywords: ["签证", "材料", "长期签", "咨询"],
  },
  {
    id: "local",
    title: "本地办事",
    text: "电话卡、缴费、交通指南",
    icon: ClipboardList,
    target: "/delivery",
    keywords: ["电话卡", "缴费", "交通", "本地"],
  },
  {
    id: "repair",
    title: "维修搬家",
    text: "维修、清洁、安装、搬运",
    icon: Wrench,
    target: "/support-download?tab=support",
    keywords: ["维修", "搬家", "清洁", "安装"],
  },
  {
    id: "business",
    title: "商务资源",
    text: "办公室、店铺、本地合作",
    icon: BriefcaseBusiness,
    target: "/about",
    keywords: ["商务", "办公室", "店铺", "合作"],
  },
];

const cities: CityEntry[] = [
  { city: "Kuala Lumpur", state: "吉隆坡", text: "找房、办事、商务资源集中", target: "/search?keyword=Kuala%20Lumpur" },
  { city: "Johor Bahru", state: "新山", text: "生活服务与跨境通勤", target: "/search?keyword=Johor%20Bahru" },
  { city: "Penang", state: "槟城", text: "留学、长住与本地生活", target: "/search?keyword=Penang" },
];

const bottomNav = [
  { label: "首页", icon: Home, target: OFFICIAL_TARGET },
  { label: "服务", icon: Grid2X2, target: "#services" },
  { label: "城市", icon: MapPin, target: "#cities" },
  { label: "收藏", icon: Heart, target: "/favorites" },
  { label: "我的", icon: UserRound, target: "/profile" },
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
  const title = "大马通 | 马来西亚生活服务导航";
  const description = "在大马通快速查看找房安家、留学陪读、签证咨询、本地办事、维修搬家和商务资源。";

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
    content: "大马通,马来西亚生活服务,马来西亚找房,马来西亚留学,马来西亚签证",
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
}

function openPath(target: string) {
  if (target.startsWith("#")) {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.assign(target);
}

function searchTarget(query: string) {
  const cleaned = query.trim();
  return cleaned ? `/search?keyword=${encodeURIComponent(cleaned)}` : "/search";
}

function BrandMark({ brandLogoSrc }: { brandLogoSrc: string }) {
  return (
    <div className="tiktok-v2-brand" aria-label="大马通">
      <span className="tiktok-v2-brand__logo">
        <StableImage
          src={brandLogoSrc}
          alt="大马通"
          width={36}
          height={36}
          className="h-full w-full object-contain"
          imgClassName="object-contain"
          loading="eager"
          fetchPriority="high"
          objectFit="contain"
        />
      </span>
      <span className="tiktok-v2-brand__copy">
        <strong>大马通</strong>
        <small>Damatong.net</small>
      </span>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceEntry }) {
  const Icon = service.icon;
  return (
    <article className="tiktok-v2-service-card">
      <button type="button" onClick={() => openPath(service.target)} className="tiktok-v2-service-card__button">
        <span className="tiktok-v2-service-card__icon">
          <Icon size={20} aria-hidden />
        </span>
        <span className="tiktok-v2-service-card__body">
          <strong>{service.title}</strong>
          <small>{service.text}</small>
        </span>
      </button>
    </article>
  );
}

export default function TikTokLanding() {
  const [query, setQuery] = useState("");
  const brandLogoSrc = useMemo(resolveInitialBrandLogo, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-app-scope", "store");
    root.setAttribute("data-storefront-ui", "next");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "store" } }));
  }, []);

  useEffect(() => {
    syncTikTokHead(brandLogoSrc);
    markStoreSpaReady();
  }, [brandLogoSrc]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchedServices = useMemo(() => {
    if (!normalizedQuery) return services;
    return services.filter((service) => {
      const content = [service.title, service.text, ...service.keywords].join(" ").toLowerCase();
      return content.includes(normalizedQuery);
    });
  }, [normalizedQuery]);
  const matchedCities = useMemo(() => {
    if (!normalizedQuery) return cities;
    return cities.filter((city) => `${city.city} ${city.state} ${city.text}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);
  const hasResults = matchedServices.length > 0 || matchedCities.length > 0;

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(OFFICIAL_TARGET);
  };

  const submitSearch = () => {
    openPath(searchTarget(query));
  };

  return (
    <main className="tiktok-v2-page">
      <header className="tiktok-v2-header">
        <button type="button" className="tiktok-v2-icon-button" aria-label="返回" onClick={goBack}>
          <ArrowLeft size={22} aria-hidden />
        </button>
        <BrandMark brandLogoSrc={brandLogoSrc} />
        <button type="button" className="tiktok-v2-icon-button" aria-label="联系客服" onClick={() => openPath(SUPPORT_TARGET)}>
          <MessageCircle size={21} aria-hidden />
        </button>
      </header>

      <form
        className="tiktok-v2-search"
        aria-label="服务搜索"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <div className="tiktok-v2-search__field">
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索服务、城市或关键词"
            type="text"
            inputMode="search"
          />
          {query ? (
            <button type="button" aria-label="清空搜索" onClick={() => setQuery("")}>
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      </form>

      {normalizedQuery ? (
        <section className="tiktok-v2-suggestions" aria-live="polite">
          {hasResults ? (
            <>
              {matchedServices.slice(0, 3).map((service) => (
                <button key={service.id} type="button" onClick={() => openPath(service.target)}>
                  <span>{service.title}</span>
                  <small>{service.text}</small>
                </button>
              ))}
              {matchedCities.slice(0, 2).map((city) => (
                <button key={city.city} type="button" onClick={() => openPath(city.target)}>
                  <span>{city.state}</span>
                  <small>{city.city}</small>
                </button>
              ))}
            </>
          ) : (
            <div className="tiktok-v2-empty-search">
              没找到相关服务，可进入客服页说明你的需求。
            </div>
          )}
        </section>
      ) : null}

      <section className="tiktok-v2-hero">
        <div className="tiktok-v2-hero__body">
          <span>Malaysia living guide</span>
          <h1>在马来西亚的生活服务入口</h1>
          <p>找房、留学、签证、本地办事和商务资源，按需求快速进入。</p>
          <div className="tiktok-v2-hero__actions">
            <UnifiedButton type="button" onClick={() => openPath(OFFICIAL_TARGET)}>
              进入商城
              <ArrowRight size={16} aria-hidden />
            </UnifiedButton>
            <button type="button" onClick={() => openPath(SUPPORT_TARGET)}>
              客服咨询
            </button>
          </div>
        </div>
        <div className="tiktok-v2-hero__art" aria-hidden>
          <span className="tiktok-v2-hero__shape tiktok-v2-hero__shape--primary" />
          <span className="tiktok-v2-hero__shape tiktok-v2-hero__shape--warm" />
          <span className="tiktok-v2-hero__shape tiktok-v2-hero__shape--mint" />
        </div>
      </section>

      <section id="services" className="tiktok-v2-section">
        <div className="tiktok-v2-section__head">
          <div>
            <span>Services</span>
            <h2>热门服务</h2>
          </div>
          <Sparkles size={19} aria-hidden />
        </div>
        {services.length ? (
          <div className="tiktok-v2-service-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="tiktok-v2-panel-state">服务列表暂时不可用，请稍后再试。</div>
        )}
      </section>

      <section id="cities" className="tiktok-v2-section">
        <div className="tiktok-v2-section__head">
          <div>
            <span>Cities</span>
            <h2>热门城市</h2>
          </div>
          <Building2 size={19} aria-hidden />
        </div>
        {cities.length ? (
          <div className="tiktok-v2-city-list">
            {cities.map((city) => (
              <button key={city.city} type="button" onClick={() => openPath(city.target)}>
                <span>
                  <strong>{city.state}</strong>
                  <small>{city.city}</small>
                </span>
                <em>{city.text}</em>
                <ArrowRight size={16} aria-hidden />
              </button>
            ))}
          </div>
        ) : (
          <div className="tiktok-v2-panel-state">城市入口暂时为空。</div>
        )}
      </section>

      <section className="tiktok-v2-support">
        <div>
          <span>Support</span>
          <h2>不知道选哪个服务？</h2>
          <p>把你的城市和需求发给客服，再决定进入哪个入口。</p>
        </div>
        <UnifiedButton type="button" onClick={() => openPath(SUPPORT_TARGET)}>
          联系客服
        </UnifiedButton>
      </section>

      <nav className="tiktok-v2-bottom-nav" aria-label="大马通独立页导航">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => openPath(item.target)}>
              <Icon size={19} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
