import { useEffect, useState } from "react";
import { fetchLoyaltyConfig, type LoyaltyConfig } from "@/services/loyaltyService";

let cachedLoyaltyConfig: LoyaltyConfig | null = null;
let loyaltyConfigRequest: Promise<LoyaltyConfig> | null = null;

function loadLoyaltyConfig() {
  if (cachedLoyaltyConfig) return Promise.resolve(cachedLoyaltyConfig);
  if (!loyaltyConfigRequest) {
    loyaltyConfigRequest = fetchLoyaltyConfig()
      .then((cfg) => {
        cachedLoyaltyConfig = cfg;
        return cfg;
      })
      .finally(() => {
        loyaltyConfigRequest = null;
      });
  }
  return loyaltyConfigRequest;
}

export function useLoyaltyVisibility() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(cachedLoyaltyConfig);
  const [loading, setLoading] = useState(!cachedLoyaltyConfig);

  useEffect(() => {
    let cancelled = false;
    if (cachedLoyaltyConfig) {
      setConfig(cachedLoyaltyConfig);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    loadLoyaltyConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
      })
      .catch(() => {
        if (cancelled) return;
        setConfig(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
