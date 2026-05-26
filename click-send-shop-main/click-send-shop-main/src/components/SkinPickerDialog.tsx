import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { AppModal } from "@/modules/micro-interactions";

export default function SkinPickerDialog({
  trigger,
  open: openControlled,
  onOpenChange,
  title = "更换皮肤",
  description = "请选择一个皮肤以切换主题样式。",
  loadingText = "皮肤加载中...",
  currentSkinHint = "当前皮肤",
  switchHint = "点击切换",
  selectedBadge = "已选",
  className,
}: {
  trigger?: ReactNode;
  /** 受控打开状态（用于后台头像菜单等：弹层在 Portal 内，避免父级卸载） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  loadingText?: string;
  currentSkinHint?: string;
  switchHint?: string;
  selectedBadge?: string;
  className?: string;
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openControlled ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const { pickerSkins, skinId, setSkinId } = useThemeRuntime();

  const triggerNode = trigger && isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: (e: React.MouseEvent) => {
          (trigger as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
          setOpen(true);
        },
      })
    : trigger ? (
        <button type="button" onClick={() => setOpen(true)}>
          {trigger}
        </button>
      ) : null;

  return (
    <>
      {triggerNode}

      <AppModal
        tier="standard"
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Palette size={16} />
            {title}
          </span>
        }
        description={description}
        height="auto"
        dialogClassName={cn("max-w-lg", className)}
      >
        <div className="grid gap-2 pb-2 sm:grid-cols-2">
          {pickerSkins.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">{loadingText}</p>
          ) : (
            pickerSkins.map((skin) => {
              const primary = skin.config.primaryColor;
              const secondary = skin.config.secondaryColor;
              const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
              const active = skin.id === skinId;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => {
                    setSkinId(skin.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors active:scale-[0.99]",
                    active ? "border-gold bg-gold/10" : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("h-10 w-14 rounded-lg border", active ? "border-gold/50" : "border-border")}
                    style={{ background: gradient }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{skin.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {active ? currentSkinHint : switchHint}
                    </span>
                  </span>
                  {active ? (
                    <span
                      aria-hidden
                      className="rounded-full bg-[var(--theme-price)]/15 px-2 py-1 text-[10px] font-bold text-[var(--theme-price)]"
                    >
                      {selectedBadge}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </AppModal>
    </>
  );
}
