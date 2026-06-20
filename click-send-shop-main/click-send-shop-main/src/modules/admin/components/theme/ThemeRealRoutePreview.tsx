import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import {
  THEME_PREVIEW_APPLY,
  THEME_PREVIEW_READY,
  buildThemePreviewUrl,
} from "@/lib/themePreviewBridge";
import { cn } from "@/lib/utils";
import { fetchProducts } from "@/services/productService";
import type { ThemeConfig } from "@/types/theme";
import {
  DEVICE_WIDTH,
  PREVIEW_DEVICE_LABELS,
  PREVIEW_ROUTE_SCENES,
  type PreviewDevice,
  type PreviewMode,
  type PreviewRouteMode,
} from "./themeStudioConstants";

type Props = {
  config: ThemeConfig;
  skinKey: string;
  mode: PreviewMode;
  device: PreviewDevice;
  onModeChange: (mode: PreviewMode) => void;
  onDeviceChange: (device: PreviewDevice) => void;
  fullscreen?: boolean;
};

type HealthStatus = "pending" | "ok" | "warn";

type HealthItem = {
  id: string;
  label: string;
  status: HealthStatus;
  detail?: string;
};

const DEVICE_ICONS: Record<PreviewDevice, LucideIcon> = {
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

function toRouteMode(mode: PreviewMode): PreviewRouteMode {
  if (mode === "admin" || mode === "components") return "admin_home";
  if (mode === "mobile") return "home";
  return mode;
}

function getScenePath(mode: PreviewRouteMode, productPath: string | null) {
  switch (mode) {
    case "home":
      return "/";
    case "category":
      return "/categories";
    case "product":
      return productPath ?? "/categories";
    case "cart":
      return "/cart";
    case "profile":
      return "/profile";
    case "admin_home":
      return "/admin";
    case "admin_products":
      return "/admin/products";
    case "admin_orders":
      return "/admin/orders";
    default:
      return "/";
  }
}

function formatAppliedTime(timestamp: number | null) {
  if (!timestamp) return "等待预览页就绪";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function getPendingHealth(): HealthItem[] {
  return [
    { id: "load", label: "页面加载", status: "pending" },
    { id: "theme", label: "草稿主题", status: "pending" },
    { id: "overflow", label: "横向溢出", status: "pending" },
    { id: "images", label: "图片状态", status: "pending" },
  ];
}

function buildThemeHealth(lastAppliedAt: number | null, frameReady: boolean): HealthItem {
  if (lastAppliedAt) {
    return {
      id: "theme",
      label: "草稿主题",
      status: "ok",
      detail: `已发送 ${formatAppliedTime(lastAppliedAt)}`,
    };
  }
  return {
    id: "theme",
    label: "草稿主题",
    status: frameReady ? "warn" : "pending",
    detail: frameReady ? "预览页未就绪，请刷新预览" : "等待预览页就绪",
  };
}

export default function ThemeRealRoutePreview({
  config,
  skinKey,
  mode,
  device,
  onModeChange,
  onDeviceChange,
  fullscreen = false,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inspectTimerRef = useRef<number | null>(null);
  const lastAppliedAtRef = useRef<number | null>(null);
  const routeMode = toRouteMode(mode);
  const [reloadKey, setReloadKey] = useState(0);
  const [productPath, setProductPath] = useState<string | null>(null);
  const [productStatus, setProductStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [frameReady, setFrameReady] = useState(false);
  const [previewTimedOut, setPreviewTimedOut] = useState(false);
  const [lastAppliedAt, setLastAppliedAt] = useState<number | null>(null);
  const [health, setHealth] = useState<HealthItem[]>(getPendingHealth);

  useEffect(() => {
    let cancelled = false;
    if (routeMode !== "product") return undefined;

    setProductStatus("loading");
    void fetchProducts({ page: 1, pageSize: 1, status: "active", sort: "newest" })
      .then((data) => {
        if (cancelled) return;
        const product = data.list?.[0];
        if (product?.id) {
          setProductPath(`/product/${product.id}`);
          setProductStatus("ready");
        } else {
          setProductPath(null);
          setProductStatus("empty");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setProductPath(null);
        setProductStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [routeMode]);

  const path = getScenePath(routeMode, productPath);
  const src = useMemo(
    () => buildThemePreviewUrl(path, {
      previewScene: routeMode,
      previewDevice: device,
      previewReload: reloadKey,
    }),
    [device, path, reloadKey, routeMode],
  );

  const postDraftTheme = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const appliedAt = Date.now();
    target.postMessage(
      {
        type: THEME_PREVIEW_APPLY,
        config,
        skinKey,
      },
      window.location.origin,
    );
    lastAppliedAtRef.current = appliedAt;
    setLastAppliedAt(appliedAt);
  }, [config, skinKey]);

  const inspectFrame = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.documentElement) {
        setHealth([
          { id: "load", label: "页面加载", status: frameReady ? "ok" : "pending" },
          buildThemeHealth(lastAppliedAtRef.current, frameReady),
          { id: "overflow", label: "横向溢出", status: "pending" },
          { id: "images", label: "图片状态", status: "pending" },
        ]);
        return;
      }

      const root = doc.documentElement;
      const body = doc.body;
      const viewportWidth = frame.clientWidth;
      const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
      const hasHorizontalOverflow = scrollWidth > viewportWidth + 3;
      const images = Array.from(doc.images);
      const brokenImages = images.filter((image) => image.complete && image.naturalWidth === 0).length;
      const interactiveCount = doc.querySelectorAll("a[href],button,input,select,textarea,[role='button']").length;

      setHealth([
        {
          id: "load",
          label: "页面加载",
          status: "ok",
          detail: interactiveCount > 0 ? `${interactiveCount} 个可交互元素` : "未检测到交互元素",
        },
        buildThemeHealth(lastAppliedAtRef.current, frameReady),
        {
          id: "overflow",
          label: "横向溢出",
          status: hasHorizontalOverflow ? "warn" : "ok",
          detail: hasHorizontalOverflow ? `内容宽 ${scrollWidth}px / 视口 ${viewportWidth}px` : "无",
        },
        {
          id: "images",
          label: "图片状态",
          status: brokenImages > 0 ? "warn" : "ok",
          detail: images.length === 0 ? "无图片" : brokenImages > 0 ? `${brokenImages} 张异常` : `${images.length} 张正常`,
        },
      ]);
    } catch {
      setHealth([
        { id: "load", label: "页面加载", status: frameReady ? "ok" : "pending" },
        buildThemeHealth(lastAppliedAtRef.current, frameReady),
        { id: "overflow", label: "横向溢出", status: "warn", detail: "无法读取预览页" },
        { id: "images", label: "图片状态", status: "warn", detail: "无法读取预览页" },
      ]);
    }
  }, [frameReady]);

  const scheduleInspection = useCallback(() => {
    if (inspectTimerRef.current) window.clearTimeout(inspectTimerRef.current);
    inspectTimerRef.current = window.setTimeout(() => {
      inspectFrame();
      inspectTimerRef.current = null;
    }, 360);
  }, [inspectFrame]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;
      if ((event.data as { type?: string }).type !== THEME_PREVIEW_READY) return;
      setFrameReady(true);
      postDraftTheme();
      scheduleInspection();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postDraftTheme, scheduleInspection]);

  useEffect(() => {
    postDraftTheme();
    scheduleInspection();
  }, [postDraftTheme, scheduleInspection]);

  useEffect(() => {
    setFrameReady(false);
    setPreviewTimedOut(false);
    lastAppliedAtRef.current = null;
    setLastAppliedAt(null);
    setHealth(getPendingHealth());
  }, [src]);

  useEffect(() => {
    if (frameReady) {
      setPreviewTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setPreviewTimedOut(true), 6000);
    return () => window.clearTimeout(timer);
  }, [frameReady, src]);

  useEffect(() => () => {
    if (inspectTimerRef.current) window.clearTimeout(inspectTimerRef.current);
  }, []);

  const width = DEVICE_WIDTH[device];
  const scene = PREVIEW_ROUTE_SCENES.find((item) => item.id === routeMode) ?? PREVIEW_ROUTE_SCENES[0];
  const productHint =
    routeMode !== "product"
      ? null
      : productStatus === "loading"
        ? "正在查找真实商品"
        : productStatus === "ready"
          ? "真实商品详情页"
          : productStatus === "error"
            ? "商品接口不可用，已显示分类页"
            : "无可用商品，已显示分类页";
  const deviceWidthStyle = width === "100%" ? "min(100%, 1280px)" : `${width}px`;
  const sceneGroups = [
    {
      id: "store",
      label: "客户端真实页面",
      scenes: PREVIEW_ROUTE_SCENES.filter((item) => item.group === "store"),
    },
    {
      id: "admin",
      label: "后台真实页面",
      scenes: PREVIEW_ROUTE_SCENES.filter((item) => item.group === "admin"),
    },
  ];

  return (
    <section
      className={cn(
        "flex h-full min-h-[580px] flex-col overflow-hidden rounded-xl border border-border bg-card",
        fullscreen && "min-h-0 rounded-none border-0 bg-transparent",
      )}
    >
      <div className="shrink-0 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{scene.label}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {productHint ?? (scene.group === "admin" ? "真实后台路由" : "真实前台路由")} · {formatAppliedTime(lastAppliedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <UnifiedButton
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
              title="刷新预览"
              aria-label="刷新预览"
            >
              <RefreshCw size={14} />
            </UnifiedButton>
            <UnifiedButton
              type="button"
              onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
              title="新窗口打开"
              aria-label="新窗口打开"
            >
              <ExternalLink size={14} />
            </UnifiedButton>
          </div>
        </div>

        <div className="mt-2 space-y-2">
          {sceneGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground">{group.label}</p>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {group.scenes.map((item) => (
                  <UnifiedButton
                    key={item.id}
                    type="button"
                    onClick={() => onModeChange(item.id)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      routeMode === item.id
                        ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </UnifiedButton>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-3 gap-1">
          {(Object.keys(PREVIEW_DEVICE_LABELS) as PreviewDevice[]).map((item) => {
            const Icon = DEVICE_ICONS[item];
            return (
              <UnifiedButton
                key={item}
                type="button"
                onClick={() => onDeviceChange(item)}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px]",
                  device === item ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
                title={PREVIEW_DEVICE_LABELS[item]}
              >
                <Icon size={13} />
                <span>{PREVIEW_DEVICE_LABELS[item]}</span>
              </UnifiedButton>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3">
        <div
          className={cn(
            "relative mx-auto h-full min-h-[520px] overflow-hidden bg-background shadow-sm",
            device === "phone"
              ? "rounded-[2rem] border-[10px] border-neutral-900 shadow-xl"
              : "rounded-xl border border-border",
            fullscreen && "min-h-[calc(100vh-210px)]",
          )}
          style={{ width: deviceWidthStyle, maxWidth: "100%" }}
        >
          <iframe
            ref={iframeRef}
            key={src}
            title="Theme live route preview"
            src={src}
            className="h-full min-h-[inherit] w-full border-0 bg-background"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            onLoad={() => {
              setFrameReady(true);
              postDraftTheme();
              scheduleInspection();
            }}
          />
          {!frameReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4 text-center">
              <div className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
                <Loader2 size={16} className="mx-auto mb-2 animate-spin text-[var(--theme-primary)]" />
                {previewTimedOut ? "预览页未响应，请刷新预览" : "正在加载真实预览"}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1 border-t border-border bg-card px-3 py-2">
        {health.map((item) => (
          <span
            key={item.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
              item.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              item.status === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
              item.status === "pending" && "border-border bg-muted text-muted-foreground",
            )}
            title={item.detail}
          >
            {item.status === "pending" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : item.status === "ok" ? (
              <CheckCircle2 size={12} />
            ) : (
              <AlertCircle size={12} />
            )}
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
