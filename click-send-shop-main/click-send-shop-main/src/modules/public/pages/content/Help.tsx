import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Search } from "lucide-react";
import { DEFAULT_FAQS, DEFAULT_FAQ_CATEGORIES } from "@/constants/help";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useGoBack } from "@/hooks/useGoBack";
import PageHeader from "@/components/PageHeader";
import { STORE_READING_MAIN_CLASS } from "@/constants/storeLayout";
import type { FaqItem } from "@/constants/help";
import type { HelpCenterConfig } from "@/types/content";

function parseHelpConfig(raw?: string): { categories: string[]; faqs: FaqItem[]; contactNote?: string } | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as HelpCenterConfig;
    const enabledCategories = (Array.isArray(parsed.categories) ? parsed.categories : [])
      .filter((cat) => cat.enabled !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const categoryNameById = new Map(enabledCategories.map((cat) => [cat.id, cat.name]));
    const faqs = (Array.isArray(parsed.faqs) ? parsed.faqs : [])
      .filter((faq) => faq.enabled !== false && categoryNameById.has(faq.categoryId))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((faq) => ({
        id: faq.id,
        category: categoryNameById.get(faq.categoryId) || "常见问题",
        question: faq.question,
        answer: faq.answer,
      }))
      .filter((faq) => faq.question && faq.answer);
    if (enabledCategories.length === 0 || faqs.length === 0) return null;
    return {
      categories: enabledCategories.map((cat) => cat.name),
      faqs,
      contactNote: parsed.contactNote,
    };
  } catch {
    return null;
  }
}

export default function Help() {
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "官方商城";
  const configuredHelp = useMemo(() => parseHelpConfig(siteInfo.helpCenterConfig), [siteInfo.helpCenterConfig]);
  const faqCategories = configuredHelp?.categories || DEFAULT_FAQ_CATEGORIES;
  const faqs = configuredHelp?.faqs || DEFAULT_FAQS;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return faqs.filter((item) => {
      const categoryHit = !activeCategory || item.category === activeCategory;
      if (!categoryHit) return false;
      if (!q) return true;
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [activeCategory, faqs, keyword]);

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: filtered.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    }),
    [filtered],
  );

  return (
    <div className="min-h-screen bg-background pb-6">
      <SeoHead
        title={`帮助中心｜${siteName}`}
        description={`查看${siteName}常见问题、下单流程、支付配送、售后退款与账户说明。`}
        canonical={buildCanonical("/help")}
        robots="index,follow"
        jsonLd={[{ id: "faq-help", data: faqJsonLd }]}
      />
      <PageHeader title="帮助中心" onBack={goBack} />

      <main className="mx-auto max-w-lg px-4 pt-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索常见问题..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs ${!activeCategory ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
          >
            全部
          </button>
          {faqCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs ${activeCategory === cat ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {filtered.map((faq) => (
            <div key={faq.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <button type="button" onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="pr-2 text-sm text-foreground">{faq.question}</span>
                {openId === faq.id ? <ChevronUp size={16} className="text-theme-price" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              {openId === faq.id ? <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <p>{configuredHelp?.contactNote || "需要人工协助时，可通过平台客服入口联系。"}</p>
          {siteInfo.whatsappUrl ? (
            <a href={siteInfo.whatsappUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-theme-price">
              <MessageCircle size={14} />
              联系客服
            </a>
          ) : null}
        </div>
      </main>
    </div>
  );
}
