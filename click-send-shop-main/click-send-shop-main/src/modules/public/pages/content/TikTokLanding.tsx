import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

const LOGO_SRC = "/assets/tiktok-logo.jpeg";
const OFFICIAL_TARGET = "/";

const heroSlides = [
  {
    image: "/assets/tiktok-hero-city.svg",
    title: "马来西亚城市生活入口",
    subtitle: "从生活安顿到本地资源，一站连接更高效的服务体验。",
  },
  {
    image: "/assets/tiktok-hero-home.svg",
    title: "华人生活服务平台",
    subtitle: "面向在马来西亚生活、学习、居住与经营的真实需求。",
  },
  {
    image: "/assets/tiktok-hero-study.svg",
    title: "留学与长期规划",
    subtitle: "用清晰的信息入口，帮助用户快速找到合适方向。",
  },
  {
    image: "/assets/tiktok-hero-business.svg",
    title: "商务与本地对接",
    subtitle: "服务咨询、商业空间与本地资源，建立更稳的连接。",
  },
];

const highlights = [
  { label: "生活服务", text: "聚合本地生活咨询与服务入口。" },
  { label: "留学居住", text: "覆盖学习、居住和长期规划方向。" },
  { label: "商业资源", text: "连接商务咨询与本地资源对接。" },
];

function syncTikTokHead() {
  document.title = "大马通";

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
  robots.content = "noindex,nofollow";

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

  return (
    <main className="min-h-screen bg-[#060504] text-[#fff8e6]">
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[#060504]">
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
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.14),rgba(0,0,0,0.46)_48%,rgba(0,0,0,0.74)_100%)]" />
        <div className="absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#060504] via-[#060504]/70 to-transparent" />

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

          <div className="flex flex-1 items-center justify-center py-14 text-center">
            <div className="max-w-4xl rounded-[2rem] border border-white/10 bg-black/24 px-5 py-9 shadow-[0_30px_120px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:px-10 sm:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#f2c76d]">Malaysia Chinese Lifestyle</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                {activeSlide.title}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#eadfc4] sm:text-lg">
                {activeSlide.subtitle}
              </p>
              <button
                type="button"
                onClick={enterOfficialSite}
                className="group mx-auto mt-9 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f2c76d] px-8 text-base font-semibold text-[#171006] shadow-[0_18px_60px_rgba(242,199,109,0.28),inset_0_1px_0_rgba(255,255,255,0.52)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe09a] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805] sm:min-h-16 sm:px-10 sm:text-lg"
              >
                进入大马通官方
                <ArrowRight className="transition duration-300 group-hover:translate-x-1" size={22} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pb-4">{slideButtons}</div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[#d8ae62]/18 bg-[#100d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <h2 className="text-lg font-semibold text-[#ffe4a0]">{item.label}</h2>
              <p className="mt-3 text-sm leading-7 text-[#d8cfb5]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
