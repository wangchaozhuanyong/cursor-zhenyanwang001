import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { cn } from "@/lib/utils";

type HomeSkinShowcaseProps = {
  audience: "guest" | "member";
  title: string;
  subtitle?: string;
  hero?: ReactNode;
  trust?: ReactNode;
  nav?: ReactNode;
  className?: string;
};

const skinCopy: Record<string, { kicker: string; sideTitle: string; sideNote: string }> = {
  polar: {
    kicker: "精选橱窗",
    sideTitle: "本地服务与好物",
    sideNote: "把搜索、分类和今日精选放在同一个清晰入口。",
  },
  moss: {
    kicker: "生活选品",
    sideTitle: "慢慢挑也很好逛",
    sideNote: "分类、保障和推荐保持轻盈，减少首屏压迫感。",
  },
  iris: {
    kicker: "编辑精选",
    sideTitle: "本周新意",
    sideNote: "用更像橱窗的层级承接新品、券和会员权益。",
  },
  newyear: {
    kicker: "节日礼遇",
    sideTitle: "新岁好礼",
    sideNote: "保留真实优惠与商品入口，只增强节日氛围。",
  },
  midautumn: {
    kicker: "月下礼集",
    sideTitle: "团圆好物",
    sideNote: "用更安静的层次承接礼盒、券包与本地配送。",
  },
};

function resolveSkinCopy(skinId: string) {
  return skinCopy[skinId] ?? skinCopy.polar;
}

type ShowcaseNavPlacement = "afterBody" | "beforeBody" | "insideRail";

function resolveShowcaseNavPlacement(homeLayout: string): ShowcaseNavPlacement {
  if (homeLayout === "runwayEditorial") return "beforeBody";
  if (homeLayout === "courtyardMasonry") return "insideRail";
  return "afterBody";
}

export default function HomeSkinShowcase({
  audience,
  title,
  subtitle,
  hero,
  trust,
  nav,
  className,
}: HomeSkinShowcaseProps) {
  const { skinId, themeConfig } = useThemeRuntime();
  const copy = resolveSkinCopy(skinId);
  const homeLayout = themeConfig.homeLayout ?? "classic";
  const navPlacement = resolveShowcaseNavPlacement(homeLayout);

  if (!hero && !trust && !nav) return null;

  const navBlock = nav ? (
    <div className="store-skin-showcase__nav" data-showcase-nav-placement={navPlacement}>
      {nav}
    </div>
  ) : null;
  const heroBlock = hero ? <div className="store-skin-showcase__hero">{hero}</div> : null;
  const railHasContent = Boolean(trust || (navBlock && navPlacement === "insideRail"));
  const railBlock = railHasContent ? (
    <aside className="store-skin-showcase__rail" aria-label={copy.sideTitle}>
      <div className="store-skin-showcase__note">
        <span>{copy.sideTitle}</span>
        <p>{copy.sideNote}</p>
      </div>
      {trust ? <div className="store-skin-showcase__trust">{trust}</div> : null}
      {navPlacement === "insideRail" ? navBlock : null}
    </aside>
  ) : null;

  return (
    <section
      className={cn("store-skin-showcase", className)}
      data-store-skin-showcase
      data-audience={audience}
      data-showcase-layout={homeLayout}
      data-showcase-nav-placement={navPlacement}
      data-showcase-has-rail={railHasContent ? "true" : "false"}
      aria-label="商城首页精选区域"
    >
      <span className="store-skin-showcase__texture" aria-hidden />
      <span className="store-skin-showcase__frame" aria-hidden />
      <span className="store-skin-showcase__medallion" aria-hidden />

      <div className="store-skin-showcase__head">
        <div className="min-w-0">
          <span className="store-skin-showcase__kicker">{copy.kicker}</span>
          <h2 className="store-skin-showcase__title">{title}</h2>
          {subtitle ? <p className="store-skin-showcase__subtitle">{subtitle}</p> : null}
        </div>
        <span className="store-skin-showcase__signal" aria-hidden>
          <span>{audience === "member" ? "MEMBER" : "STORE"}</span>
          <ArrowRight size={15} />
        </span>
      </div>

      {navPlacement === "beforeBody" ? navBlock : null}

      <div className="store-skin-showcase__body">
        {heroBlock}
        {railBlock}
      </div>

      {navPlacement === "afterBody" ? navBlock : null}
    </section>
  );
}
