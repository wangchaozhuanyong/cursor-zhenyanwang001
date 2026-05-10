import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router-dom";
import * as contentService from "@/services/contentService";
import type { ContentPage } from "@/types/content";
import { useGoBack } from "@/hooks/useGoBack";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/**
 * 通用 CMS 内容页：与后台「内容管理」slug 对应，路由为 /content/:slug
 * （站点设置里的 privacyPolicyPath / termsPath 等应指向此处）
 */
export default function ContentCmsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const goBack = useGoBack();
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(page?.title || (loading ? "加载中" : error ? "内容" : ""));

  useEffect(() => {
    if (!slug.trim()) {
      setLoading(false);
      setError("缺少页面路径");
      return;
    }
    setLoading(true);
    setError(null);
    contentService
      .fetchContentBySlug(slug.trim())
      .then((p) => {
        setPage(p ?? null);
        if (!p) setError("未找到该页面");
      })
      .catch(() => {
        setPage(null);
        setError("加载失败");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="返回"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
            {loading ? "加载中…" : page?.title || "内容"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {error && !loading ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{error}</p>
        ) : null}
        {page?.content ? (
          <article
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : null}
        {!loading && !error && page && !page.content ? (
          <p className="text-sm text-muted-foreground">管理员尚未填写正文，请到后台「内容管理」编辑。</p>
        ) : null}
      </main>
    </div>
  );
}
