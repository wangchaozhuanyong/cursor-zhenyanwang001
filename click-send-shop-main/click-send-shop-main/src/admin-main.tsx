import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp.tsx";
import "./index.css";
import { ThemeRuntimeProvider } from "@/contexts/ThemeRuntimeProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeRuntimeProvider>
    <AdminApp />
  </ThemeRuntimeProvider>,
);
