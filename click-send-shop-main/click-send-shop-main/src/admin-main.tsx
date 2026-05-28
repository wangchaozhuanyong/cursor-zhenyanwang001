import { installBrowserCompatShims, installChunkLoadRecovery } from "@/lib/browserBoot";
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp.tsx";
import "./index.css";
import { ThemeRuntimeProvider } from "@/contexts/ThemeRuntimeProvider";

installBrowserCompatShims();
installChunkLoadRecovery("admin");

createRoot(document.getElementById("root")!).render(
  <ThemeRuntimeProvider>
    <AdminApp />
  </ThemeRuntimeProvider>,
);
