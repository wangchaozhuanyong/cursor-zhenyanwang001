import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import {
  HOME_NAV_ICON_FRAME_CLASS,
  HOME_NAV_ITEM_CLASS,
  HOME_NAV_LABEL_CLASS,
} from "@/constants/homeLayout";
import { filterVisibleHomeNavItems } from "@/utils/homeNavCapabilities";
import { normalizeHomeNavText, openHomeNavItemTarget } from "@/utils/homeNavTarget";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function HomeNavLoadingSlots({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`${HOME_NAV_ITEM_CLASS} w-full min-w-0`} aria-hidden>
          <span className={`${HOME_NAV_ICON_FRAME_CLASS} skeleton-base skeleton-shimmer`} />
          <span className="skeleton-base skeleton-shimmer mt-1 h-3 w-12 rounded-full" />
        </div>
      ))}
    </>
  );
}

export default function HomeOpsBlocks() {
  const { settings: homeModules, navItems, ready } = useHomeModuleSettings();
  const capabilities = useSiteCapabilities();
  const navigate = useNavigate();

  const navSource = useMemo(() => {
    const raw = Array.isArray(navItems) ? navItems : [];
    return filterVisibleHomeNavItems(raw, capabilities);
  }, [navItems, capabilities]);

  if (homeModules.modules.nav_grid === false) return null;
  if (!ready) {
    return (
      <section className="store-nav-band" aria-busy="true" aria-label="快捷入口加载中">
        <div className="store-home-nav-grid grid grid-cols-5 gap-x-2 gap-y-4 px-2 py-2.5 sm:grid-cols-6 sm:gap-x-3 sm:px-4 md:grid-cols-6 lg:grid-cols-8 lg:px-6">
          <HomeNavLoadingSlots />
        </div>
      </section>
    );
  }
  if (!navSource.length) return null;

  return (
    <section className="store-nav-band">
      <div className="store-home-nav-grid grid grid-cols-5 gap-x-2 gap-y-4 px-2 py-2.5 sm:grid-cols-6 sm:gap-x-3 sm:px-4 md:grid-cols-6 lg:grid-cols-8 lg:px-6" role="navigation" aria-label="快捷入口">
        {navSource.slice(0, 15).map((item) => (
          <UnifiedButton
            key={item.id}
            type="button"
            onClick={() => openHomeNavItemTarget(item, capabilities, navigate, toast.error)}
            className={`${HOME_NAV_ITEM_CLASS} w-full min-w-0`}
          >
            <span className={HOME_NAV_ICON_FRAME_CLASS}>
              <HomeNavIcon value={item.icon_url} />
            </span>
            <span className={HOME_NAV_LABEL_CLASS}>{normalizeHomeNavText(item.title, "分类")}</span>
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}
