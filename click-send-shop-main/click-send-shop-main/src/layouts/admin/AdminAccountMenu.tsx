import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Languages, LogOut } from "lucide-react";
import AdminAccountSettingsTrigger from "@/components/admin/AdminAccountSettingsTrigger";
import AnchoredMenu from "@/components/admin/AnchoredMenu";
import { AdminOrderVoiceMenuItems } from "@/modules/admin/components/AdminOrderVoiceNotifier";
import { useAdminT } from "@/hooks/useAdminT";
import type { AdminLocale } from "@/i18n/admin";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AdminAccountMenuProps = {
  canUseOrderVoice: boolean;
  loggingOut: boolean;
  onLogout: () => void;
};

export default function AdminAccountMenu({
  canUseOrderVoice,
  loggingOut,
  onLogout,
}: AdminAccountMenuProps) {
  const { t, locale, setLocale } = useAdminT();
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const closeMenu = () => setAvatarMenuOpen(false);

  return (
    <div className="relative shrink-0">
      <UnifiedButton
        ref={avatarBtnRef}
        type="button"
        aria-label={t("layout.account")}
        className="touch-manipulation flex h-9 min-w-[46px] items-center gap-1 rounded-lg px-1 hover:bg-secondary"
        onClick={() => setAvatarMenuOpen((open) => !open)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--theme-primary)] text-xs font-bold text-[var(--theme-primary-foreground)]">A</div>
        <ChevronDown size={13} className={`hidden text-muted-foreground transition-transform sm:block ${avatarMenuOpen ? "rotate-180" : ""}`} />
      </UnifiedButton>
      <AnchoredMenu
        open={avatarMenuOpen}
        onClose={closeMenu}
        anchorRef={avatarBtnRef}
        width={224}
        gap={6}
        placement="bottom-end"
        className="py-1"
      >
        <motion.div className="w-56">
          {canUseOrderVoice ? (
            <>
              <AdminOrderVoiceMenuItems onClose={closeMenu} />
              <div className="mx-3 my-1 h-px bg-border" />
            </>
          ) : null}
          <div className="px-4 py-2">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Languages size={14} />
              {t("layout.language")}
            </p>
            <div className="flex gap-2">
              {(["zh", "en"] as AdminLocale[]).map((loc) => (
                <UnifiedButton
                  key={loc}
                  type="button"
                  onClick={() => {
                    setLocale(loc);
                    closeMenu();
                  }}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    locale === loc
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                      : "bg-secondary text-foreground hover:opacity-90"
                  }`}
                >
                  {loc === "zh" ? t("layout.languageZh") : t("layout.languageEn")}
                </UnifiedButton>
              ))}
            </div>
          </div>
          <div className="mx-3 my-1 h-px bg-border" />
          <AdminAccountSettingsTrigger tab="profile" onBeforeOpen={closeMenu} />
          <AdminAccountSettingsTrigger tab="password" onBeforeOpen={closeMenu} />
          <div className="mx-3 my-1 h-px bg-border" />
          <UnifiedButton
            type="button"
            onClick={() => {
              closeMenu();
              onLogout();
            }}
            disabled={loggingOut}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOut size={16} />
            {t("layout.logout")}
          </UnifiedButton>
        </motion.div>
      </AnchoredMenu>
    </div>
  );
}
