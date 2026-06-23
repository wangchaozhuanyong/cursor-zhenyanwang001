import { Check, Copy, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SharePassCardProps = {
  inviteCode: string;
  qrCode: ReactNode;
  serial?: string;
  copyState?: "idle" | "loading" | "copied";
  disabled?: boolean;
  onCopyInviteCode?: (inviteCode: string) => void;
  className?: string;
};

export default function SharePassCard({
  inviteCode,
  qrCode,
  serial,
  copyState = "idle",
  disabled = false,
  onCopyInviteCode,
  className,
}: SharePassCardProps) {
  const copying = copyState === "loading";
  const copied = copyState === "copied";

  return (
    <article className={cn("sf-next-share-pass", className)}>
      <header className="sf-next-share-pass__header">
        <span className="sf-next-share-pass__eyebrow">
          SHARE PASS
        </span>

        {serial ? (
          <span className="sf-next-share-pass__serial">
            {serial}
          </span>
        ) : null}
      </header>

      <div className="sf-next-share-pass__body">
        <div className="min-w-0">
          <span className="sf-next-share-pass__label">
            邀请码
          </span>

          <p className="sf-next-share-pass__code">
            {inviteCode}
          </p>

          <p className="sf-next-share-pass__hint">
            复制后分享给好友
          </p>

          <div className="sf-next-share-pass__actions">
            <button
              type="button"
              className="sf-next-button sf-next-button--secondary"
              disabled={disabled || copying || !onCopyInviteCode}
              onClick={() => onCopyInviteCode?.(inviteCode)}
            >
              {copying ? (
                <LoaderCircle aria-hidden="true" size={17} />
              ) : copied ? (
                <Check aria-hidden="true" size={17} />
              ) : (
                <Copy aria-hidden="true" size={17} />
              )}

              {copying
                ? "复制中"
                : copied
                  ? "已复制"
                  : "复制邀请码"}
            </button>
          </div>
        </div>

        <div className="sf-next-share-pass__qr">
          {qrCode}
        </div>
      </div>
    </article>
  );
}
