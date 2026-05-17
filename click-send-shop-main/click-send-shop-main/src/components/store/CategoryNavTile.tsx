import type { Ref } from "react";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import {
  HOME_NAV_ICON_FRAME_CLASS,
  HOME_NAV_ITEM_CLASS,
  HOME_NAV_LABEL_CLASS,
} from "@/constants/homeLayout";
import { cn } from "@/lib/utils";

type CategoryNavTileProps = {
  label: string;
  iconValue: string;
  active?: boolean;
  onClick: () => void;
  btnRef?: Ref<HTMLButtonElement>;
  className?: string;
};

/** 分类页 / 搜索页金刚区：上图下文，与首页快捷入口一致 */
export default function CategoryNavTile({
  label,
  iconValue,
  active = false,
  onClick,
  btnRef,
  className,
}: CategoryNavTileProps) {
  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        HOME_NAV_ITEM_CLASS,
        "sm:flex-1 sm:max-w-[5.5rem]",
        active ? "opacity-100" : "opacity-90",
        className,
      )}
    >
      <span className={HOME_NAV_ICON_FRAME_CLASS}>
        <HomeNavIcon value={iconValue} />
      </span>
      <span
        className={cn(
          HOME_NAV_LABEL_CLASS,
          active && "font-semibold text-[var(--theme-text-on-surface)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}
