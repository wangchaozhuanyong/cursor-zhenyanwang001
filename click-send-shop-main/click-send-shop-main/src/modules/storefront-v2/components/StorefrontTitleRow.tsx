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
  const hasSubtitle = Boolean(subtitle?.trim());
  const showSubtitleBelow = subtitlePlacement === "below";
  const rowClassName = [
    "storefront-title-row mb-3 flex justify-between gap-3 md:mb-4",
    hasSubtitle ? (showSubtitleBelow ? "items-start" : "items-end") : "items-center",
  ].join(" ");

  return (
    <div className={rowClassName} data-subtitle-placement={subtitlePlacement} data-has-subtitle={hasSubtitle ? "true" : "false"}>
      <div className="min-w-0 flex-1">
        <h2 className={t.text.sectionTitle}>{title}</h2>
        {showSubtitleBelow && hasSubtitle ? <p className={`${t.text.sectionSubtitle} storefront-title-row__subtitle`}>{subtitle}</p> : null}
      </div>
      {(!showSubtitleBelow && hasSubtitle) || action ? (
        <div className="storefront-title-row__meta flex min-w-0 shrink-0 items-center justify-end gap-2">
          {!showSubtitleBelow && hasSubtitle ? <p className={`${t.text.sectionSubtitle} storefront-title-row__subtitle`}>{subtitle}</p> : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
