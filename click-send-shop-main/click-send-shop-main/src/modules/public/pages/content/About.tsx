import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import PageHeader from "@/components/PageHeader";

export default function About() {
  const goBack = useGoBack();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "大马通";

  return (
    <div className="min-h-screen bg-background pb-6">
      <SeoHead
        title="关于大马通｜马来西亚华人生活服务平台"
        description="了解大马通平台定位、服务范围和联系方式。大马通面向马来西亚华人用户，提供生活服务、项目咨询与合规精选好物信息。"
        canonical={buildCanonical("/about")}
        robots="index,follow"
      />
      <PageHeader title="关于我们" onBack={goBack} />
      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">{siteName}</h2>
          <p className="mt-2 text-sm text-muted-foreground">马来西亚华人一站式生活服务与合规精选好物平台</p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          大马通面向马来西亚华人用户，提供签证咨询、留学申请、第二家园、商业装修、本地生活服务与合规精选好物信息。平台支持中文沟通，适用地区以马来西亚本地为主。
        </section>
      </main>
    </div>
  );
}
