import { installBrowserCompatShims } from "@/lib/browserBoot";
import { createRoot } from "react-dom/client";
import StoreApp from "./StoreApp.tsx";
import "./index.css";
import { ThemeRuntimeProvider } from "@/contexts/ThemeRuntimeProvider";
import { initPwaOfflineNavigation, markStoreSpaReady } from "@/lib/pwaOfflineNavigation";

installBrowserCompatShims();
initPwaOfflineNavigation();

createRoot(document.getElementById("root")!).render(
  <ThemeRuntimeProvider>
    <StoreApp />
  </ThemeRuntimeProvider>,
);

markStoreSpaReady();
