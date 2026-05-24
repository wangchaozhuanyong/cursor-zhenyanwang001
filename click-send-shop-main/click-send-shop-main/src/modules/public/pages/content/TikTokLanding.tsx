import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, GraduationCap, Headphones, Home, Landmark, MessageCircle } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import * as contentService from "@/services/contentService";
import type { SiteInfo } from "@/types/content";
import { buildCanonical } from "@/utils/seo";
import { buildWhatsAppLink } from "@/utils/supportChannels";
import { getEnabledSupportChannels, parseSupportDownloadConfig } from "@/utils/supportDownloadConfig";

const SEO_TITLE = "马来西亚华人生活服务｜大马通";
const SEO_DESCRIPTION = "提供马来西亚签证、留学、第二家园、商业装修与本地生活服务咨询。";
const OG_DESCRIPTION = "签证、留学、第二家园、商业装修与本地生活服务咨询。";
const DEFAULT_PRIVACY_PATH = "/content/privacy-policy";
const DEFAULT_TERMS_PATH = "/content/terms-of-service";

const services = [
  {
    title: "签证咨询",
    description: "提供马来西亚签证相关信息咨询，协助了解基础流程与材料方向。",
    icon: Landmark,
  },
  {
    title: "留学咨询",
    description: "提供院校、申请流程、生活安排等方向的基础咨询服务。",
    icon: GraduationCap,
  },
  {
    title: "第二家园信息咨询",
    description: "帮助用户了解马来西亚第二家园相关公开信息与咨询流程。",
    icon: Home,
  },
  {
    title: "商业装修咨询",
    description: "面向门店、办公室、商业空间，提供装修规划与方案咨询。",
    icon: Building2,
  },
  {
    title: "本地生活服务咨询",
    description: "围绕马来西亚本地生活需求，提供基础信息咨询与服务对接。",
    icon: Headphones,
  },
];

function resolvePath(value: string | undefined, fallback: string) {
  const path = String(value || "").trim();
  return path || fallback;
}

export default function TikTokLanding() {
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);

  useEffect(() => {
    let alive = true;
    contentService
      .fetchSiteInfo()
      .then((info) => {
        if (alive) setSiteInfo(info ?? null);
      })
      .catch(() => {
        if (alive) setSiteInfo(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const whatsappUrl = useMemo(() => {
    const config = parseSupportDownloadConfig(siteInfo?.supportDownloadConfig);
    const channel = getEnabledSupportChannels(config).find((item) => item.type === "whatsapp");
    if (channel) return buildWhatsAppLink(channel);
    const digits = String(siteInfo?.contactPhone || "").replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }, [siteInfo?.contactPhone, siteInfo?.supportDownloadConfig]);

  const privacyPath = resolvePath(siteInfo?.privacyPolicyPath, DEFAULT_PRIVACY_PATH);
  const termsPath = resolvePath(siteInfo?.termsPath, DEFAULT_TERMS_PATH);
  const moreServicesPath = "/about";

  return (
    <main className="min-h-screen bg-[#090805] text-[#fff8e6]">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonical={buildCanonical("/tiktok")}
        robots="index,follow"
        ogTitle={SEO_TITLE}
        ogDescription={OG_DESCRIPTION}
        ogType="website"
        ogSiteName="大马通"
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(231,190,106,0.2),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <a href="/" className="group inline-flex items-center gap-3" aria-label="大马通官网">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#17130b] text-base font-bold text-[#f4cf7a] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.4),0_0_28px_rgba(244,207,122,0.16)]">
                大
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-[0.18em] text-[#ffe4a0]">大马通</span>
                <span className="mt-0.5 block text-xs text-[#c8b888]">马来西亚华人生活服务平台</span>
              </span>
            </a>
          </header>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.32em] text-[#d5b46d]">MALAYSIA LIFE SERVICES</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                在马来西亚，找服务更方便
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#d8cfb5] sm:text-lg">
                签证、留学、第二家园、商业装修、本地生活服务，一站式了解。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#f0c15f] px-7 text-base font-semibold text-[#161007] shadow-[0_18px_50px_rgba(240,193,95,0.28)] transition hover:bg-[#ffd77c] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805]"
                >
                  进入大马通官网
                  <ArrowRight size={20} />
                </a>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-transparent px-7 text-base font-semibold text-[#ffe4a0] shadow-[inset_0_0_0_1px_rgba(224,189,114,0.55)] transition hover:bg-[#f0c15f]/10 hover:shadow-[inset_0_0_0_1px_rgba(255,228,160,1)] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805]"
                  >
                    <MessageCircle size={20} />
                    WhatsApp 咨询
                  </a>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-[#b9ac87]">无需登录，可直接浏览网站内容。</p>
            </div>

            <aside className="pl-5 shadow-[inset_1px_0_0_rgba(217,182,106,0.25)] sm:pl-7 lg:pl-9">
              <p className="text-sm font-medium text-[#d5b46d]">查看服务范围</p>
              <div className="mt-5 space-y-4">
                {services.slice(0, 4).map((item) => (
                  <div key={item.title} className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-[#f0c15f] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.3)]">
                      <item.icon size={19} />
                    </span>
                    <span className="text-sm font-medium text-[#fff3cf]">{item.title}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[#100d08] px-5 py-12 shadow-[inset_0_1px_0_rgba(217,182,106,0.16),inset_0_-1px_0_rgba(217,182,106,0.16)] sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {services.map((item) => (
            <article key={item.title} className="rounded-lg bg-[#17130b] p-5 shadow-[inset_0_0_0_1px_rgba(217,182,106,0.18),0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#f0c15f]/12 text-[#f0c15f]">
                <item.icon size={21} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#cfc3a1]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,0.45fr)]">
          <div>
            <h2 className="text-2xl font-semibold text-white">服务说明</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#cfc3a1]">
              本页面仅展示生活服务咨询内容，不提供平台限制类销售信息。如需进一步了解服务，请通过官方联系方式咨询。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={moreServicesPath} className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold text-[#ffe4a0] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.35)] transition hover:bg-[#f0c15f]/10">
              了解更多服务
            </a>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#f0c15f] px-5 text-sm font-semibold text-[#161007] transition hover:bg-[#ffd77c]">
                联系客服
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 shadow-[inset_0_1px_0_rgba(217,182,106,0.16)] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-xs leading-6 text-[#9f946f]">
            页面信息仅供咨询参考，具体办理要求以实际政策、资质机构和服务协议为准。
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#d8c894]" aria-label="页脚链接">
            <a href="/" className="hover:text-[#ffe4a0]">大马通官网</a>
            <a href="/about" className="hover:text-[#ffe4a0]">关于我们</a>
            <a href={moreServicesPath} className="hover:text-[#ffe4a0]">服务说明</a>
            <a href={privacyPath} className="hover:text-[#ffe4a0]">隐私政策</a>
            <a href={termsPath} className="hover:text-[#ffe4a0]">服务条款</a>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-[#ffe4a0]">联系客服</a>
            ) : null}
          </nav>
        </div>
      </footer>
    </main>
  );
}
