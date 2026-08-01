import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Settings2, ShieldCheck } from "lucide-react";
import "@/styles/fixed-storefront-overlays.css";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import {
  DEFAULT_TRACKING_CONSENT,
  getTrackingConsent,
  saveTrackingConsent,
  subscribeTrackingConsent,
  type TrackingConsentPreferences,
} from "@/utils/trackingConsent";
import { getStoreFixedBottomOffset } from "@/utils/storeBottomInset";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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

  const fixedBottom = useMemo(() => getStoreFixedBottomOffset(location.pathname), [location.pathname]);

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

  return (
    <div
      className="sf-fixed-consent"
      style={{ bottom: fixedBottom }}
    >
      <section className="sf-fixed-consent__panel" aria-labelledby="tracking-consent-title">
        <div className="sf-fixed-consent__header">
          <div className="sf-fixed-consent__copy">
            <p id="tracking-consent-title">Cookie 与隐私选择</p>
            <p>
              我们会使用必要 Cookie 保持网站正常运行。只有在你同意后，才会加载分析或广告追踪脚本。详细说明可查看{" "}
              <Link to={siteInfo.privacyPolicyPath || "/content/privacy-policy"}>
                隐私政策
              </Link>
              。
            </p>
          </div>
          <div className="sf-fixed-consent__actions">
            <UnifiedButton type="button" onClick={rejectOptional} className="sf-fixed-overlay-action">
              <ShieldCheck size={15} aria-hidden />
              仅必要
            </UnifiedButton>
            <UnifiedButton
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="sf-fixed-overlay-action"
              aria-expanded={expanded}
            >
              <Settings2 size={15} aria-hidden />
              自定义
            </UnifiedButton>
            <UnifiedButton type="button" onClick={acceptAll} className="sf-fixed-overlay-action is-primary">
              <Check size={15} aria-hidden />
              接受全部
            </UnifiedButton>
          </div>
        </div>

        {expanded && (
          <div className="sf-fixed-consent__preferences">
            <div className="sf-fixed-consent__preference-list">
              {categories.map((item) => (
                <label key={item.key} className="sf-fixed-consent__preference">
                  <input
                    type="checkbox"
                    checked={draft[item.key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="sf-fixed-consent__save">
              <UnifiedButton type="button" onClick={saveCustom} className="sf-fixed-overlay-action is-primary">
                <Check size={15} aria-hidden />
                保存选择
              </UnifiedButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
