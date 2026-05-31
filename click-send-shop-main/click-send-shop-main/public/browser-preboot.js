/**
 * 非模块脚本：在任何 ES module 之前执行，用于国产/旧内核浏览器的首屏兜底。
 * 由 index.html / admin-index.html 在 type=module 主包之前引入。
 */
(function (global) {
  "use strict";
  if (!global.document) return;

  var doc = global.document;
  var html = doc.documentElement;

  try {
    html.setAttribute("data-preboot", "1");
  } catch (_e) {
    /* ignore */
  }

  function showUnsupported(reason) {
    var root = doc.getElementById("root");
    if (!root) return;
    if (root.getAttribute("data-boot-status") === "ok") return;
    root.setAttribute("data-boot-status", "unsupported");
    root.setAttribute("data-boot-reason", reason);
    root.innerHTML =
      '<div style="max-width:22rem;margin:2rem auto;padding:1.25rem 1rem;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center;line-height:1.6">'
      + '<p style="font-size:1rem;font-weight:600;margin:0 0 .75rem">当前浏览器版本过低</p>'
      + '<p style="font-size:.875rem;color:#666;margin:0 0 1rem">请使用 Chrome、Edge、Safari、微信内置浏览器，或将百度/360/QQ 浏览器切换为<strong>极速模式</strong>后刷新。</p>'
      + '<button type="button" onclick="location.reload()" style="padding:.5rem 1rem;border-radius:.5rem;border:1px solid #ccc;background:#fff;font-size:.875rem">刷新页面</button>'
      + "</div>";
  }

  var ua = String(global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "");

  if (doc.documentMode || /MSIE |Trident\//.test(ua)) {
    showUnsupported("ie");
    return;
  }

  if (!global.Promise || !global.fetch || !global.URL || !global.URLSearchParams) {
    showUnsupported("missing-core");
    return;
  }

  var CHUNK_RECOVERY_STORAGE_KEY = "app:chunk-load-recovery";
  var CHUNK_RECOVERY_AUTO_RELOAD_WINDOW_MS = 10 * 60 * 1000;
  var CHUNK_LOAD_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w.-]+ failed|ChunkLoadError|error loading dynamically imported module|Unable to preload CSS|dynamically imported module|\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i;

  function stringifyChunkReason(reason) {
    if (!reason) return "";
    if (typeof reason === "string") return reason;
    var target = reason.target || {};
    return [
      reason.name,
      reason.message,
      reason.reason,
      reason.type,
      reason.src,
      reason.href,
      reason.url,
      reason.filename,
      target.src,
      target.href,
      reason.payload && reason.payload !== reason ? stringifyChunkReason(reason.payload) : "",
    ].filter(Boolean).join("\n");
  }

  function isChunkLoadFailure(reason) {
    return CHUNK_LOAD_ERROR_RE.test(stringifyChunkReason(reason));
  }

  function readChunkRecoveryState() {
    try {
      var raw = global.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e3) {
      return null;
    }
  }

  function writeChunkRecoveryState(state) {
    try {
      global.sessionStorage.setItem(CHUNK_RECOVERY_STORAGE_KEY, JSON.stringify(state));
    } catch (_e4) {
      /* ignore */
    }
  }

  function reloadWithCacheBuster() {
    try {
      var nextUrl = new URL(global.location.href);
      nextUrl.searchParams.set("__fresh", String(Date.now()));
      global.location.replace(nextUrl.toString());
    } catch (_e5) {
      global.location.reload();
    }
  }

  function clearChunkRecoveryCaches() {
    try {
      if (global.caches && global.caches.keys) {
        global.caches.keys().then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return /workbox|precache|vite|pwa|app-shell|chunk/i.test(key);
              })
              .map(function (key) {
                return global.caches.delete(key);
              })
          );
        }).catch(function () {});
      }
    } catch (_e5a) {
      /* ignore */
    }

    try {
      if (global.navigator && global.navigator.serviceWorker && global.navigator.serviceWorker.getRegistrations) {
        global.navigator.serviceWorker.getRegistrations().then(function (registrations) {
          return Promise.all(
            registrations.map(function (registration) {
              return registration.update();
            })
          );
        }).catch(function () {});
      }
    } catch (_e5b) {
      /* ignore */
    }
  }

  function showChunkRecoveryNotice(waitForManualRefresh) {
    try {
      var old = doc.getElementById("chunk-load-recovery-notice");
      if (old && old.parentNode) old.parentNode.removeChild(old);

      var el = doc.createElement("div");
      el.id = "chunk-load-recovery-notice";
      el.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "background:rgba(15,23,42,.52)",
        "backdrop-filter:blur(3px)",
        "font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      ].join(";");
      el.innerHTML =
        '<div style="max-width:360px;margin:16px;padding:20px;border-radius:18px;background:#fff;color:#111827;text-align:center;box-shadow:0 20px 45px rgba(15,23,42,.24)">'
        + '<div style="font-size:16px;font-weight:700;margin-bottom:8px">网站版本已更新</div>'
        + '<div style="font-size:13px;line-height:1.7;color:#4b5563;margin-bottom:16px">'
        + (waitForManualRefresh ? "自动刷新后仍未加载成功，请手动刷新页面。" : "正在刷新页面以加载最新版本。")
        + "</div>"
        + '<button type="button" style="min-height:40px;border:0;border-radius:999px;background:#f97316;color:#fff;padding:0 18px;font-weight:700;cursor:pointer">立即刷新</button>'
        + "</div>";
      var button = el.querySelector("button");
      if (button) button.addEventListener("click", reloadWithCacheBuster);
      (doc.body || doc.documentElement).appendChild(el);
    } catch (_e6) {
      /* ignore */
    }
  }

  function recoverFromChunkLoadError(reason) {
    if (!isChunkLoadFailure(reason)) return false;
    try {
      var now = Date.now();
      var last = readChunkRecoveryState();
      var sameRecoveryWindow = last && typeof last.firstAt === "number" && now - last.firstAt < CHUNK_RECOVERY_AUTO_RELOAD_WINDOW_MS;
      var attempts = sameRecoveryWindow ? Math.max(0, Number(last.attempts || 0)) : 0;
      var firstAt = sameRecoveryWindow ? last.firstAt : now;
      var waitForManualRefresh = attempts >= 1;
      writeChunkRecoveryState({ app: "preboot", firstAt: firstAt, lastAt: now, attempts: attempts + 1 });
      clearChunkRecoveryCaches();
      showChunkRecoveryNotice(waitForManualRefresh);
      if (!waitForManualRefresh) global.setTimeout(reloadWithCacheBuster, 300);
      return true;
    } catch (_e7) {
      showChunkRecoveryNotice(true);
      return true;
    }
  }

  global.addEventListener("error", function (event) {
    var target = event && event.target ? event.target : {};
    var resourceUrl = target.src || target.href || "";
    if (recoverFromChunkLoadError(event.error || event.message || { src: resourceUrl })) {
      if (event.preventDefault) event.preventDefault();
    }
  }, true);
  global.addEventListener("unhandledrejection", function (event) {
    if (recoverFromChunkLoadError(event.reason) && event.preventDefault) event.preventDefault();
  });
  global.addEventListener("vite:preloadError", function (event) {
    if (recoverFromChunkLoadError(event.payload || event) && event.preventDefault) event.preventDefault();
  });

  try {
    html.setAttribute("data-browser-core", "ok");
  } catch (_e2) {
    /* ignore */
  }
})(typeof window !== "undefined" ? window : globalThis);
