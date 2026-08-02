import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useStableBack } from "@/hooks/useStableBack";
import {
  getSiteMinimumAge,
  isAgeConfirmedFor,
  isAgeGateEnabled,
  writeAgeGateConfirmation,
} from "@/utils/ageGate";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import {
  BLOCKING_ACCESS_GATE_PRIORITY,
  BlockingAccessDialog,
  BlockingAccessDialogDescription,
  BlockingAccessDialogTitle,
} from "@/components/compliance/BlockingAccessDialog";
import { Check, LogOut, ShieldCheck } from "lucide-react";
import "@/styles/fixed-storefront-overlays.css";

function isAgeGateExemptPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function AgeGate() {
  const location = useLocation();
  const stableBack = useStableBack({ fallbackPath: "/about" });
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
    stableBack();
  };

  return (
    <BlockingAccessDialog
      gateId="age"
      priority={BLOCKING_ACCESS_GATE_PRIORITY.age}
      panelClassName="is-age-gate"
    >
      <span className="sf-fixed-access-gate__icon" aria-hidden>
        <ShieldCheck size={22} />
      </span>
      <div className="sf-fixed-access-gate__copy">
        <p className="sf-fixed-access-gate__eyebrow">访问验证</p>
        <BlockingAccessDialogTitle>年龄确认</BlockingAccessDialogTitle>
        <BlockingAccessDialogDescription>
          本网站可能包含受年龄或当地法规限制的商品与服务信息，仅面向符合法定年龄要求的用户。
          继续浏览即表示您确认已满 <strong>{minimumAge}</strong> 岁，并符合您所在地区的相关规定。
        </BlockingAccessDialogDescription>
        {complianceText ? <p className="sf-fixed-access-gate__notice">{complianceText}</p> : null}
      </div>
      <div className="sf-fixed-access-gate__actions">
        <UnifiedButton
          type="button"
          onClick={handleDecline}
          className="sf-fixed-overlay-action"
        >
          <LogOut size={16} aria-hidden />
          离开网站
        </UnifiedButton>
        <UnifiedButton
          type="button"
          onClick={handleConfirm}
          className="sf-fixed-overlay-action is-primary"
        >
          <Check size={16} aria-hidden />
          我已满 {minimumAge} 岁
        </UnifiedButton>
      </div>
    </BlockingAccessDialog>
  );
}
