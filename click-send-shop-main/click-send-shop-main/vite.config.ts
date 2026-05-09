import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";

/**
 * Vite 8 / Rolldown 会在部分 chunk 开头注入对 `import.meta.resolve` 的运行时检测；
 * 多数浏览器与国产 WebView 尚未实现该 API，会在加载 polyfills / 主包时立刻抛错 → 整页白屏。
 * 该 side-effect import 对运行时无实质作用，构建后安全移除。
 */
function stripImportMetaResolveGuard(): Plugin {
  return {
    name: "strip-import-meta-resolve-guard",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const pattern = /import'data:text\/javascript,[^']+';/g;
      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk" || !item.code?.includes("import.meta.resolve")) continue;
        item.code = item.code.replace(pattern, "");
      }
    },
  };
}

/**
 * Vite 8（Rolldown dev）在部分环境下会漏替换 @vite/client 里的内部占位符，
 * 浏览器报 ReferenceError → 整页白屏。开发阶段对残留占位符做兜底替换。
 */
function replaceViteClientPlaceholders(): Plugin {
  const replacements: Record<string, string> = {
    __BUNDLED_DEV__: "false",
    __SERVER_FORWARD_CONSOLE__: "false",
  };

  return {
    name: "replace-vite-client-placeholders",
    apply: "serve",
    enforce: "post",
    transform(code) {
      let next = code;
      for (const [placeholder, value] of Object.entries(replacements)) {
        next = next.replaceAll(placeholder, value);
      }
      return next === code ? null : next;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // 上传接口返回的 /uploads/... 静态文件在 Node 上，开发时需同源代理才能预览
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    replaceViteClientPlaceholders(),
    react(),
    legacy({
      targets: ["Chrome >= 64", "Safari >= 12", "iOS >= 12", "Android >= 7", "not IE 11"],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
    stripImportMetaResolveGuard(),
  ],
  build: {
    cssTarget: ["chrome64", "safari12"],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (
            id.includes("/node_modules/react/")
            || id.includes("/node_modules/react-dom/")
            || id.includes("/node_modules/scheduler/")
            || id.includes("\\node_modules\\react\\")
            || id.includes("\\node_modules\\react-dom\\")
            || id.includes("\\node_modules\\scheduler\\")
          ) {
            return "vendor-react";
          }
          return "vendor-misc";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
