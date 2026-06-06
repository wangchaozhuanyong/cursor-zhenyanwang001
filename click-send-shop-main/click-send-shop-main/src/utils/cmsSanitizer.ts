import createDOMPurify from "dompurify";
import type { Config } from "dompurify";

const CMS_SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4", "blockquote", "pre", "code",
    "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["href", "name", "target", "rel", "src", "alt", "title", "width", "height", "loading", "class"],
  ADD_URI_SAFE_ATTR: ["target"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/(?!\/))/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "meta", "link", "svg", "math"],
  FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
};

const CMS_AUTO_LINK_CLASS = "font-medium text-theme-price underline-offset-2 hover:underline";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;

type LinkMatch = {
  href: string;
  index: number;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeWithDomPurify(html: string): string {
  const purifierFactory = createDOMPurify as unknown as {
    sanitize?: (dirty: string, config?: Config) => string;
    (window: Window): { sanitize: (dirty: string, config?: Config) => string };
  };

  if (typeof window !== "undefined") {
    return purifierFactory(window).sanitize(html, CMS_SANITIZE_CONFIG);
  }

  if (typeof purifierFactory.sanitize === "function") {
    return purifierFactory.sanitize(html, CMS_SANITIZE_CONFIG);
  }

  return escapeHtml(html);
}

function isSafeCmsUrl(value: string): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.startsWith("/")) return !raw.startsWith("//");
  try {
    const url = new URL(raw);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizePhoneHref(text: string): string {
  const trimmed = text.trim();
  const digits = trimmed.replace(/\D/g, "");
  const phone = trimmed.startsWith("+") ? `+${digits}` : digits;
  return `tel:${phone}`;
}

function isLikelyPhone(text: string): boolean {
  const trimmed = text.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 15) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) return false;
  if (trimmed.startsWith("+") || trimmed.startsWith("0")) return true;
  return /[\s().-]/.test(trimmed);
}

function collectLinkMatches(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const email = match[0];
    matches.push({
      href: `mailto:${email}`,
      index: match.index ?? 0,
      text: email,
    });
  }

  for (const match of text.matchAll(PHONE_PATTERN)) {
    const phone = match[0];
    const index = match.index ?? 0;
    if (!isLikelyPhone(phone)) continue;
    if (matches.some((item) => index < item.index + item.text.length && item.index < index + phone.length)) continue;
    matches.push({
      href: normalizePhoneHref(phone),
      index,
      text: phone,
    });
  }

  return matches.sort((a, b) => a.index - b.index);
}

function linkifyTextNode(textNode: Text) {
  const text = textNode.textContent || "";
  const matches = collectLinkMatches(text);
  if (!matches.length) return;

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of matches) {
    if (match.index > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const anchor = document.createElement("a");
    anchor.setAttribute("href", match.href);
    anchor.setAttribute("class", CMS_AUTO_LINK_CLASS);
    anchor.textContent = match.text;
    fragment.append(anchor);
    cursor = match.index + match.text.length;
  }

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
}

function linkifyCmsContactText(html: string): string {
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(template.content, showText);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest("a,pre,code,kbd,samp")) continue;
    textNodes.push(node as Text);
  }

  textNodes.forEach(linkifyTextNode);
  hardenBlankTargetLinks(template.content);
  return template.innerHTML;
}

function hardenBlankTargetLinks(root: DocumentFragment): void {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    if (!isSafeCmsUrl(anchor.getAttribute("href") || "")) anchor.setAttribute("href", "#");
  });
  root.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    if (!isSafeCmsUrl(image.getAttribute("src") || "")) image.removeAttribute("src");
  });
  root.querySelectorAll<HTMLAnchorElement>("a[target]").forEach((anchor) => {
    const target = String(anchor.getAttribute("target") || "").trim().toLowerCase();
    if (target !== "_blank") return;
    anchor.setAttribute("target", "_blank");
    const relTokens = new Set(
      String(anchor.getAttribute("rel") || "")
        .split(/\s+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
    relTokens.add("noopener");
    relTokens.add("noreferrer");
    anchor.setAttribute("rel", Array.from(relTokens).join(" "));
  });
}

export function sanitizeCmsHtml(html: string): string {
  const sanitized = sanitizeWithDomPurify(String(html || ""));
  return linkifyCmsContactText(sanitized);
}
