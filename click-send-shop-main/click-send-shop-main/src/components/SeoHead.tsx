import { useEffect } from "react";
import {
  removeJsonLd,
  upsertJsonLd,
  upsertLinkRel,
  upsertMetaByName,
  upsertMetaByProperty,
} from "@/utils/seo";

export type SeoHeadProps = {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  ogSiteName?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  googleSiteVerification?: string;
  jsonLd?: Array<{ id: string; data: object }>;
};

export default function SeoHead(props: SeoHeadProps) {
  useEffect(() => {
    const {
      title,
      description,
      keywords,
      canonical,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      ogSiteName,
      twitterTitle,
      twitterDescription,
      twitterImage,
      googleSiteVerification,
      jsonLd,
    } = props;

    if (title?.trim()) document.title = title.trim();

    const finalRobots = (robots || "index,follow").trim();
    const finalOgTitle = (ogTitle || title || "").trim();
    const finalOgDescription = (ogDescription || description || "").trim();
    const finalTwitterTitle = (twitterTitle || title || "").trim();
    const finalTwitterDescription = (twitterDescription || description || "").trim();
    const finalOgType = (ogType || "website").trim();

    upsertMetaByName("description", description);
    if (keywords?.trim()) upsertMetaByName("keywords", keywords);
    upsertMetaByName("robots", finalRobots);
    if (canonical?.trim()) {
      upsertLinkRel("canonical", canonical);
      upsertMetaByProperty("og:url", canonical);
    }
    upsertMetaByProperty("og:title", finalOgTitle);
    upsertMetaByProperty("og:description", finalOgDescription);
    upsertMetaByProperty("og:type", finalOgType);
    if (ogSiteName?.trim()) upsertMetaByProperty("og:site_name", ogSiteName);
    if (ogImage?.trim()) upsertMetaByProperty("og:image", ogImage);

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", finalTwitterTitle);
    upsertMetaByName("twitter:description", finalTwitterDescription);
    if (twitterImage?.trim()) upsertMetaByName("twitter:image", twitterImage);
    if (googleSiteVerification?.trim()) upsertMetaByName("google-site-verification", googleSiteVerification);

    const ids = new Set<string>();
    (jsonLd || []).forEach((item) => {
      if (!item?.id || !item?.data) return;
      ids.add(item.id);
      upsertJsonLd(item.id, item.data);
    });

    document.head
      .querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"][data-seo-id]')
      .forEach((el) => {
        const id = el.getAttribute("data-seo-id") || "";
        if (!ids.has(id)) removeJsonLd(id);
      });
  }, [props]);

  return null;
}
