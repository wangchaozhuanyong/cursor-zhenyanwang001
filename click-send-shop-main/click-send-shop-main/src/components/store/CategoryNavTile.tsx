import type { Ref } from "react";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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
    <UnifiedButton
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "store-category-tile group flex h-[5.35rem] w-[5.35rem] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[1.15rem] border text-center transition duration-200 active:scale-[0.98]",
        "sm:flex-1 sm:max-w-[5.65rem]",
        active ? "is-active" : "opacity-95",
        className,
      )}
    >
      <span className="store-category-tile-icon flex h-10 w-10 shrink-0 items-center justify-center">
        <HomeNavIcon value={iconValue} />
      </span>
      <span
        className={cn(
          "store-category-tile-label w-full truncate px-1 text-[12.5px] font-semibold leading-tight",
          active && "font-bold",
        )}
      >
        {label}
      </span>
    </UnifiedButton>
  );
}
