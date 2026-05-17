import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, MessageCircle, ChevronDown, ChevronUp, Phone, HelpCircle, Clock } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { FAQS, FAQ_CATEGORIES, WORKING_HOURS } from "@/constants/help";
import * as contentService from "@/services/contentService";
import type { SiteInfo, HelpCenterConfig } from "@/types/content";
import { copyToClipboard } from "@/utils/clipboard";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_ICON_WRAP,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
} from "@/utils/themeVisuals";

export default function Help() {
  const goBack = useGoBack();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({});

  useEffect(() => {
    contentService.fetchSiteInfo().then((data) => { if (data) setSiteInfo(data); }).catch(() => {});
  }, []);

  const helpConfig = useMemo<HelpCenterConfig | null>(() => {
    const raw = (siteInfo.helpCenterConfig || "").trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as HelpCenterConfig;
      if (!parsed || !Array.isArray(parsed.faqs) || !Array.isArray(parsed.categories)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [siteInfo.helpCenterConfig]);

  const categories = helpConfig
    ? helpConfig.categories.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name)
    : FAQ_CATEGORIES;

  const normalizedFaqs = helpConfig
    ? helpConfig.faqs
      .filter((f) => f.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        category: helpConfig.categories.find((c) => c.id === f.categoryId)?.name || "其他",
      }))
    : FAQS;

  const filtered = activeCategory ? normalizedFaqs.filter((f) => f.category === activeCategory) : normalizedFaqs;

  const whatsappUrl =
    (siteInfo.whatsappUrl || "").trim()
    || (siteInfo.contactWhatsApp ? `https://wa.me/${siteInfo.contactWhatsApp.replace(/\D/g, "")}?text=你好，我需要帮助` : "");
  const wechatId = (siteInfo.wechatId || "").trim();

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft size={20} className="text-foreground" /></button>
          <h1 className="text-base font-semibold text-foreground">帮助中心</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        <div className={`rounded-2xl p-5 ${THEME_ACCENT_HERO_SHELL}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${THEME_ACCENT_HERO_ICON_WRAP}`}>
              <HelpCircle size={24} className={THEME_ACCENT_HERO_ICON} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${THEME_ACCENT_HERO_VALUE}`}>需要帮助？</p>
              <p className={`text-xs ${THEME_ACCENT_HERO_MUTED}`}>随时联系我们的客服团队</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            {whatsappUrl && <button onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[var(--theme-gradient-foreground)] theme-shadow"><MessageCircle size={16} /> WhatsApp</button>}
            {wechatId && <button onClick={async () => { const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(wechatId)]); if (copied) toast.success("客服微信号已复制", toastPresetQuickSuccess); else toast.error("复制失败，请手动复制微信号"); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--theme-price)] py-3 text-sm font-bold text-[var(--theme-price-foreground)] theme-shadow"><Phone size={16} /> 微信客服</button>}
          </div>
          <div className={`mt-3 flex items-center justify-center gap-1.5 ${THEME_ACCENT_HERO_SUBTLE}`}>
            <Clock size={12} /> 工作时间: {helpConfig?.workingHours || WORKING_HOURS}
          </div>
        </div>

        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveCategory(null)} className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium ${!activeCategory ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}>全部</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium ${activeCategory === cat ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}>{cat}</button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {filtered.map((faq, i) => (
            <motion.div key={faq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="flex w-full items-center justify-between px-4 py-4 text-left">
                <span className="pr-3 text-sm font-medium text-foreground">{faq.question}</span>
                {openId === faq.id ? <ChevronUp size={16} className="text-theme-price" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {openId === faq.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="border-t border-border px-4 py-3"><p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {filtered.length === 0 ? <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">暂无帮助内容</div> : null}
        </div>
      </main>
    </div>
  );
}
