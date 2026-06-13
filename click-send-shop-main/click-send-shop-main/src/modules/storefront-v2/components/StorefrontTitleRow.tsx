import type { ReactNode } from "react";
import { storefrontV2Tokens as t } from "../design/tokens";

type StorefrontTitleRowProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function StorefrontTitleRow({ title, subtitle, action }: StorefrontTitleRowProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
      <div className="min-w-0">
        <h2 className={t.text.sectionTitle}>{title}</h2>
        {subtitle ? <p className={t.text.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
