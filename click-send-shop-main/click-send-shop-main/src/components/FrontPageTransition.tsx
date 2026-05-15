import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

export default function FrontPageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { themeConfig } = useThemeRuntime();
  const level = themeConfig.motionLevel;

  if (level === "none") return <>{children}</>;

  return (
    <motion.div
      key={location.pathname}
      initial={level === "rich" ? { opacity: 0, y: 8 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: level === "rich" ? 0.2 : 0.14, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
