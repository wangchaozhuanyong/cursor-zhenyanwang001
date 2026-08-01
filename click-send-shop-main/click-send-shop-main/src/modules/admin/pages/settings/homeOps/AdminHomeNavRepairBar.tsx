import { ArrowLeft, CheckCircle2, Wrench } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_TEXT_SUCCESS, THEME_TEXT_WARNING } from "@/utils/themeVisuals";

type AdminHomeNavRepairBarProps = {
  total: number;
  firstItemTitle?: string;
  loading?: boolean;
  onStart: () => void;
  onExit: () => void;
};

export default function AdminHomeNavRepairBar({
  total,
  firstItemTitle = "",
  loading = false,
  onStart,
  onExit,
}: AdminHomeNavRepairBarProps) {
  const complete = !loading && total === 0;

  return (
    <section
      aria-labelledby="home-nav-repair-title"
      className="mb-4 grid gap-3 border-y border-border bg-secondary/40 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
          {complete
            ? <CheckCircle2 size={19} className={THEME_TEXT_SUCCESS} />
            : <Wrench size={19} className={THEME_TEXT_WARNING} />}
        </div>
        <div className="min-w-0">
          <h2 id="home-nav-repair-title" className="text-sm font-semibold text-foreground">
            <Tx>{complete ? "首页快捷入口已全部确认" : "首页快捷入口修复队列"}</Tx>
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {complete
              ? <Tx>当前已启用入口都有可用目标，外部地址也已完成确认。</Tx>
              : (
                <Tx>
                  剩余 {total} 个入口需要修复或确认，已按首页显示顺序排列。
                  {firstItemTitle ? ` 当前首项：${firstItemTitle}。` : ""}
                  每项建议都需要单独确认，不会批量修改。
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
            disabled={loading || !firstItemTitle}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wrench size={16} />
            <Tx>处理当前首项</Tx>
          </UnifiedButton>
        ) : null}
        <UnifiedButton
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} />
          <Tx>{complete ? "返回全部入口" : "退出修复队列"}</Tx>
        </UnifiedButton>
      </div>
    </section>
  );
}
