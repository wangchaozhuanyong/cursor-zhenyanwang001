import { installBrowserCompatShims, installChunkLoadRecovery } from "@/lib/browserBoot";
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp.tsx";
import "./index.css";
import "@/styles/admin.css";
import { AdminAppearanceProvider } from "@/contexts/AdminAppearanceProvider";
import AppVersionReadyMarker from "@/components/AppVersionReadyMarker";

installBrowserCompatShims();
installChunkLoadRecovery("admin");

createRoot(document.getElementById("root")!).render(
  <AdminAppearanceProvider>
    <AppVersionReadyMarker appName="admin" />
    <AdminApp />
  </AdminAppearanceProvider>,
);
