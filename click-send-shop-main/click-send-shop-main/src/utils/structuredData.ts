import type { SiteInfo } from "@/types/content";
import type { Product } from "@/types/product";
import { getPublicSiteUrl, stripHtml, toAbsoluteUrl, truncateText } from "@/utils/seo";
import { isRestrictedProduct } from "@/utils/restrictedProduct";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";

export function buildWebsiteJsonLd(siteInfo: SiteInfo) {
  const siteUrl = getPublicSiteUrl();
  const siteName = (siteInfo.siteName || "大马通").trim();
  const description = truncateText(stripHtml(siteInfo.seoDescription || siteInfo.siteDescription || ""), 180);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?keyword={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationJsonLd(siteInfo: SiteInfo) {
  const siteUrl = getPublicSiteUrl();
  const siteName = (siteInfo.siteName || "大马通").trim();
  const description = truncateText(stripHtml(siteInfo.seoDescription || siteInfo.siteDescription || ""), 180);
  let extraLinks: string[] = [];
  try {
    const parsed = JSON.parse(String(siteInfo.otherSocialLinks || "[]"));
    if (Array.isArray(parsed)) extraLinks = parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    extraLinks = [];
  }
  const links = [siteInfo.whatsappUrl, siteInfo.facebookUrl, siteInfo.instagramUrl, siteInfo.tiktokUrl, siteInfo.xhsUrl, siteInfo.youtubeUrl, ...extraLinks]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: toAbsoluteUrl(resolveSiteLogoUrl(siteInfo)),
    description,
    sameAs: links,
  };
}

export function buildProductJsonLd(product: Product) {
  if (!product || isRestrictedProduct(product)) return null;
  const siteUrl = getPublicSiteUrl();
  const productUrl = `${siteUrl}/product/${product.id}`;
  const image = toAbsoluteUrl(product.cover_image || product.images?.[0] || "");
  const description = truncateText(stripHtml(product.description || ""), 200);
  const price = Number(product.price);
  const stock = Number(product.stock || 0);

  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    sku: product.default_variant?.sku_code || product.id,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "MYR",
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  if (image) out.image = [image];
  if (Number.isFinite(price) && price >= 0) (out.offers as Record<string, unknown>).price = price;
  return out;
}
