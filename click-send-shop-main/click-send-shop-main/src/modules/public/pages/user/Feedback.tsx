import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Package,
  Send,
  UserRound,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { STORE_COPY } from "@/constants/storeCopy";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as feedbackService from "@/services/feedbackService";
import type { FeedbackStatus, FeedbackType, UserFeedback } from "@/services/feedbackService";
import { formatDateTime } from "@/utils/formatDateTime";
import { isLoggedIn } from "@/utils/token";

type FeedbackForm = {
  type: FeedbackType;
  title: string;
  content: string;
  contact: string;
  orderNo: string;
};

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string; icon: typeof MessageSquare }> = [
  { value: "suggestion", label: "功能建议", icon: MessageSquare },
  { value: "bug", label: "页面问题", icon: Bug },
  { value: "order", label: "订单售后", icon: Package },
  { value: "payment", label: "支付问题", icon: CreditCard },
  { value: "account", label: "账号问题", icon: UserRound },
  { value: "other", label: "其他反馈", icon: AlertCircle },
];

const initialForm: FeedbackForm = {
  type: "suggestion",
  title: "",
  content: "",
  contact: "",
  orderNo: "",
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: "待处理",
  in_progress: "处理中",
  resolved: "已解决",
  dismissed: "不处理",
};

const STATUS_CLASS: Record<FeedbackStatus, string> = {
  pending: "bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]",
  in_progress: "bg-[color-mix(in_srgb,var(--theme-warning)_15%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-warning)_76%,var(--theme-text))]",
  resolved: "bg-[color-mix(in_srgb,var(--theme-success)_15%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-success)_76%,var(--theme-text))]",
  dismissed: "bg-[color-mix(in_srgb,var(--theme-muted)_20%,var(--theme-surface))] text-[var(--theme-muted)]",
};

function getStateFrom(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const from = (value as { from?: unknown }).from;
  return typeof from === "string" ? from : "";
}

function feedbackTypeLabel(type: FeedbackType) {
  return TYPE_OPTIONS.find((item) => item.value === type)?.label || "其他反馈";
}

