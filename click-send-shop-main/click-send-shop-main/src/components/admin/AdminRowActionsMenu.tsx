import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import AnchoredMenu from "@/components/admin/AnchoredMenu";

export type AdminRowActionItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  onClick: () => void;
  title?: string;
};

type Props = {
  /** 左侧主操作（例如“编辑”） */
  primary: ReactNode;
  /** 下拉菜单项 */
  items: AdminRowActionItem[];
  /** 当外部请求忙碌时禁用“更多”按钮 */
  menuDisabled?: boolean;
  /** “更多”按钮文本 */
  moreLabel?: ReactNode;
  /** 菜单宽度（像素） */
  menuWidth?: number;
};

const actionBtn =
  "inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

const menuItemBase =
  "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

export default function AdminRowActionsMenu({
  primary,
  items,
  menuDisabled = false,
  moreLabel = "更多",
  menuWidth = 160,
}: Props) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const normalized = items.filter(Boolean);
  const hasMenu = normalized.length > 0;

  return (
    <div className="relative inline-flex max-w-full items-center justify-end gap-2 whitespace-nowrap">
      {primary}

      {hasMenu ? (
        <div className="relative">
          <button
            ref={menuBtnRef}
            type="button"
            className={`${actionBtn} gap-1 pr-2`}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            disabled={menuDisabled}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {moreLabel}
            <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>

          <AnchoredMenu open={open} onClose={() => setOpen(false)} anchorRef={menuBtnRef} width={menuWidth} gap={4}>
            <div id={menuId} role="menu">
              <div style={{ width: menuWidth }}>
                {normalized.map((item) => (
                  <div key={item.key}>
                    {item.separatorBefore ? <div className="my-1 h-px bg-border" /> : null}
                    <button
                      type="button"
                      role="menuitem"
                      className={`${menuItemBase} ${item.danger ? "text-destructive" : ""}`}
                      disabled={item.disabled}
                      title={item.title}
                      onClick={() => {
                        setOpen(false);
                        item.onClick();
                      }}
                    >
                      {item.icon ? (
                        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{item.icon}</span>
                      ) : null}
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </AnchoredMenu>
        </div>
      ) : null}
    </div>
  );
}

