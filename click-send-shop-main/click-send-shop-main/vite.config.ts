import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs/promises";

function resolveVendorChunkName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  if (!normalizedId.includes("/node_modules/")) return undefined;
  if (normalizedId.includes("recharts")) return "vendor-recharts";
  if (normalizedId.includes("framer-motion")) return "vendor-motion";
  if (normalizedId.includes("@radix-ui")) return "vendor-radix";
  if (normalizedId.includes("react-router") || normalizedId.includes("@remix-run")) return "vendor-router";
  if (normalizedId.includes("@tanstack/react-query")) return "vendor-query";
  if (normalizedId.includes("zustand")) return "vendor-state";
  if (normalizedId.includes("lucide-react")) return "vendor-icons";
  if (normalizedId.includes("qrcode.react")) return "vendor-qrcode";
  if (normalizedId.includes("sonner")) return "vendor-toast";
  if (normalizedId.includes("@imgly/background-removal") || normalizedId.includes("onnxruntime-web")) {
    return "vendor-imgly-matte";
  }

  if (
    normalizedId.includes("/node_modules/react/")
    || normalizedId.includes("/node_modules/react-dom/")
    || normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (
    normalizedId.includes("/node_modules/core-js/")
    || normalizedId.includes("/node_modules/regenerator-runtime/")
    || normalizedId.includes("/node_modules/@babel/")
  ) {
    return "vendor-legacy-polyfills";
  }

  const nodeModulesFragment = normalizedId.split("/node_modules/")[1];
  const packageSegments = nodeModulesFragment?.split("/") ?? [];
  const packageName = packageSegments[0]?.startsWith("@")
    ? `${packageSegments[0]}/${packageSegments[1] ?? ""}`
    : packageSegments[0];

  if (!packageName) return "vendor-misc";
  return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
}

/**
 * Vite 8 / Rolldown 会在部分 chunk 开头注入对 `import.meta.resolve` 的运行时检测；
 * 多数浏览器与国产 WebView 尚未实现该 API，会在加载 polyfills / 主包时立刻抛错 → 整页白屏。
 * 该 side-effect import 对运行时无实质作用，构建后安全移除。
 */
function stripImportMetaResolveGuard(): Plugin {
  const dataUriGuard = /import'data:text\/javascript,[^']+';/g;
  const typeofResolveGuard = /typeof\s+import\.meta\.resolve\s*===?\s*["']function["']\s*&&[^;]+;/g;

  function stripGuard(code: string) {
    let next = code.replace(dataUriGuard, "");
    next = next.replace(typeofResolveGuard, "");
    return next;
  }

  return {
    name: "strip-import-meta-resolve-guard",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk" && item.code?.includes("import.meta.resolve")) {
          item.code = stripGuard(item.code);
          continue;
        }
        if (
          item.type === "asset"
          && item.fileName.endsWith(".html")
          && typeof item.source === "string"
          && item.source.includes("import.meta.resolve")
        ) {
          item.source = stripGuard(item.source);
        }
      }
    },
  };
}

/** 面向中国常用 Chromium 壳 / 旧 Android WebView；默认开启，仅当 VITE_LEGACY_BUILD=0 时关闭 */
const CHINA_BROWSER_TARGETS = [
  "Chrome >= 64",
  "ChromeAndroid >= 64",
  "Safari >= 12",
  "iOS >= 12",
  "Android >= 7",
  "Samsung >= 9",
  "not IE 11",
] as const;

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

