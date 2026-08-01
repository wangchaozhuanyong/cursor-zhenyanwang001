import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderTree,
  Image,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { fetchStorefrontReadiness } from "@/services/admin/homeOpsService";
import type { StorefrontReadiness } from "@/types/storefrontReadiness";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
  THEME_TEXT_WARNING,
} from "@/utils/themeVisuals";

type CheckStatus = "ready" | "review" | "blocked";

type ReadinessCheck = {
  key: "banners" | "categories" | "navigation" | "products" | "compliance";
  title: string;
  description: string;
  status: CheckStatus;
  issueCount: number;
  total: number;
  detail: string;
  repairPath: string;
  repairLabel: string;
  icon: React.ElementType;
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  ready: "已完成",
  review: "待确认",
  blocked: "需修复",
};

const STATUS_CLASSES: Record<CheckStatus, string> = {
  ready: THEME_BADGE_SUCCESS,
  review: THEME_BADGE_WARNING,
  blocked: THEME_BADGE_DANGER,
};

function previewNames(names: string[], fallback: string) {
  if (!names.length) return fallback;
  const visible = names.slice(0, 5);
  const remaining = names.length - visible.length;
  return `${visible.join("、")}${remaining > 0 ? `，另有 ${remaining} 项` : ""}`;
}

function buildReadinessChecks(data: StorefrontReadiness): ReadinessCheck[] {
  const navIssueCount = data.navigation.invalid_count + data.navigation.external_review_count;
  const navStatus: CheckStatus = data.navigation.invalid_count > 0
    ? "blocked"
    : data.navigation.external_review_count > 0
      ? "review"
      : "ready";

  return [
    {
      key: "banners",
      title: "首页轮播双图",
      description: "每张轮播分别提供移动端与桌面端图片",
      status: data.banners.missing_count > 0 ? "blocked" : "ready",
      issueCount: data.banners.missing_count,
      total: data.banners.active_count,
      detail: previewNames(data.banners.items.map((item) => item.title), "全部轮播图片规格完整"),
      repairPath: "/admin/banners?media_status=responsive_missing&repair_scope=home",
      repairLabel: "修复轮播双图",
      icon: Image,
    },
    {
      key: "categories",
      title: "一级分类横幅",
      description: "检查当前分类是否使用正式审核素材",
      status: data.categories.review_count > 0 ? "review" : "ready",
      issueCount: data.categories.review_count,
      total: data.categories.visible_root_count,
      detail: previewNames(data.categories.items.map((item) => item.name), "全部一级分类已配置横幅"),
      repairPath: "/admin/categories?banner_status=review",
      repairLabel: "管理分类",
      icon: FolderTree,
    },
    {
      key: "navigation",
      title: "首页快捷入口",
      description: "入口必须指向可用分类、客服渠道或有效地址",
      status: navStatus,
      issueCount: navIssueCount,
      total: data.navigation.enabled_count,
      detail: previewNames([
        ...data.navigation.invalid_items.map((item) => item.title),
        ...data.navigation.external_items.map((item) => `${item.title}（外部地址）`),
      ], "全部快捷入口可正常访问"),
      repairPath: "/admin/home-ops?tab=nav&repair_scope=invalid",
      repairLabel: "修复快捷入口",
      icon: ShieldCheck,
    },
    {
      key: "products",
      title: "首页商品图片",
      description: "首页出现的商品需要封面图或可用规格图",
      status: data.products.missing_count > 0 ? "blocked" : "ready",
      issueCount: data.products.missing_count,
      total: data.products.home_count,
      detail: previewNames(data.products.items.map((item) => item.name), "全部首页商品已有有效图片"),
      repairPath: "/admin/products?media_status=missing&repair_scope=home",
      repairLabel: "筛选缺图商品",
      icon: PackageSearch,
    },
    {
      key: "compliance",
      title: "受限商品年龄确认",
      description: "存在烟草、酒水等受限分类时必须启用年龄确认",
      status: data.compliance.blocker_count > 0 ? "blocked" : "ready",
      issueCount: data.compliance.blocker_count > 0 ? data.compliance.restricted_category_count : 0,
      total: data.compliance.restricted_category_count,
      detail: data.compliance.blocker_count > 0
        ? `${previewNames(data.compliance.items.map((item) => item.name), "受限分类")}：当前未启用 ${data.compliance.minimum_age}+ 年龄确认`
        : data.compliance.restricted_category_count > 0
          ? `${data.compliance.restricted_category_count} 个受限分类已启用 ${data.compliance.minimum_age}+ 年龄确认`
          : "当前没有受年龄限制的公开分类",
      repairPath: "/admin/settings/site#compliance",
      repairLabel: "管理合规设置",
      icon: ShieldAlert,
    },
  ];
}

