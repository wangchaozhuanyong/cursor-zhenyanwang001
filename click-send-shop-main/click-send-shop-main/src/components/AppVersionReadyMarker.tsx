import { useEffect } from "react";
import { markAppVersionReady } from "@/lib/browserBoot";

interface Props {
  appName: string;
  onReady?: () => void;
}

export default function AppVersionReadyMarker({ appName, onReady }: Props) {
  useEffect(() => {
    markAppVersionReady(appName);
    onReady?.();
  }, [appName, onReady]);

  return null;
}
