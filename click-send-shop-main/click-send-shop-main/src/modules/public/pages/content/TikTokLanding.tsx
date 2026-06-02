import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, MessageCircle } from "lucide-react";

function withViteBase(path: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${String(path || "").replace(/^\//, "")}`;
}

const LOGO_SRC = withViteBase("/assets/tiktok-logo.jpeg");
const OFFICIAL_TARGET = "/";
const SERVICES_SECTION_ID = "malaysia-services";

const heroSlides = [
  {
    image: withViteBase("/assets/tiktok-hero-city.svg"),
    eyebrow: "落地城市导航",
    title: "吉隆坡城市服务",
    subtitle: "从落地安顿到本地资源，帮你更快进入马来西亚生活节奏。",
    visualTitle: "从机场到城市生活",
    visualText: "住宿、交通、办事、同城服务集中整理，新用户不用到处找入口。",
    facts: ["热门城市", "本地办事", "中文沟通", "落地安顿"],
  },
  {
    image: withViteBase("/assets/tiktok-hero-home.svg"),
    eyebrow: "安家生活包",
    title: "安家与日常生活",
    subtitle: "找房、搬家、维修、生活缴费，用中文找到可靠服务。",
    visualTitle: "租房、搬家、维修一条线",
    visualText: "把高频生活需求做成清晰入口，减少来回询问和踩坑成本。",
    facts: ["租房找房", "搬家安装", "水电网络", "上门维修"],
  },
  {
    image: withViteBase("/assets/tiktok-hero-study.svg"),
    eyebrow: "学习身份规划",
    title: "留学与身份规划",
    subtitle: "围绕学习、居住、签证和长期发展，整理清晰服务入口。",
    visualTitle: "留学家庭也能快速上手",
    visualText: "覆盖入学、住宿、陪读、签证咨询等常见问题，先把方向理清楚。",
    facts: ["学校生活", "陪读家庭", "签证咨询", "长期规划"],
  },
  {
    image: withViteBase("/assets/tiktok-hero-business.svg"),
    eyebrow: "商务资源入口",
    title: "商务与资源对接",
    subtitle: "连接商业空间、本地渠道和华人圈资源，降低沟通成本。",
    visualTitle: "空间、渠道、人脉一起对接",
    visualText: "面向商家、创业者和跨境团队，整理可沟通、可执行的本地资源入口。",
    facts: ["商铺办公室", "供应链资源", "本地推广", "华人圈对接"],
  },
];

const serviceTags = ["找房租房", "留学生活", "签证咨询", "本地服务", "商务资源", "华人圈资讯"];

const serviceCards = [
  { label: "安家租房", text: "找房、搬家、家具家电、入住前后常见事项。" },
  { label: "留学教育", text: "面向留学生和家长，整理学习、住宿和生活支持。" },
  { label: "签证身份", text: "聚合签证咨询、长期居住和身份规划相关入口。" },
  { label: "生活缴费", text: "电话卡、水电网、交通、日常缴费和本地办事指南。" },
  { label: "维修搬家", text: "对接维修、清洁、搬运、安装等高频上门服务。" },
  { label: "医疗保险", text: "帮助用户了解本地医疗、保险和紧急求助资源。" },
  { label: "商业对接", text: "连接商铺、办公空间、供应链和本地推广资源。" },
  { label: "本地优惠", text: "发现适合华人的餐饮、活动、折扣和生活福利。" },
];

const starterSteps = [
  "办理电话卡和基础生活账户",
  "确认城市、预算和居住区域",
  "找到交通、缴费、维修等常用入口",
  "加入华人生活与商务资源网络",
];

const trustPoints = [
  "中文沟通，适合新来马来西亚的用户",
  "覆盖吉隆坡、雪兰莪、槟城、新山等热门城市",
  "围绕留学生、工作人士、家庭和商家真实需求",
];

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    document.head.appendChild(meta);
  }
  Object.entries(attributes).forEach(([key, value]) => meta.setAttribute(key, value));
}

