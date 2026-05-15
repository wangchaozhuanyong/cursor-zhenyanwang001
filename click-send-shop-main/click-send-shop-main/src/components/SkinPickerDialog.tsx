import type { ReactNode } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SkinPickerDialog({
  trigger,
  title = "更换皮肤",
  className,
}: {
  trigger: ReactNode;
  title?: string;
  className?: string;
}) {
  const { switchableSkins, skinId, setSkinId } = useThemeRuntime();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette size={16} />
            {title}
          </DialogTitle>
          <DialogDescription>请选择一个皮肤以切换主题样式。</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {switchableSkins.length === 0 ? (
            <div className="col-span-full text-sm text-muted-foreground">皮肤加载中...</div>
          ) : (
            switchableSkins.map((skin) => {
              const primary = skin.config.primaryColor;
              const secondary = skin.config.secondaryColor;
              const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
              const active = skin.id === skinId;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => setSkinId(skin.id)}
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
                    <span className="block truncate text-sm font-semibold">{skin.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
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