function statusTextClass(status: StorefrontReadiness["status"]) {
  if (status === "ready") return THEME_TEXT_SUCCESS;
  if (status === "needs_review") return THEME_TEXT_WARNING;
  return THEME_TEXT_DANGER;
}

export default function AdminStorefrontReadinessPanel() {
  const readinessQuery = useQuery({
    queryKey: adminQueryKeys.storefrontReadiness(),
    queryFn: fetchStorefrontReadiness,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (readinessQuery.isLoading && !readinessQuery.data) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 border-y border-border text-sm text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <Tx>正在检查当前客户端内容</Tx>
      </div>
    );
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-y border-border px-4 text-center">
        <AlertTriangle size={22} className={THEME_TEXT_DANGER} />
        <div>
          <p className="text-sm font-semibold text-foreground"><Tx>发布准备度检查失败</Tx></p>
          <p className="mt-1 text-xs text-muted-foreground"><Tx>没有修改任何数据，请重新检查。</Tx></p>
        </div>
        <UnifiedButton
          type="button"
          onClick={() => readinessQuery.refetch()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold"
        >
          <RefreshCw size={15} />
          <Tx>重新检查</Tx>
        </UnifiedButton>
      </div>
    );
  }

  const data = readinessQuery.data;
  const checks = buildReadinessChecks(data);
  const summaryLabel = data.status === "ready"
    ? "内容检查已通过"
    : data.status === "needs_review"
      ? "内容等待确认"
      : "内容尚未准备完成";

  return (
    <section aria-labelledby="storefront-readiness-title" className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {data.status === "ready"
              ? <CheckCircle2 size={19} className={THEME_TEXT_SUCCESS} />
              : <AlertTriangle size={19} className={statusTextClass(data.status)} />}
            <h2 id="storefront-readiness-title" className="text-base font-semibold text-foreground">
              <Tx>{summaryLabel}</Tx>
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            <Tx>这是当前站点的只读检查，不会自动修改轮播、分类、入口或商品。</Tx>
          </p>
        </div>
        <UnifiedButton
          type="button"
          onClick={() => readinessQuery.refetch()}
          disabled={readinessQuery.isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw size={15} className={readinessQuery.isFetching ? "animate-spin" : ""} />
          <Tx>刷新检查</Tx>
        </UnifiedButton>
      </header>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-background/50">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground"><Tx>阻塞项</Tx></p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${data.summary.blocker_count ? THEME_TEXT_DANGER : "text-foreground"}`}>
            {data.summary.blocker_count}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground"><Tx>待确认</Tx></p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${data.summary.review_count ? THEME_TEXT_WARNING : "text-foreground"}`}>
            {data.summary.review_count}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground"><Tx>检查通过</Tx></p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {data.summary.ready_check_count}/{data.summary.total_check_count}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div key={check.key} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-[var(--theme-primary)]">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{check.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[check.status]}`}>
                      {STATUS_LABELS[check.status]}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {check.issueCount > 0 ? `${check.issueCount}/${check.total} 项` : `${check.total} 项`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{check.description}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/80">{check.detail}</p>
                </div>
              </div>
              <Link
                to={check.repairPath}
                className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:border-[var(--theme-primary)]"
              >
                {check.repairLabel}
                <ArrowRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>

      <footer className="border-t border-border bg-background/50 px-4 py-2.5 text-xs text-muted-foreground">
        <Tx>检查时间：</Tx>
        {new Date(data.checked_at).toLocaleString("zh-CN", { hour12: false })}
      </footer>
    </section>
  );
}