function syncTikTokHead() {
  const title = "大马通 | 中国人在马来西亚的一站式生活服务平台";
  const description = "大马通为中国人在马来西亚提供找房安家、留学生活、签证咨询、本地服务和商务资源入口。";

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
  robots.content = "index,follow";

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = window.location.href;
  document.head.appendChild(canonical);

  upsertMeta("meta[name='description']", { name: "description", content: description });
  upsertMeta("meta[name='keywords']", {
    name: "keywords",
    content: "大马通,马来西亚生活服务,中国人在马来西亚,马来西亚找房,马来西亚留学,吉隆坡生活",
  });
  upsertMeta("meta[property='og:title']", { property: "og:title", content: title });
  upsertMeta("meta[property='og:description']", { property: "og:description", content: description });
  upsertMeta("meta[property='og:image']", { property: "og:image", content: LOGO_SRC });
  upsertMeta("meta[property='og:type']", { property: "og:type", content: "website" });
  upsertMeta("meta[name='twitter:card']", { name: "twitter:card", content: "summary_large_image" });
  upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: title });
  upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: description });

  document
    .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
    .forEach((el) => el.remove());

  [
    { rel: "icon", href: LOGO_SRC },
    { rel: "shortcut icon", href: LOGO_SRC },
  ].forEach(({ rel, href }) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    link.type = "image/jpeg";
    document.head.appendChild(link);
  });
}

