import { useRef, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOverlayDismiss } from "@/modules/micro-interactions/hooks/useOverlayDismiss";
import { useModalLayer } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import AdminSidebarNav from "./AdminSidebarNav";
import type { ResolvedNavItem } from "./adminNavConfig";

type AdminMobileSidebarDrawerProps = {
  open: boolean;
  navItems: ResolvedNavItem[];
  pathname: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onPreload?: (path: string) => void;
  onLogout: () => void;
  loggingOut: boolean;
  layoutTitle: string;
  logoutLabel: string;
  closeLabel: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export default function AdminMobileSidebarDrawer({
  open,
  navItems,
  pathname,
  onClose,
  onNavigate,
  onPreload,
  onLogout,
  loggingOut,
  layoutTitle,
  logoutLabel,
  closeLabel,
  returnFocusRef,
}: AdminMobileSidebarDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const { overlayZ, contentZ, isTop } = useModalLayer(open);

  useOverlayDismiss({
    open,
    onClose,
    isTop,
    lockBody: true,
    returnFocusRef,
    contentRef: drawerRef,
    autoFocus: true,
    trapFocus: true,
  });

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 lg:hidden" style={{ zIndex: overlayZ }}>
          <motion.button
            type="button"
            aria-label={closeLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={layoutTitle}
            tabIndex={-1}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="safe-area-pl absolute left-0 top-0 flex h-full w-[min(88vw,20rem)] max-w-sm flex-col overflow-hidden bg-[var(--theme-card)] shadow-2xl outline-none"
            style={{ zIndex: contentZ }}
          >
            <AdminSidebarNav
              scrollMode="overlay"
              navItems={navItems}
              pathname={pathname}
              onNavigate={onNavigate}
              onPreload={onPreload}
              onLogout={onLogout}
              loggingOut={loggingOut}
              onClose={onClose}
              layoutTitle={layoutTitle}
              logoutLabel={logoutLabel}
              closeLabel={closeLabel}
            />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
