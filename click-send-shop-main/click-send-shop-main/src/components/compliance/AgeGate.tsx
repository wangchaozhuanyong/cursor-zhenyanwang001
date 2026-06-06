import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import {
  getSiteMinimumAge,
  isAgeConfirmedFor,
  isAgeGateEnabled,
  writeAgeGateConfirmation,
} from "@/utils/ageGate";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function isAgeGateExemptPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function AgeGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const capabilitiesReady = useSiteCapabilitiesReady();
  const minimumAge = getSiteMinimumAge(siteInfo);
  const enabled = isAgeGateEnabled(siteInfo);

  const [confirmed, setConfirmed] = useState(() => isAgeConfirmedFor(minimumAge));

  const syncConfirmed = useCallback(() => {
    setConfirmed(isAgeConfirmedFor(minimumAge));
  }, [minimumAge]);

  useEffect(() => {
    syncConfirmed();
    const onConfirmed = () => syncConfirmed();
    window.addEventListener("age-gate:confirmed", onConfirmed);
    window.addEventListener("age-gate:cleared", onConfirmed);
    return () => {
      window.removeEventListener("age-gate:confirmed", onConfirmed);
      window.removeEventListener("age-gate:cleared", onConfirmed);
    };
  }, [syncConfirmed]);

  if (isAgeGateExemptPath(location.pathname)) return null;

  if (!capabilitiesReady) {
    return (
      <div
        className="fixed inset-0 z-[9997] bg-background"
        aria-busy="true"
        aria-label="正在加载站点配置"
      />
    );
  }

  if (!enabled || confirmed) return null;

  const complianceText = (siteInfo.complianceNotice || "").trim();

  const handleConfirm = () => {
    writeAgeGateConfirmation(minimumAge);
    setConfirmed(true);
  };

  const handleDecline = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/about", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--theme-warning)_42%,var(--theme-border))] bg-[var(--theme-surface)] p-6 shadow-lg">
        <h1 id="age-gate-title" className="text-lg font-semibold text-[var(--theme-text)]">
          年龄确认
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          本网站可能包含受年龄或当地法规限制的商品与服务信息，仅面向符合法定年龄要求的用户。
          继续浏览即表示您确认已满 <strong className="text-[var(--theme-text)]">{minimumAge}</strong> 岁，并符合您所在地区的相关规定。
        </p>
        {complianceText ? (
          <p className="mt-2 text-xs leading-relaxed text-[var(--theme-text-muted)]">{complianceText}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <UnifiedButton
            type="button"
            onClick={handleDecline}
            className="rounded-lg border border-[var(--theme-border)] px-4 py-2.5 text-sm font-medium text-[var(--theme-text-muted)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))]"
          >
            离开网站
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]"
          >
            我已满 {minimumAge} 岁
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}
