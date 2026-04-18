import { useNavigate } from "react-router-dom";
import { Home, SearchX } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-light">
          <SearchX size={36} className="text-gold" />
        </div>
        <h1 className="font-display text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">抱歉，您访问的页面不存在</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.97]"
        >
          <Home size={16} /> 返回首页
        </button>
      </motion.div>
    </div>
  );
}
