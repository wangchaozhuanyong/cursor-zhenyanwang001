import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import SupportContactSection from "@/components/support/SupportContactSection";
import { DEFAULT_FAQS, DEFAULT_FAQ_CATEGORIES } from "@/constants/help";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useGoBack } from "@/hooks/useGoBack";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { STORE_COPY } from "@/constants/storeCopy";
import type { FaqItem } from "@/constants/help";
import type { HelpCenterConfig } from "@/types/content";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function parseHelpConfig(raw?: string): { categories: string[]; faqs: FaqItem[] } | null {
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
    };
  } catch {
    return null;
  }
}

export default function Help() {
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
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
    <StoreStandardPageShell
      title="帮助中心"
      onBack={goBack}
      backFallback="/profile"
      contentClassName="md:max-w-3xl xl:max-w-4xl"
    >
      <SeoHead
        title={`帮助中心｜${siteName}`}
        description={`查看${siteName}常见问题、下单流程、支付配送、售后退款与账户说明。`}
        canonical={buildCanonical("/help")}
        robots="index,follow"
        jsonLd={[{ id: "faq-help", data: faqJsonLd }]}
      />

      <div className="mx-auto w-full max-w-lg md:max-w-none">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索常见问题..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
          <UnifiedButton
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs ${!activeCategory ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
          >
            全部
          </UnifiedButton>
          {faqCategories.map((cat) => (
            <UnifiedButton
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs ${activeCategory === cat ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}
            >
              {cat}
            </UnifiedButton>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {filtered.map((faq) => (
            <div key={faq.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <UnifiedButton type="button" onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="pr-2 text-sm text-foreground">{faq.question}</span>
                {openId === faq.id ? <ChevronUp size={16} className="text-theme-price" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </UnifiedButton>
              {openId === faq.id ? <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <SupportContactSection />
        </div>
      </div>
    </StoreStandardPageShell>
  );
}