function FeedbackRecordList({ items }: { items: UserFeedback[] }) {
  if (!items.length) {
    return (
      <p className="rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-center text-sm text-[var(--theme-muted)]">
        暂时还没有反馈记录。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--theme-text)]">
                {item.title || feedbackTypeLabel(item.type)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--theme-muted)]">{item.content}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--theme-muted)]">
            <span>{feedbackTypeLabel(item.type)}</span>
            <span>{formatDateTime(item.created_at)}</span>
            {item.order_no ? <span>订单 {item.order_no}</span> : null}
          </div>
          {item.handler_note ? (
            <p className="mt-2 rounded-lg bg-[var(--theme-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--theme-muted)]">
              处理备注：{item.handler_note}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default function Feedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const loggedIn = isLoggedIn();
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  const sourcePage = useMemo(() => {
    const stateFrom = getStateFrom(location.state);
    if (stateFrom) return stateFrom;
    if (typeof document !== "undefined" && document.referrer) return document.referrer;
    return location.pathname;
  }, [location.pathname, location.state]);

  const selectedType = TYPE_OPTIONS.find((item) => item.value === form.type) ?? TYPE_OPTIONS[0];

  const myFeedbackQuery = useQuery({
    queryKey: ["feedback", "mine", { page: 1, pageSize: 5 }],
    queryFn: () => feedbackService.fetchMyFeedback({ page: 1, pageSize: 5 }),
    enabled: loggedIn,
    staleTime: 30_000,
  });

  const updateForm = (patch: Partial<FeedbackForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async () => {
    const content = form.content.trim();
    if (content.length < 10) {
      toast.error("请至少写 10 个字，方便我们判断问题");
      return;
    }

    setSubmitting(true);
    try {
      const result = await feedbackService.submitFeedback({
        type: form.type,
        title: form.title.trim(),
        content,
        contact: form.contact.trim(),
        orderNo: form.orderNo.trim(),
        pageUrl: sourcePage,
      });
      setSubmittedId(result.id);
      if (loggedIn) {
        void queryClient.invalidateQueries({ queryKey: ["feedback", "mine"] });
      }
      toast.success("反馈已提交", toastPresetQuickSuccess);
    } catch (error) {
      toast.error(toastErrorMessage(error, "反馈提交失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setSubmittedId("");
  };

  if (submittedId) {
    return (
      <StoreStandardPageShell
        title="意见反馈"
        backFallback="/profile"
        contentClassName="md:max-w-3xl xl:max-w-4xl"
        className="pb-8 text-[var(--theme-text)]"
      >
        <SeoHead
          title={`意见反馈｜${siteName}`}
          description={`向${siteName}提交意见反馈。`}
          canonical={buildCanonical("/feedback")}
          robots="noindex,follow"
        />
        <div className="mx-auto w-full max-w-lg md:max-w-none">
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-center shadow-[var(--theme-shadow)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-success)_12%,var(--theme-surface))] text-[var(--theme-success)]">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--theme-text)]">已收到你的反馈</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-muted)]">
              编号 {submittedId.slice(0, 8)}，后台会按状态跟进处理。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <UnifiedButton
                type="button"
                onClick={() => navigate("/profile", { replace: true })}
                className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm font-semibold"
              >
                回到我的
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={resetForm}
                className="rounded-full bg-[var(--theme-primary)] px-4 py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]"
              >
                再写一条
              </UnifiedButton>
            </div>
        </section>

          <section className="mt-3 rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <h2 className="text-base font-semibold text-[var(--theme-text)]">我的反馈记录</h2>
            {loggedIn ? (
              <div className="mt-3">
                {myFeedbackQuery.isLoading ? (
                  <p className="rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-center text-sm text-[var(--theme-muted)]">加载中...</p>
                ) : myFeedbackQuery.isError ? (
                  <p className="rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-center text-sm text-[var(--theme-muted)]">反馈记录加载失败，请稍后刷新。</p>
                ) : (
                  <FeedbackRecordList items={myFeedbackQuery.data?.list ?? []} />
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-sm leading-relaxed text-[var(--theme-muted)]">
                你可以直接提交反馈；登录后提交的反馈，会在这里显示处理状态。
              </p>
            )}
          </section>
        </div>
      </StoreStandardPageShell>
    );
  }

  return (
    <StoreStandardPageShell
      title="意见反馈"
      backFallback="/profile"
      contentClassName="md:max-w-3xl xl:max-w-4xl"
      className="pb-8 text-[var(--theme-text)]"
    >
      <SeoHead
        title={`意见反馈｜${siteName}`}
        description={`向${siteName}提交意见反馈。`}
        canonical={buildCanonical("/feedback")}
        robots="noindex,follow"
      />

      <div className="mx-auto w-full max-w-lg md:max-w-none">
        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
              <selectedType.icon size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{selectedType.label}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--theme-muted)]">
                写清楚遇到的问题、期望结果或建议内容。
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPE_OPTIONS.map((item) => {
              const active = form.type === item.value;
              return (
                <UnifiedButton
                  key={item.value}
                  type="button"
                  onClick={() => updateForm({ type: item.value })}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2.5 text-sm font-semibold transition ${
                    active
                      ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)]"
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </UnifiedButton>
              );
            })}
          </div>
        </section>

        <section className="mt-3 rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <label className="block text-sm font-semibold">
            标题
            <input
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              maxLength={120}
              placeholder="一句话概括问题，可不填"
              className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--theme-primary)]"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold">
            反馈内容
            <textarea
              value={form.content}
              onChange={(event) => updateForm({ content: event.target.value })}
              maxLength={2000}
              rows={7}
              placeholder="请描述你遇到的问题、操作步骤或想要的改进..."
              className="mt-2 w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3 text-sm leading-relaxed outline-none focus:border-[var(--theme-primary)]"
            />
          </label>
          <div className="mt-1 text-right text-xs text-[var(--theme-muted)]">{form.content.length}/2000</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              联系方式
              <input
                value={form.contact}
                onChange={(event) => updateForm({ contact: event.target.value })}
                maxLength={120}
                placeholder="手机号 / WhatsApp / 微信"
                className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--theme-primary)]"
              />
            </label>
            <label className="block text-sm font-semibold">
              订单号
              <input
                value={form.orderNo}
                onChange={(event) => updateForm({ orderNo: event.target.value })}
                maxLength={64}
                placeholder="和订单有关时填写"
                className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--theme-primary)]"
              />
            </label>
          </div>

          <UnifiedButton
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={17} />
            {submitting ? "提交中..." : "提交反馈"}
          </UnifiedButton>
        </section>

        <section className="mt-3 rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <h2 className="text-base font-semibold text-[var(--theme-text)]">我的反馈记录</h2>
          {loggedIn ? (
            <div className="mt-3">
              {myFeedbackQuery.isLoading ? (
                <p className="rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-center text-sm text-[var(--theme-muted)]">加载中...</p>
              ) : myFeedbackQuery.isError ? (
                <p className="rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-center text-sm text-[var(--theme-muted)]">反馈记录加载失败，请稍后刷新。</p>
              ) : (
                <FeedbackRecordList items={myFeedbackQuery.data?.list ?? []} />
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-[var(--theme-bg)] px-3 py-4 text-sm leading-relaxed text-[var(--theme-muted)]">
              你可以直接提交反馈；登录后提交的反馈，会在这里显示处理状态。
            </p>
          )}
        </section>
      </div>
    </StoreStandardPageShell>
  );
}
