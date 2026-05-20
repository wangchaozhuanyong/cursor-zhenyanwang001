import DOMPurify from "dompurify";

export function sanitizeCmsHtml(html: string): string {
  return DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4", "blockquote", "pre", "code",
      "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "name", "target", "rel", "src", "alt", "title", "width", "height", "loading", "class"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/(?!\/))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "meta", "link", "svg", "math"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