export default function TikTokLanding() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = heroSlides[activeIndex];
  const slideCount = heroSlides.length;

  useEffect(() => {
    syncTikTokHead();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  const slideButtons = useMemo(
    () =>
      heroSlides.map((slide, index) => (
        <button
          key={slide.image}
          type="button"
          aria-label={`切换到第 ${index + 1} 张展示图`}
          aria-current={activeIndex === index}
          onClick={() => setActiveIndex(index)}
          className={`h-2.5 rounded-full transition-all duration-300 ${
            activeIndex === index ? "w-9 bg-[#f2c76d]" : "w-2.5 bg-white/45 hover:bg-white/75"
          }`}
        />
      )),
    [activeIndex],
  );

  const enterOfficialSite = () => {
    window.location.assign(OFFICIAL_TARGET);
  };

  const scrollToServices = () => {
    document.getElementById(SERVICES_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#070504] text-[#fff8e6]">
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[#070504]">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.title}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                activeIndex === index ? "opacity-100" : "opacity-0"
              }`}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              {...({ fetchpriority: index === 0 ? "high" : "auto" } as Record<string, string>)}
            />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(7,5,4,0.94)_0%,rgba(7,5,4,0.78)_45%,rgba(32,18,7,0.62)_100%)]" />
        <div className="absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#f2c76d]/18 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#070504] via-[#070504]/76 to-transparent" />

        <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3" aria-label="大马通">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#050403] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.62),0_0_34px_rgba(244,207,122,0.18)] sm:h-16 sm:w-16">
                <img
                  src={LOGO_SRC}
                  alt="大马通"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </span>
              <span>
                <span className="block text-xl font-semibold tracking-wide text-[#ffe4a0]">大马通</span>
                <span className="mt-0.5 block text-xs tracking-[0.22em] text-[#d2bd83]">DAMATONG</span>
              </span>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-14">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f2c76d]/28 bg-black/35 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#f2c76d] shadow-[0_14px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <MapPin size={15} />
                MALAYSIA CHINESE SERVICE HUB
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                中国人在马来西亚的一站式生活服务平台
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#eadfc4] sm:text-lg">
                找房安家、留学陪伴、本地生活、签证咨询、商务资源，从初到马来西亚到长期发展，大马通帮你连接可靠服务。
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {serviceTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#f2c76d]/24 bg-[#f2c76d]/10 px-4 py-2 text-sm font-medium text-[#ffe4a0]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={enterOfficialSite}
                  className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f2c76d] px-8 text-base font-semibold text-[#171006] shadow-[0_18px_60px_rgba(242,199,109,0.28),inset_0_1px_0_rgba(255,255,255,0.52)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe09a] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805] sm:min-h-16 sm:px-10 sm:text-lg"
                >
                  进入服务大厅
                  <ArrowRight className="transition duration-300 group-hover:translate-x-1" size={22} />
                </button>
                <button
                  type="button"
                  onClick={scrollToServices}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-[#f2c76d]/35 bg-black/36 px-8 text-base font-semibold text-[#ffe4a0] shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#ffe4a0]/70 hover:bg-black/48 focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805] sm:min-h-16 sm:px-10 sm:text-lg"
                >
                  <MessageCircle size={21} />
                  查看可用服务
                </button>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-[#eadfc4] sm:grid-cols-3">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-start gap-2 rounded-2xl bg-black/24 p-3 ring-1 ring-white/8">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#f2c76d]" size={17} />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/12 bg-black/34 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:p-7">
              <div className="overflow-hidden rounded-[1.5rem] border border-[#f2c76d]/16 bg-[#100d08]/85">
                <div
                  className="relative min-h-64 overflow-hidden bg-[#110d07] bg-cover bg-center p-5 sm:min-h-80 sm:p-6"
                  style={{
                    backgroundImage: `linear-gradient(145deg, rgba(7, 5, 4, 0.5), rgba(7, 5, 4, 0.9) 72%), url(${activeSlide.image})`,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(242,199,109,0.26),transparent_34%),linear-gradient(180deg,transparent,rgba(7,5,4,0.52))]" />
                  <div className="relative flex min-h-56 flex-col justify-between sm:min-h-[17rem]">
                    <div className="flex items-start justify-between gap-4">
                      <span className="rounded-full border border-[#f2c76d]/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-[#ffe4a0] backdrop-blur-sm">
                        {activeSlide.eyebrow}
                      </span>
                      <span className="rounded-full bg-[#f2c76d] px-3 py-1.5 text-xs font-bold text-[#171006] shadow-[0_10px_28px_rgba(242,199,109,0.24)]">
                        0{activeIndex + 1}
                      </span>
                    </div>

                    <div className="mt-10 max-w-sm">
                      <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
                        {activeSlide.visualTitle}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#eadfc4]">{activeSlide.visualText}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {activeSlide.facts.map((fact) => (
                        <span
                          key={fact}
                          className="rounded-2xl border border-white/12 bg-black/38 px-3 py-2 text-xs font-semibold text-[#fff8e6] backdrop-blur-sm"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm font-semibold text-[#f2c76d]">当前推荐入口</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{activeSlide.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#d8cfb5]">{activeSlide.subtitle}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">{slideButtons}</div>
            </div>
          </div>
        </div>
      </section>

      <section id={SERVICES_SECTION_ID} className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.24em] text-[#f2c76d]">SERVICE CATEGORIES</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">刚到马来西亚，从这些服务开始</h2>
            <p className="mt-4 text-base leading-8 text-[#d8cfb5]">
              用户不需要先理解平台结构，只要按自己的生活场景进入，就能快速找到对应服务。
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-[#d8ae62]/18 bg-[#100d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <h3 className="text-lg font-semibold text-[#ffe4a0]">{item.label}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8cfb5]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#d8ae62]/18 bg-[#100d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.24)] sm:p-8">
            <p className="text-sm font-semibold tracking-[0.24em] text-[#f2c76d]">NEWCOMER GUIDE</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">刚来马来西亚？先走这 4 步</h2>
            <p className="mt-4 text-sm leading-7 text-[#d8cfb5]">
              把复杂的本地生活拆成清晰入口，让新用户第一眼知道大马通能帮他开始。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {starterSteps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-black/28 p-5">
                <span className="text-sm font-semibold text-[#f2c76d]">0{index + 1}</span>
                <p className="mt-3 text-base font-semibold leading-7 text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-6xl rounded-[2rem] border border-[#f2c76d]/20 bg-[#f2c76d]/10 p-6 text-center shadow-[0_22px_80px_rgba(0,0,0,0.26)] sm:p-8">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">进入大马通，开始你的马来西亚生活</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#eadfc4]">
            无论你是留学生、工作人士、陪读家庭还是本地商家，都可以从这里找到中文友好的服务入口。
          </p>
          <button
            type="button"
            onClick={enterOfficialSite}
            className="group mx-auto mt-6 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f2c76d] px-8 text-base font-semibold text-[#171006] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe09a] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805]"
          >
            进入服务大厅
            <ArrowRight className="transition duration-300 group-hover:translate-x-1" size={21} />
          </button>
        </div>
      </section>
    </main>
  );
}
