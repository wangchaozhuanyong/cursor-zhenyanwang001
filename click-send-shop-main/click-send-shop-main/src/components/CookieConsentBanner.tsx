import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import {
  DEFAULT_TRACKING_CONSENT,
  getTrackingConsent,
  saveTrackingConsent,
  subscribeTrackingConsent,
  type TrackingConsentPreferences,
} from "@/utils/trackingConsent";
import { getStoreFixedBottomOffset } from "@/utils/storeBottomInset";

function enabled(value: unknown) {
  return value === "1" || value === "true" || value === true || value === "enabled";
}

export default function CookieConsentBanner() {
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const [storedConsent, setStoredConsent] = useState(() => getTrackingConsent());
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<TrackingConsentPreferences>(DEFAULT_TRACKING_CONSENT);

  useEffect(() => subscribeTrackingConsent(setStoredConsent), []);

  const categories = useMemo(() => {
    const items: { key: keyof TrackingConsentPreferences; label: string; description: string; available: boolean }[] = [
      {
        key: "analytics",
        label: "分析 Cookie",
        description: "帮助我们了解商品浏览、加购、结算等路径表现。",
        available: enabled(siteInfo.ga4Enabled) && !!siteInfo.ga4MeasurementId,
      },
      {
        key: "ads",
        label: "广告 Cookie",
        description: "用于广告像素与投放效果衡量，例如 Meta Pixel。",
        available: enabled(siteInfo.metaPixelEnabled) && !!siteInfo.metaPixelId,
      },
    ];
    return items.filter((item) => item.available);
  }, [siteInfo.ga4Enabled, siteInfo.ga4MeasurementId, siteInfo.metaPixelEnabled, siteInfo.metaPixelId]);

  useEffect(() => {
    setDraft({
      analytics: categories.some((item) => item.key === "analytics"),
      ads: categories.some((item) => item.key === "ads"),
    });
  }, [categories]);

  if (location.pathname.startsWith("/admin")) return null;
  if (storedConsent || categories.length === 0) return null;

  const acceptAll = () => {
    saveTrackingConsent({
      analytics: categories.some((item) => item.key === "analytics"),
      ads: categories.some((item) => item.key === "ads"),
    });
  };

  const rejectOptional = () => saveTrackingConsent(DEFAULT_TRACKING_CONSENT);
  const saveCustom = () => saveTrackingConsent(draft);

  const fixedBottom = useMemo(() => getStoreFixedBottomOffset(location.pathname), [location.pathname]);

  return (
    <div
      className="fixed inset-x-0 z-[70] px-4 pb-4"
      style={{ bottom: fixedBottom }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-md md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Cookie / 同意管理</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              我们会使用必要 Cookie 保持网站正常运行。只有在你同意后，才会加载分析或广告追踪脚本。详细说明可查看{" "}
              <Link to={siteInfo.privacyPolicyPath || "/content/privacy-policy"} className="font-medium text-theme-price underline-offset-2 hover:underline">
                隐私政策
              </Link>
              。
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2 md:justify-end">
            <button type="button" onClick={rejectOptional} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
              仅必要
            </button>
            <button type="button" onClick={() => setExpanded((v) => !v)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
              自定义
            </button>
            <button type="button" onClick={acceptAll} className="rounded-full btn-theme-price px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-gold/20">
              接受全部
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
            <div className="space-y-3">
              {categories.map((item) => (
                <label key={item.key} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={draft[item.key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-gold"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{item.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={saveCustom} className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
                保存选择
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
