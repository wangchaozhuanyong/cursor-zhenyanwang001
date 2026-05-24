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

  try {
    html.setAttribute("data-browser-core", "ok");
  } catch (_e2) {
    /* ignore */
  }
})(typeof window !== "undefined" ? window : globalThis);
