import type { ReactNode } from "react";
import { storefrontV2Tokens as t } from "../design/tokens";

type StorefrontTitleRowProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  subtitlePlacement?: "right" | "below";
};

export default function StorefrontTitleRow({
  title,
  subtitle,
  action,
  subtitlePlacement = "right",
}: StorefrontTitleRowProps) {
  const showSubtitleBelow = subtitlePlacement === "below";

  return (
    <div className="storefront-title-row mb-3 flex items-end justify-between gap-3 md:mb-4" data-subtitle-placement={subtitlePlacement}>
      <div className="min-w-0 flex-1">
        <h2 className={t.text.sectionTitle}>{title}</h2>
        {showSubtitleBelow && subtitle ? <p className={`${t.text.sectionSubtitle} storefront-title-row__subtitle`}>{subtitle}</p> : null}
      </div>
      {(!showSubtitleBelow && subtitle) || action ? (
        <div className="storefront-title-row__meta flex min-w-0 shrink-0 items-center justify-end gap-2">
          {!showSubtitleBelow && subtitle ? <p className={`${t.text.sectionSubtitle} storefront-title-row__subtitle`}>{subtitle}</p> : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
