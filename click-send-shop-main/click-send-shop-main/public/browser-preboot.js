/**
 * Non-module preboot script. It runs before the React bundle so old browsers
 * and stale asset failures can show a clear fallback instead of a blank page.
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

  var LEGACY_STORAGE_KEY = "app:chunk-load-recovery";
  var STORAGE_PREFIX = "app:version-recovery:";
  var RECOVERY_WINDOW_MS = 10 * 60 * 1000;
  var AUTO_RELOAD_LIMIT = 1;
  var CLEANUP_TIMEOUT_MS = 4000;
  var FRESH_QUERY_PARAM = "__fresh";
  var NOTICE_ID = "chunk-load-recovery-notice";
  var GLOBAL_RECOVERY_FLAG = "__appVersionRecoveryInProgress__";
  var GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG = "__appVersionRecoverySuppressedUntil__";
  var CHUNK_LOAD_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w.-]+ failed|ChunkLoadError|error loading dynamically imported module|Unable to preload CSS|dynamically imported module|\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i;
  var APP_CACHE_RE = /workbox|precache|vite|pwa|app-shell|chunk/i;

  function normalizeAppName(appName) {
    var normalized = String(appName || "app").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    return normalized || "app";
  }

  function getAppName() {
    return /^\/admin(?:\/|$)/.test(global.location.pathname) ? "admin" : "storefront";
  }

  function getStorageKey(appName) {
    return STORAGE_PREFIX + normalizeAppName(appName);
  }

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

  function readRecoveryState(appName) {
    try {
      var raw = global.sessionStorage.getItem(getStorageKey(appName)) || global.sessionStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e3) {
      return null;
    }
  }

  function writeRecoveryState(appName, state) {
    try {
      global.sessionStorage.setItem(getStorageKey(appName), JSON.stringify(state));
      global.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_e4) {
      /* ignore */
    }
  }

  function resolveRecoveryPlan(appName, reason) {
    var now = Date.now();
    var last = readRecoveryState(appName);
    var sameRecoveryWindow = last && typeof last.firstAt === "number" && now - last.firstAt < RECOVERY_WINDOW_MS;
    var attempts = sameRecoveryWindow ? Math.max(0, Number(last.attempts || 0)) : 0;
    var firstAt = sameRecoveryWindow ? last.firstAt : now;
    var shouldAutoReload = attempts < AUTO_RELOAD_LIMIT;
    var reasonText = stringifyChunkReason(reason).slice(0, 500);
    return {
      shouldAutoReload: shouldAutoReload,
      isRepeatedFailure: !shouldAutoReload,
      state: {
        app: normalizeAppName(appName),
        firstAt: firstAt,
        lastAt: now,
        attempts: attempts + 1,
        reason: reasonText,
      },
    };
  }

  function reloadWithCacheBuster() {
    try {
      var nextUrl = new URL(global.location.href);
      nextUrl.searchParams.set(FRESH_QUERY_PARAM, String(Date.now()));
      global.location.replace(nextUrl.toString());
    } catch (_e5) {
      global.location.reload();
    }
  }

  function withTimeout(task, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timer = global.setTimeout(function () {
        resolve();
      }, timeoutMs);
      task.then(function (value) {
        global.clearTimeout(timer);
        resolve(value);
      }).catch(function (error) {
        global.clearTimeout(timer);
        reject(error);
      });
    });
  }

  function clearRuntimeCaches(hardResetServiceWorker) {
    var jobs = [];

    try {
      if (global.caches && global.caches.keys) {
        jobs.push(
          global.caches.keys().then(function (keys) {
            return Promise.all(
              keys
                .filter(function (key) {
                  return APP_CACHE_RE.test(key);
                })
                .map(function (key) {
                  return global.caches.delete(key);
                })
            );
          })
        );
      }
    } catch (_e5a) {
      /* ignore */
    }

    try {
      if (global.navigator && global.navigator.serviceWorker && global.navigator.serviceWorker.getRegistrations) {
        jobs.push(
          global.navigator.serviceWorker.getRegistrations().then(function (registrations) {
            return Promise.all(
              registrations.map(function (registration) {
                var updateTask = Promise.resolve();
                try {
                  updateTask = registration.update();
                } catch (_e5b) {
                  updateTask = Promise.resolve();
                }

                return updateTask.then(function () {
                  try {
                    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
                  } catch (_e5c) {
                    /* ignore */
                  }

                  if (!hardResetServiceWorker) return undefined;
                  try {
                    return registration.unregister();
                  } catch (_e5d) {
                    return undefined;
                  }
                });
              })
            );
          })
        );
      }
    } catch (_e5e) {
      /* ignore */
    }

    return Promise.all(
      jobs.map(function (job) {
        return job.catch(function () {
          return undefined;
        });
      })
    );
  }

  function removeRecoveryNotice() {
    try {
      var old = doc.getElementById(NOTICE_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_e6a) {
      /* ignore */
    }
  }

  function retryRecovery(appName) {
    if (global[GLOBAL_RECOVERY_FLAG]) return;
    global[GLOBAL_RECOVERY_FLAG] = true;
    showRecoveryNotice(appName, true);
    withTimeout(clearRuntimeCaches(true), CLEANUP_TIMEOUT_MS)
      .then(reloadWithCacheBuster)
      .catch(function () {
        global[GLOBAL_RECOVERY_FLAG] = false;
        showRecoveryNotice(appName, true);
      });
  }

  function showRecoveryNotice(appName, waitForManualRefresh) {
    try {
      removeRecoveryNotice();

      var el = doc.createElement("div");
      el.id = NOTICE_ID;
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
        + '<div style="font-size:16px;font-weight:700;margin-bottom:8px">'
        + (waitForManualRefresh ? "需要重新加载最新版" : "正在修复网站版本")
        + "</div>"
        + '<div style="font-size:13px;line-height:1.7;color:#4b5563;margin-bottom:16px">'
        + (waitForManualRefresh ? "自动修复后仍未成功，请点击下方按钮清理旧缓存并重新加载。" : "正在清理旧缓存，稍后会自动重新加载页面。")
        + "</div>"
        + '<button type="button" style="min-height:40px;border:0;border-radius:999px;background:#f97316;color:#fff;padding:0 18px;font-weight:700;cursor:pointer">重新加载</button>'
        + "</div>";
      var button = el.querySelector("button");
      if (button) {
        button.addEventListener("click", function () {
          retryRecovery(appName);
        });
      }
      (doc.body || doc.documentElement).appendChild(el);
    } catch (_e6) {
      /* ignore */
    }
  }

  function recoverFromChunkLoadError(reason) {
    if (!isChunkLoadFailure(reason)) return false;
    if (isRecoverySuppressed()) return false;
    if (global[GLOBAL_RECOVERY_FLAG]) return true;

    var appName = getAppName();
    var plan = resolveRecoveryPlan(appName, reason);
    global[GLOBAL_RECOVERY_FLAG] = true;
    writeRecoveryState(appName, plan.state);
    showRecoveryNotice(appName, plan.isRepeatedFailure);

    withTimeout(clearRuntimeCaches(plan.isRepeatedFailure), CLEANUP_TIMEOUT_MS)
      .then(function () {
        if (plan.shouldAutoReload) {
          reloadWithCacheBuster();
          return;
        }
        global[GLOBAL_RECOVERY_FLAG] = false;
      })
      .catch(function () {
        global[GLOBAL_RECOVERY_FLAG] = false;
        showRecoveryNotice(appName, true);
      });

    return true;
  }

  function isRecoverySuppressed() {
    return Number(global[GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG] || 0) > Date.now();
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
