import { useState, useEffect } from "react";
import {
  ArrowLeft, MessageCircle, ChevronDown, ChevronUp, Phone,
  HelpCircle, Package, CreditCard, Truck, RotateCcw, Shield, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { FAQS, FAQ_CATEGORIES, WHATSAPP_URL, WECHAT_ID, WORKING_HOURS } from "@/constants/help";
import * as contentService from "@/services/contentService";
import type { SiteInfo } from "@/types/content";

const categoryIcons: Record<string, React.ElementType> = {
  "订单": Package,
  "支付": CreditCard,
  "物流": Truck,
  "退换": RotateCcw,
  "积分": Shield,
};

export default function Help() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({});

  useEffect(() => {
    contentService.fetchSiteInfo().then((data) => { if (data) setSiteInfo(data); }).catch(() => {});
  }, []);

  const filtered = activeCategory ? FAQS.filter((f) => f.category === activeCategory) : FAQS;

  const whatsappUrl = siteInfo.whatsappUrl || (siteInfo.contactWhatsApp
    ? `https://wa.me/${siteInfo.contactWhatsApp.replace(/\D/g, "")}?text=你好，我需要帮助`
    : WHATSAPP_URL);
  const wechatId = siteInfo.wechatId || WECHAT_ID;

  const openWhatsApp = () => {
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">帮助中心</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        {/* Contact card */}
        <div className="rounded-2xl bg-primary p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10">
              <HelpCircle size={24} className="text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary-foreground">需要帮助？</p>
              <p className="text-xs text-primary-foreground/60">随时联系我们的客服团队</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={openWhatsApp}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(142,70%,45%)] py-3 text-sm font-bold text-white active:scale-[0.97] transition-transform"
            >
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(wechatId);
                import("sonner").then(({ toast }) => toast.success("客服微信号已复制"));
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(29,100%,50%)] py-3 text-sm font-bold text-white active:scale-[0.97] transition-transform"
            >
              <Phone size={16} /> 微信客服
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-primary-foreground/50">
            <Clock size={12} /> 工作时间: {WORKING_HOURS}
          </div>
        </div>

        {/* Category filter */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              !activeCategory ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            全部
          </button>
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = categoryIcons[cat] || HelpCircle;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  activeCategory === cat ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon size={13} /> {cat}
              </button>
            );
          })}
        </div>

        {/* FAQ list */}
        <div className="mt-4 space-y-2">
          {filtered.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="text-sm font-medium text-foreground pr-3">{faq.question}</span>
                {openId === faq.id ? (
                  <ChevronUp size={16} className="flex-shrink-0 text-gold" />
                ) : (
                  <ChevronDown size={16} className="flex-shrink-0 text-muted-foreground" />
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
        </div>
      </main>
    </div>
  );
}
