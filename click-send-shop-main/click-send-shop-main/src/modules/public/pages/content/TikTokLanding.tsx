import { ArrowRight, Building2, GraduationCap, Headphones, Home, Landmark, MessageCircle } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";

const SEO_TITLE = "马来西亚华人生活服务｜大马通";
const SEO_DESCRIPTION = "提供马来西亚签证、留学、第二家园、商业装修与本地生活服务咨询。";
const OG_DESCRIPTION = "签证、留学、第二家园、商业装修与本地生活服务咨询。";

const WHATSAPP_URL = "https://wa.me/5325325235";
const PRIVACY_PATH = "/content/privacy-policy";
const TERMS_PATH = "/content/terms-of-service";
const MORE_SERVICES_PATH = "/about";
const LOGO_SRC = "/assets/tiktok-logo.jpeg";

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

const steps = ["了解需求", "联系客服", "获取基础信息与服务对接"];

export default function TikTokLanding() {
  return (
    <main className="min-h-screen bg-[#080704] text-[#fff8e6]">
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

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(236,194,103,0.18),transparent_28%),radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(145deg,#080704_0%,#11100c_48%,#050403_100%)]" />
        <div className="mx-auto flex min-h-[86svh] w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <a href="/" className="group inline-flex items-center gap-3" aria-label="大马通官网">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#050403] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.55),0_0_26px_rgba(244,207,122,0.18)] sm:h-16 sm:w-16">
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
                <span className="block text-xl font-semibold text-[#ffe4a0]">大马通</span>
                <span className="mt-0.5 block text-xs text-[#c8b888]">马来西亚华人生活服务平台</span>
              </span>
            </a>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-[#d5b46d]">生活服务咨询入口</p>
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
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-transparent px-7 text-base font-semibold text-[#ffe4a0] shadow-[inset_0_0_0_1px_rgba(224,189,114,0.55)] transition hover:bg-[#f0c15f]/10 hover:shadow-[inset_0_0_0_1px_rgba(255,228,160,1)] focus:outline-none focus:ring-2 focus:ring-[#ffe4a0] focus:ring-offset-2 focus:ring-offset-[#090805]"
                >
                  <MessageCircle size={20} />
                  WhatsApp 咨询
                </a>
              </div>
              <p className="mt-4 text-sm text-[#b9ac87]">无需登录，可直接浏览网站内容。</p>
            </div>

            <aside className="rounded-lg bg-white/[0.035] p-5 shadow-[inset_0_0_0_1px_rgba(217,182,106,0.18),0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
              <p className="text-sm font-medium text-[#d5b46d]">查看服务范围</p>
              <div className="mt-5 grid gap-3">
                {services.map((item) => (
                  <div key={item.title} className="flex items-center gap-3 rounded-lg bg-[#0d0b07]/70 p-3 shadow-[inset_0_0_0_1px_rgba(217,182,106,0.12)]">
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
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-white">咨询范围</h2>
            <p className="mt-3 text-sm leading-7 text-[#cfc3a1]">
              围绕在马来西亚生活、学习、居住与经营的常见需求，提供基础信息咨询与服务对接。
            </p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((item) => (
              <article key={item.title} className="rounded-lg bg-[#17130b] p-5 shadow-[inset_0_0_0_1px_rgba(217,182,106,0.18),0_20px_60px_rgba(0,0,0,0.22)]">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#f0c15f]/12 text-[#f0c15f]">
                  <item.icon size={21} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#cfc3a1]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,0.45fr)]">
          <div>
            <h2 className="text-2xl font-semibold text-white">服务说明</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#cfc3a1]">
              本页面仅展示生活服务咨询内容，不提供平台限制类销售信息。如需进一步了解服务，请通过官方联系方式咨询。
            </p>
            <ol className="mt-7 grid gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step} className="rounded-lg bg-[#141109] p-4 shadow-[inset_0_0_0_1px_rgba(217,182,106,0.16)]">
                  <span className="text-xs font-semibold text-[#d5b46d]">0{index + 1}</span>
                  <p className="mt-2 text-sm font-medium text-[#fff3cf]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={MORE_SERVICES_PATH} className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold text-[#ffe4a0] shadow-[inset_0_0_0_1px_rgba(217,182,106,0.35)] transition hover:bg-[#f0c15f]/10">
              了解更多服务
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#f0c15f] px-5 text-sm font-semibold text-[#161007] transition hover:bg-[#ffd77c]">
              联系客服
            </a>
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
            <a href={MORE_SERVICES_PATH} className="hover:text-[#ffe4a0]">服务说明</a>
            <a href={PRIVACY_PATH} className="hover:text-[#ffe4a0]">隐私政策</a>
            <a href={TERMS_PATH} className="hover:text-[#ffe4a0]">服务条款</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-[#ffe4a0]">联系客服</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
