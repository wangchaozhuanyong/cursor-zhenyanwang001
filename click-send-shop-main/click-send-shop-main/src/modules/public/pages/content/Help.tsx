import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Headphones, Search } from "lucide-react";
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
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";

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
  const activeCategoryKey = activeCategory || "all";
  const categoryCounts = useMemo(() => {
    return faqCategories.map((category) => ({
      category,
      count: faqs.filter((item) => item.category === category).length,
    }));
  }, [faqCategories, faqs]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return faqs.filter((item) => {
      const categoryHit = !activeCategory || item.category === activeCategory;
      if (!categoryHit) return false;
      if (!q) return true;
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [activeCategory, faqs, keyword]);
  const { containerRef: categoryRailRef, setItemRef: setCategoryRef, scrollToKey: scrollCategoryToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(activeCategoryKey, categoryCounts.length);

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
      className="store-v12-page store-help-v12-page"
    >
      <SeoHead
        title={`帮助中心｜${siteName}`}
        description={`查看${siteName}常见问题、下单流程、支付配送、售后退款与账户说明。`}
        canonical={buildCanonical("/help")}
        robots="index,follow"
        jsonLd={[{ id: "faq-help", data: faqJsonLd }]}
      />

      <div className="mx-auto w-full max-w-lg md:max-w-none">
        <section className="mb-3 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
              <Headphones size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--theme-text)]">下单、配送、售后和账户问题都可以先在这里查</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--theme-muted)]">
                共 {faqs.length} 条常见问题，找不到答案可以直接联系官方客服。
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[var(--theme-bg)] px-3 py-2">
              <p className="text-[11px] text-[var(--theme-muted)]">问题分类</p>
              <p className="mt-1 text-lg font-black text-[var(--theme-text)]">{faqCategories.length}</p>
            </div>
            <div className="rounded-xl bg-[var(--theme-bg)] px-3 py-2">
              <p className="text-[11px] text-[var(--theme-muted)]">当前结果</p>
              <p className="mt-1 text-lg font-black text-[var(--theme-text)]">{filtered.length}</p>
            </div>
            <div className="rounded-xl bg-[var(--theme-bg)] px-3 py-2">
              <p className="text-[11px] text-[var(--theme-muted)]">客服入口</p>
              <p className="mt-1 text-lg font-black text-[var(--theme-text)]">已接入</p>
            </div>
          </div>
        </section>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索常见问题..."
            className="h-12 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pl-10 pr-3 text-sm font-medium text-[var(--theme-text)] shadow-[var(--theme-shadow)] outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_46%,var(--theme-border))]"
          />
        </div>
        <div ref={categoryRailRef} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch] md:flex-wrap md:overflow-visible">
          <UnifiedButton
            ref={(el) => setCategoryRef("all", el)}
            type="button"
            onClick={() => {
              scrollCategoryToKey("all");
              setActiveCategory(null);
            }}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold ${!activeCategory ? "btn-theme-price" : "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
          >
            <span>全部</span>
            <span>{faqs.length}</span>
          </UnifiedButton>
          {categoryCounts.map(({ category, count }) => {
            const active = activeCategory === category;
            return (
              <UnifiedButton
                key={category}
                ref={(el) => setCategoryRef(category, el)}
                type="button"
                onClick={() => {
                  const nextCategory = active ? null : category;
                  scrollCategoryToKey(nextCategory || "all");
                  setActiveCategory(nextCategory);
                }}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold ${active ? "btn-theme-price" : "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
              >
                <span>{category}</span>
                <span>{count}</span>
              </UnifiedButton>
            );
          })}
        </div>
        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-8 text-center shadow-[var(--theme-shadow)]">
              <p className="text-sm font-semibold text-[var(--theme-text)]">没有找到匹配的问题</p>
              <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">换个关键词，或直接联系官方客服。</p>
            </div>
          ) : null}
          {filtered.map((faq) => (
            <div key={faq.id} className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]">
              <UnifiedButton type="button" onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
                <span className="pr-2 text-sm font-semibold text-[var(--theme-text)]">{faq.question}</span>
                {openId === faq.id ? <ChevronUp size={16} className="text-theme-price" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </UnifiedButton>
              {openId === faq.id ? <div className="border-t border-[var(--theme-border)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-muted)]">{faq.answer}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <SupportContactSection />
        </div>
      </div>
    </StoreStandardPageShell>
  );
}
