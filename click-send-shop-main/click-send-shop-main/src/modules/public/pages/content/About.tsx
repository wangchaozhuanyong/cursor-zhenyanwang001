import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Phone, Mail, MessageCircle, Globe, Award, Shield, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoWebp from "@/assets/logo.webp";
import * as contentService from "@/services/contentService";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";
import { useGoBack } from "@/hooks/useGoBack";

export default function About() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [cmsContent, setCmsContent] = useState("");
  const siteInfo = useSiteInfo();
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const siteName = siteInfo.siteName || "真烟网";
  const slogan = siteInfo.siteSlogan || siteInfo.siteDescription || "尊享品质，精选全球好物";

  useEffect(() => {
    contentService.fetchContentBySlug("about").then((page) => {
      if (page?.content) setCmsContent(page.content);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} aria-label="返回" className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">关于我们</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-primary p-6 text-center"
        >
          <img src={logoSrc} alt={siteName} width={64} height={64} className="mx-auto rounded-xl object-contain" />
          <h2 className="mt-3 font-display text-3xl font-bold text-primary-foreground">
            {renderBrandTitle(siteName)}
          </h2>
          <p className="mt-2 text-sm text-primary-foreground/70">{slogan}</p>
          <div className="mx-auto mt-4 h-px w-12 bg-gold" />
          <p className="mt-4 text-xs leading-relaxed text-primary-foreground/60">
            {siteInfo.siteDescription ||
              `${siteName}致力于为消费者提供精选的全球高品质商品。我们严格把控供应链，确保每一件商品都经过品质认证，让您在家即可享受全球精品购物体验。`}
          </p>
        </motion.div>

        {/* Values */}
        <div className="mt-8 grid grid-cols-3 gap-4 md:mt-10">
          {[
            { icon: Award, label: "品质保证", desc: "全球精选正品" },
            { icon: Truck, label: "极速配送", desc: "2-5天送达" },
            { icon: Shield, label: "售后无忧", desc: "7天退换" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-4 text-center"
            >
              <item.icon size={22} className="mx-auto text-gold" />
              <p className="mt-2 text-xs font-semibold text-foreground">{item.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Story */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl border border-border bg-card p-5 md:mt-10"
        >
          <h3 className="text-sm font-semibold text-foreground">品牌故事</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {siteName}的创始团队拥有多年跨境电商经验，深知消费者对品质和服务的追求。
            我们与全球数百个品牌建立了直接合作关系，从源头把控品质，为您省去中间环节。
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            我们相信，真正的奢华不仅仅是价格，更是对品质的极致追求和对客户的真诚服务。
            每一位顾客的满意，都是我们前行的动力。
          </p>
        </motion.div>

        {/* CMS Content */}
        {cmsContent && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 rounded-2xl border border-border bg-card p-5 md:mt-10"
          >
            <div className="prose prose-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: cmsContent }} />
          </motion.div>
        )}

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl border border-border bg-card p-5 md:mt-10"
        >
          <h3 className="mb-4 text-sm font-semibold text-foreground">联系我们</h3>
          <div className="space-y-3">
            {[
              siteInfo.contactPhone && { icon: Phone, label: siteInfo.contactPhone },
              siteInfo.contactEmail && { icon: Mail, label: siteInfo.contactEmail },
              siteInfo.wechatId && { icon: MessageCircle, label: `微信: ${siteInfo.wechatId}` },
              siteInfo.businessHours && { icon: Globe, label: siteInfo.businessHours },
              siteInfo.address && { icon: MapPin, label: siteInfo.address },
            ]
              .filter(Boolean)
              .map((item) => {
                const it = item as { icon: typeof Phone; label: string };
                return (
                  <div key={it.label} className="flex items-center gap-3">
                    <it.icon size={16} className="text-gold flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{it.label}</span>
                  </div>
                );
              })}
          </div>
        </motion.div>

        {/* Social */}
        <div className="mt-8 flex justify-center gap-4 pb-6 flex-wrap md:mt-10">
          {[
            {
              label: "WhatsApp",
              url:
                siteInfo.whatsappUrl ||
                (siteInfo.contactWhatsApp
                  ? `https://wa.me/${siteInfo.contactWhatsApp.replace(/\D/g, "")}`
                  : ""),
              showWhenWechat: false,
            },
            { label: "WeChat", url: "", showWhenWechat: true },
            { label: "Instagram", url: siteInfo.instagramUrl || "", showWhenWechat: false },
            { label: "Facebook", url: siteInfo.facebookUrl || "", showWhenWechat: false },
            { label: "TikTok", url: siteInfo.tiktokUrl || "", showWhenWechat: false },
            { label: "小红书", url: siteInfo.xhsUrl || "", showWhenWechat: false },
          ]
            .filter((s) =>
              s.label === "WeChat" ? Boolean(siteInfo.wechatId) : Boolean(s.url),
            )
            .map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  if (s.url) {
                    window.open(s.url, "_blank");
                  } else if (s.label === "WeChat" && siteInfo.wechatId) {
                    navigator.clipboard.writeText(siteInfo.wechatId);
                    import("sonner").then(({ toast }) =>
                      toast.success("微信号已复制"),
                    );
                  }
                }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:border-gold/30 active:scale-95 transition-all"
              >
                {s.label}
              </button>
            ))}
        </div>
      </main>
    </div>
  );
}