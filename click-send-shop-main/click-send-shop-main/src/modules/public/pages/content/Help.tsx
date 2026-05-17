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
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
} from "@/utils/themeVisuals";

function HelpContactHero({
  whatsappUrl,
  wechatId,
  workingHours,
}: {
  whatsappUrl: string;
  wechatId: string;
  workingHours: string;
}) {
  const hasWhatsapp = Boolean(whatsappUrl);
  const hasWechat = Boolean(wechatId);
  const actionCols = hasWhatsapp && hasWechat ? "grid-cols-2" : "grid-cols-1";

  return (
    <section className={`overflow-hidden rounded-2xl ${THEME_ACCENT_HERO_SHELL}`}>
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <div
            className="theme-hero-accent-icon-wrap flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(0,0,0,0.22)] ring-1 ring-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_14%,transparent)]"
            aria-hidden
          >
            <HelpCircle size={28} strokeWidth={2.35} className="theme-hero-accent-icon" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className={`text-base font-bold leading-snug ${THEME_ACCENT_HERO_VALUE}`}>需要帮助？</p>
            <p className={`mt-1 text-xs leading-relaxed ${THEME_ACCENT_HERO_MUTED}`}>随时联系我们的客服团队</p>
          </div>
        </div>

        {(hasWhatsapp || hasWechat) ? (
          <div className={`mt-4 grid gap-2.5 ${actionCols}`}>
            {hasWhatsapp ? (
              <button
                type="button"
                onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_28%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_90%,transparent)] px-3 py-3 text-sm font-semibold text-[var(--theme-coupon-accent-foreground)] backdrop-blur-sm transition-transform active:scale-[0.98]"
              >
                <MessageCircle size={17} strokeWidth={2.25} />
                WhatsApp
              </button>
            ) : null}
            {hasWechat ? (
              <button
                type="button"
                onClick={async () => {
                  const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(wechatId)]);
                  if (copied) toast.success("客服微信号已复制", toastPresetQuickSuccess);
                  else toast.error("复制失败，请手动复制微信号");
                }}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--theme-price)] px-3 py-3 text-sm font-bold text-[var(--theme-price-foreground)] shadow-[var(--theme-shadow-card)] transition-transform active:scale-[0.98]"
              >
                <Phone size={17} strokeWidth={2.25} />
                微信客服
              </button>
            ) : null}
          </div>
        ) : null}

        <p className={`mt-3 flex items-center justify-center gap-1.5 text-[11px] ${THEME_ACCENT_HERO_SUBTLE}`}>
          <Clock size={12} className="shrink-0 opacity-90" aria-hidden />
          <span>工作时间：{workingHours}</span>
        </p>
      </div>
    </section>
  );
}

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
        <HelpContactHero
          whatsappUrl={whatsappUrl}
          wechatId={wechatId}
          workingHours={helpConfig?.workingHours || WORKING_HOURS}
        />

        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${!activeCategory ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${activeCategory === cat ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {filtered.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="pr-3 text-sm font-medium text-foreground">{faq.question}</span>
                {openId === faq.id ? (
                  <ChevronUp size={16} className="text-theme-price" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {openId === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              暂无帮助内容
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
