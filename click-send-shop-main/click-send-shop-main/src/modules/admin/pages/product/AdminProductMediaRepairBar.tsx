import { ArrowLeft, CheckCircle2, ImagePlus } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_TEXT_SUCCESS, THEME_TEXT_WARNING } from "@/utils/themeVisuals";

type AdminProductMediaRepairBarProps = {
  total: number;
  visibleCount: number;
  firstProductName?: string;
  loading?: boolean;
  onStart: () => void;
  onExit: () => void;
};

export default function AdminProductMediaRepairBar({
  total,
  visibleCount,
  firstProductName = "",
  loading = false,
  onStart,
  onExit,
}: AdminProductMediaRepairBarProps) {
  const complete = !loading && total === 0;

  return (
    <section
      aria-labelledby="product-media-repair-title"
      className="grid gap-3 border-y border-border bg-secondary/40 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
          {complete
            ? <CheckCircle2 size={19} className={THEME_TEXT_SUCCESS} />
            : <ImagePlus size={19} className={THEME_TEXT_WARNING} />}
        </div>
        <div className="min-w-0">
          <h2 id="product-media-repair-title" className="text-sm font-semibold text-foreground">
            <Tx>{complete ? "首页缺图商品已全部处理" : "首页缺图商品修复队列"}</Tx>
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {complete
              ? <Tx>当前首页商品都已有封面图或可用规格图。</Tx>
              : (
                <Tx>
                  剩余 {total} 个首页商品缺少图片，已按首页曝光顺序排列。
                  {firstProductName ? ` 当前首项：${firstProductName}。` : ""}
                  上传真实商品图并保存后，会自动从此队列移除。
                </Tx>
              )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!complete ? (
          <UnifiedButton
            type="button"
            onClick={onStart}
            disabled={loading || visibleCount === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImagePlus size={16} />
            <Tx>编辑当前首项</Tx>
          </UnifiedButton>
        ) : null}
        <UnifiedButton
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} />
          <Tx>{complete ? "返回全部商品" : "退出修复队列"}</Tx>
        </UnifiedButton>
      </div>
    </section>
  );
}
