import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeCmsHtml } from "./cmsSanitizer";

let dom: JSDOM | null = null;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>");
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
});

afterEach(() => {
  vi.unstubAllGlobals();
  dom?.window.close();
  dom = null;
});

describe("sanitizeCmsHtml", () => {
  it("turns plain CMS phone and email text into contact links", () => {
    const html = sanitizeCmsHtml("<p>联系电话：+60182778801，邮箱：ppfzj1314@gmail.com</p>");

    expect(html).toContain('href="tel:+60182778801"');
    expect(html).toContain('href="mailto:ppfzj1314@gmail.com"');
    expect(html).toContain("联系电话");
  });

  it("does not double-link existing links or code samples", () => {
    const html = sanitizeCmsHtml(`
      <p><a href="tel:+60182778801">+60182778801</a></p>
      <pre>ppfzj1314@gmail.com</pre>
      <code>+60182778801</code>
    `);

    expect(html.match(/href="tel:\+60182778801"/g)).toHaveLength(1);
    expect(html).not.toContain('href="mailto:ppfzj1314@gmail.com"');
  });

  it("keeps unsafe CMS markup sanitized before linkifying", () => {
    const html = sanitizeCmsHtml('<p onclick="alert(1)">客服邮箱：ppfzj1314@gmail.com</p><script>alert(1)</script>');

    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
    expect(html).toContain('href="mailto:ppfzj1314@gmail.com"');
  });

  it("blocks unsafe CMS URL protocols", () => {
    const html = sanitizeCmsHtml('<a href="javascript:alert(1)">bad</a><img src="data:text/html;base64,PGgxPg==">');

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("src=");
  });

  it("adds tabnabbing protection for CMS links opened in a new tab", () => {
    const html = sanitizeCmsHtml('<p><a href="https://example.com" target="_blank">open</a></p>');

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
