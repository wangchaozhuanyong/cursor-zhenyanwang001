import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import type { ReactNode } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SkinPickerDialog({
  trigger,
  title = "更换皮肤",
  className,
}: {
  trigger: ReactNode;
  title?: string;
  className?: string;
}) {
  const { skins, skinId, setSkinId } = useThemeRuntime();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogTitle className="flex items-center gap-2">
          <Palette size={16} />
          {title}
        </DialogTitle>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {skins.length === 0 ? (
            <div className="col-span-full text-sm text-muted-foreground">加载皮肤中...</div>
          ) : (
            skins.map((s) => {
              const primary = s.config.primaryColor;
              const secondary = s.config.secondaryColor;
              const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
              const active = s.id === skinId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSkinId(s.id)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors active:scale-[0.99]",
                    active ? "border-gold bg-gold/10" : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-10 w-14 rounded-lg border",
                      active ? "border-gold/50" : "border-border",
                    )}
                    style={{ background: gradient }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {active ? "当前皮肤" : "点击切换"}
                    </span>
                  </span>
                  {active ? (
                    <span
                      aria-hidden
                      className="rounded-full bg-[var(--theme-price)]/15 px-2 py-1 text-[10px] font-bold text-[var(--theme-price)]"
                    >
                      已选
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

