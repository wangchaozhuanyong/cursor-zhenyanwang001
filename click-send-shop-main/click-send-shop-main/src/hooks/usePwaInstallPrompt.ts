import { useEffect, useState } from "react";
import { type DeferredPromptEvent, isStandaloneApp } from "@/utils/pwa";

export type PwaInstallResult = "accepted" | "dismissed" | "unavailable";

const INSTALL_PROMPT_CHECK_DELAY_MS = 1800;

export function usePwaInstallPrompt(onInstalled?: () => void) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [installPromptChecked, setInstallPromptChecked] = useState(() => isStandaloneApp());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
      setInstallPromptChecked(true);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstallPromptChecked(true);
      onInstalled?.();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const checkTimer = window.setTimeout(() => {
      setInstallPromptChecked(true);
    }, INSTALL_PROMPT_CHECK_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.clearTimeout(checkTimer);
    };
  }, [onInstalled]);

  const install = async (): Promise<PwaInstallResult> => {
    if (!deferredPrompt || installed) return "unavailable";
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        return "accepted";
      }
      return "dismissed";
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
      setInstallPromptChecked(true);
    }
  };

  return {
    hasInstallPrompt: Boolean(deferredPrompt),
    canInstall: Boolean(deferredPrompt) && !installed,
    installPromptChecked,
    install,
    installing,
    installed,
  };
}