function serveAdminSpaInDev(): Plugin {
  return {
    name: "serve-admin-spa-in-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        const accept = req.headers.accept || "";
        if (req.method !== "GET" || !accept.includes("text/html") || !/^\/admin(?:\/|$)/.test(url)) {
          next();
          return;
        }

        try {
          const file = path.resolve(__dirname, "admin-index.html");
          const html = await server.transformIndexHtml(url, await fs.readFile(file, "utf8"));
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

function stripOriginHeaderForDevProxy(proxy: {
  on: (event: "proxyReq", listener: (proxyReq: { removeHeader: (name: string) => void }) => void) => void;
}) {
  proxy.on("proxyReq", (proxyReq) => {
    proxyReq.removeHeader("origin");
  });
}

const thirdPartyLoginEnabled = process.env.VITE_THIRD_PARTY_LOGIN_ENABLED === "true";
const legacyEnabled = process.env.VITE_LEGACY_BUILD !== "0";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
const isAdminBuild = mode === "admin" || process.env.VITE_APP_TARGET === "admin";
const buildOutDir = process.env.VITE_BUILD_OUT_DIR || (isAdminBuild ? "admin-dist" : "dist");

return ({
  define: {
    "import.meta.env.VITE_THIRD_PARTY_LOGIN_ENABLED": JSON.stringify(
      thirdPartyLoginEnabled ? "true" : "false",
    ),
  },
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
        configure: stripOriginHeaderForDevProxy,
      },
      // 上传接口返回的 /uploads/... 静态文件在 Node 上，开发时需同源代理才能预览
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
        configure: stripOriginHeaderForDevProxy,
      },
    },
  },
  plugins: [
    replaceViteClientPlaceholders(),
    serveAdminSpaInDev(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      outDir: buildOutDir,
      manifest: false,
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "favicon-32x32.png",
        "favicon.webp",
        "offline.html",
        "browser-preboot.js",
      ],
      workbox: {
        swDest: "sw.js",
        globIgnores: ["**/*.wasm", "**/ort*.mjs", "**/vendor-imgly-matte*.js"],
        navigateFallback: undefined,
        navigateFallbackDenylist: [
          /^\/(admin|cart|checkout|orders|settings|profile|address|coupons|notifications|returns|reviews\/pending|points|rewards|invite)(\/|$)/,
          /^\/api(\/|$)/,
          /^\/manifest\.webmanifest$/,
          /^\/pwa-/,
          /^\/apple-touch-icon\.png$/,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /^\/api\/(admin|auth|user|orders|cart|checkout|payment|upload)(\/|$)/.test(url.pathname),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/pwa/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname === "/manifest.webmanifest",
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url, request }) =>
              request.mode === "navigate"
              && /^\/(admin|cart|checkout|orders|settings|profile|address|coupons|notifications|returns|reviews\/pending|points|rewards|invite)(\/|$)/.test(url.pathname),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && url.pathname === "/api/home/bootstrap",
            handler: "NetworkFirst",
            options: {
              cacheName: "public-home-bootstrap-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && (
                url.pathname === "/api/content/site-info"
                || url.pathname === "/api/content/home-ops"
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-home-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 10,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && (
                url.pathname === "/api/categories"
                || url.pathname.startsWith("/api/categories/")
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-category-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && (
                url.pathname === "/api/products"
                || url.pathname === "/api/products/home"
                || url.pathname === "/api/products/tags"
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-product-list-cache",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && /^\/api\/products\/[^/]+(\/related)?$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-product-detail-cache",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 10,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && url.pathname.startsWith("/api/banners"),
            handler: "NetworkFirst",
            options: {
              cacheName: "public-banner-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET"
              && (
                url.pathname.startsWith("/api/content/")
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-content-cache",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url, request }) =>
              request.destination === "image"
              && (
                url.pathname.startsWith("/assets/")
                || url.pathname.startsWith("/uploads/")
                || url.pathname === "/apple-touch-icon.png"
                || url.pathname.startsWith("/pwa-")
                || url.pathname.includes("/banner")
                || url.pathname.includes("/category")
                || url.pathname.includes("/product")
                || url.pathname.includes("/logo")
              ),
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname === "/offline.html"
              || url.pathname.includes("favicon"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pwa-shell-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(legacyEnabled && !isAdminBuild
      ? [
          legacy({
            targets: [...CHINA_BROWSER_TARGETS],
            modernPolyfills: true,
            renderLegacyChunks: true,
          }),
        ]
      : []),
    stripImportMetaResolveGuard(),
  ],
  build: {
    outDir: buildOutDir,
    // 后台只运行在现代浏览器中；提高 target 可消除依赖中的 BigInt 兼容告警
    target: isAdminBuild ? "es2020" : undefined,
    sourcemap: false,
    cssTarget: ["chrome64", "safari12"],
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      input: isAdminBuild
        ? path.resolve(__dirname, "admin-index.html")
        : path.resolve(__dirname, "index.html"),
      checks: {
        pluginTimings: false,
      },
      output: {
        manualChunks(id) {
          return resolveVendorChunkName(id);
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@imgly/background-removal", "onnxruntime-web"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
});
