import { useEffect, useState } from "react";

const FALLBACK_QR_COLORS = {
  foreground: "CanvasText",
  background: "Canvas",
};

function readThemeColor(variableName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
}

export function useThemeQrColors() {
  const [colors, setColors] = useState(FALLBACK_QR_COLORS);

  useEffect(() => {
    const sync = () => {
      setColors({
        foreground: readThemeColor("--theme-text", FALLBACK_QR_COLORS.foreground),
        background: readThemeColor("--theme-surface", FALLBACK_QR_COLORS.background),
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
