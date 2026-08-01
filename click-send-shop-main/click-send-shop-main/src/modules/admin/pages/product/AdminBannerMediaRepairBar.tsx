import { ArrowLeft, CheckCircle2, Images } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_TEXT_SUCCESS, THEME_TEXT_WARNING } from "@/utils/themeVisuals";

type AdminBannerMediaRepairBarProps = {
  total: number;
  firstBannerTitle?: string;
  loading?: boolean;
  onStart: () => void;
  onExit: () => void;
};

export default function AdminBannerMediaRepairBar({
  total,
  firstBannerTitle = "",
  loading = false,
  onStart,
  onExit,
}: AdminBannerMediaRepairBarProps) {
  const complete = !loading && total === 0;

  return (
    <section
      aria-labelledby="banner-media-repair-title"
      className="grid gap-3 border-y border-border bg-secondary/40 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
          {complete
            ? <CheckCircle2 size={19} className={THEME_TEXT_SUCCESS} />
            : <Images size={19} className={THEME_TEXT_WARNING} />}
        </div>
        <div className="min-w-0">
          <h2 id="banner-media-repair-title" className="text-sm font-semibold text-foreground">
            <Tx>{complete ? "首页轮播双图已全部处理" : "首页轮播双图修复队列"}</Tx>
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {complete
              ? <Tx>当前启用的首页轮播都已有移动端与桌面端图片。</Tx>
              : (
                <Tx>
                  剩余 {total} 张首页轮播缺少响应式双图，已按首页展示顺序排列。
                  {firstBannerTitle ? ` 当前首项：${firstBannerTitle}。` : ""}
                  套用推荐素材或上传图片后，请刷新发布准备检查。
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
            disabled={loading || !firstBannerTitle}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Images size={16} />
            <Tx>编辑当前首项</Tx>
          </UnifiedButton>
        ) : null}
        <UnifiedButton
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} />
          <Tx>{complete ? "返回全部轮播" : "退出修复队列"}</Tx>
        </UnifiedButton>
      </div>
    </section>
  );
}
