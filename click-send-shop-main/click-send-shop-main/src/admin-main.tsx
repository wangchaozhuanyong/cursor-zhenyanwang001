import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeRuntimeProvider } from "@/contexts/ThemeRuntimeProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeRuntimeProvider>
    <App />
  </ThemeRuntimeProvider>,
);
