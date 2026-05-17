import { useEffect, useState } from "react";
import { fetchLoyaltyConfig, type LoyaltyConfig } from "@/services/loyaltyService";

export function useLoyaltyVisibility() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLoyaltyConfig()
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

