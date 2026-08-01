import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  FIXED_ADMIN_APPEARANCE_CONFIGS,
  type AdminAppearanceMode,
} from "@/constants/fixedAdminAppearance";
import { generateThemePalette } from "@/utils/themeContrast";

const ADMIN_APPEARANCE_STORAGE_KEY = "admin_appearance_mode";

type AdminAppearanceContextValue = {
  mode: AdminAppearanceMode;
  setMode: (mode: AdminAppearanceMode) => void;
  toggleMode: () => void;
};

const AdminAppearanceContext = createContext<AdminAppearanceContextValue | null>(null);

function isAdminAppearanceMode(value: string | null): value is AdminAppearanceMode {
  return value === "light" || value === "dark";
}

export function readAdminAppearanceMode(): AdminAppearanceMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(ADMIN_APPEARANCE_STORAGE_KEY);
    return isAdminAppearanceMode(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

export function applyFixedAdminAppearance(root: HTMLElement, mode: AdminAppearanceMode) {
  const config = FIXED_ADMIN_APPEARANCE_CONFIGS[mode];
  const palette = generateThemePalette(config);

  Object.entries(palette).forEach(([name, value]) => root.style.setProperty(name, value));
  root.style.colorScheme = mode;
  root.classList.toggle("dark", mode === "dark");

  [
    "data-public-theme",
    "data-theme",
    "data-theme-skin-id",
    "data-theme-category",
    "data-theme-scene",
    "data-client-design-style",
    "data-admin-theme",
    "data-theme-admin-mode",
    "data-theme-ready",
    "data-theme-synced",
    "data-theme-density",
    "data-theme-button-style",
    "data-theme-nav-style",
    "data-theme-motion-level",
  ].forEach((name) => root.removeAttribute(name));

  root.setAttribute("data-admin-appearance", mode);
  root.setAttribute("data-admin-design", "fixed");
  root.setAttribute("data-density", config.density);
  root.setAttribute("data-motion", config.motionLevel);
}

export function AdminAppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AdminAppearanceMode>(readAdminAppearanceMode);

  const setMode = useCallback((nextMode: AdminAppearanceMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(ADMIN_APPEARANCE_STORAGE_KEY, nextMode);
    } catch {
      // The visual mode still applies for this tab when storage is unavailable.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  useLayoutEffect(() => {
    applyFixedAdminAppearance(document.documentElement, mode);
  }, [mode]);

  const value = useMemo<AdminAppearanceContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return <AdminAppearanceContext.Provider value={value}>{children}</AdminAppearanceContext.Provider>;
}

export function useAdminAppearance() {
  const context = useContext(AdminAppearanceContext);
  if (!context) {
    throw new Error("useAdminAppearance must be used within AdminAppearanceProvider");
  }
  return context;
}
