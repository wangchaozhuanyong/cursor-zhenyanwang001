import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, HelpCircle, MapPin, Search, TicketPercent } from "lucide-react";
import { Link } from "react-router-dom";
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
import type { LucideIcon } from "lucide-react";

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

const HELP_QUICK_ICONS: LucideIcon[] = [ClipboardList, MapPin, TicketPercent, HelpCircle];

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
  const categoryCounts = useMemo(() => {
    return faqCategories.map((category) => ({
      category,
      count: faqs.filter((item) => item.category === category).length,
    }));
  }, [faqCategories, faqs]);
  const quickCategories = useMemo(() => categoryCounts.slice(0, 4), [categoryCounts]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return faqs.filter((item) => {
      const categoryHit = !activeCategory || item.category === activeCategory;
      if (!categoryHit) return false;
      if (!q) return true;
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [activeCategory, faqs, keyword]);
  const showingFocusedList = Boolean(activeCategory || keyword.trim());
  const visibleFaqs = showingFocusedList ? filtered.slice(0, 10) : filtered.slice(0, 6);

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
      contentClassName="sf-next-account-main md:max-w-3xl xl:max-w-4xl"
      className="sf-next-page store-v12-page store-help-v12-page"
    >
      <SeoHead
        title={`帮助中心｜${siteName}`}
        description={`查看${siteName}常见问题、下单流程、支付配送、售后退款与账户说明。`}
        canonical={buildCanonical("/help")}
        robots="index,follow"
        jsonLd={[{ id: "faq-help", data: faqJsonLd }]}
      />

      <div className="store-help-v12-stack">
        <div className="store-help-v12-search">
          <Search size={15} aria-hidden />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索常见问题..."
            className="store-help-v12-search__input"
          />
        </div>
        <section className="store-help-v12-quick" aria-labelledby="store-help-quick-title">
          <div className="store-help-v12-section-head">
            <h2 id="store-help-quick-title">常用帮助</h2>
            {activeCategory ? (
              <UnifiedButton
                type="button"
                onClick={() => setActiveCategory(null)}
                className="store-help-v12-clear"
              >
                全部问题
              </UnifiedButton>
            ) : null}
          </div>
          <div className="store-help-v12-quick-grid">
            {quickCategories.map(({ category, count }, index) => {
              const Icon = HELP_QUICK_ICONS[index] || HelpCircle;
              const active = activeCategory === category;
              return (
                <UnifiedButton
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : category)}
                  className={`store-help-v12-quick-card ${active ? "is-active" : ""}`}
                  aria-pressed={active}
                >
                  <Icon size={22} aria-hidden />
                  <span>{category}</span>
                  <small>{count} 个问题</small>
                </UnifiedButton>
              );
            })}
          </div>
        </section>

        <section className="store-help-v12-faq-section" aria-labelledby="store-help-faq-title">
          <div className="store-help-v12-section-head">
            <h2 id="store-help-faq-title">{showingFocusedList ? "筛选结果" : "常见问题"}</h2>
            {showingFocusedList ? (
              <span>{filtered.length} 条</span>
            ) : null}
          </div>
          {filtered.length === 0 ? (
            <div className="store-help-v12-empty">
              <p className="text-sm font-semibold text-[var(--theme-text)]">没有找到匹配的问题</p>
              <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">换个关键词，或直接提交反馈。</p>
            </div>
          ) : null}
          <div className="store-help-v12-list">
            {visibleFaqs.map((faq) => (
              <div key={faq.id} className="store-help-v12-faq">
                <UnifiedButton type="button" onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="store-help-v12-faq__trigger">
                  <span>{faq.question}</span>
                  {openId === faq.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </UnifiedButton>
                {openId === faq.id ? <div className="store-help-v12-faq__answer">{faq.answer}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="store-help-v12-feedback" aria-labelledby="store-help-feedback-title">
          <h2 id="store-help-feedback-title">联系与反馈</h2>
          <Link to="/feedback" className="store-help-v12-feedback-link">
            <span>提交反馈</span>
            <ChevronRight size={18} aria-hidden />
          </Link>
        </section>
      </div>
    </StoreStandardPageShell>
  );
}
