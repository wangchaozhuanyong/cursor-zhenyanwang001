import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  CreditCard,
  LogIn,
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
import { usePublicLocale } from "@/i18n/publicLocale";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";

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

type FeedbackRecordFilter = "all" | FeedbackStatus;
type FeedbackView = "submit" | "records";

const RECORD_FILTERS: Array<{ key: FeedbackRecordFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: STATUS_LABEL.pending },
  { key: "in_progress", label: STATUS_LABEL.in_progress },
  { key: "resolved", label: STATUS_LABEL.resolved },
  { key: "dismissed", label: STATUS_LABEL.dismissed },
];

function getStateFrom(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const from = (value as { from?: unknown }).from;
  return typeof from === "string" ? from : "";
}

function feedbackTypeLabel(type: FeedbackType) {
  return TYPE_OPTIONS.find((item) => item.value === type)?.label || "其他反馈";
}

function FeedbackRecordsState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="sf-next-feedback-record-state">
      <span className="sf-next-feedback-record-state__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      {action ? <div className="sf-next-feedback-record-state__action">{action}</div> : null}
    </div>
  );
}

function FeedbackRecordList({ items }: { items: UserFeedback[] }) {
  const [filter, setFilter] = useState<FeedbackRecordFilter>("all");
  const { containerRef: filterRailRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(filter, RECORD_FILTERS.length);
  const counts = useMemo(() => {
    const next: Record<FeedbackRecordFilter, number> = {
      all: items.length,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0,
    };
    items.forEach((item) => {
      next[item.status] += 1;
    });
    return next;
  }, [items]);
  const filteredItems = filter === "all" ? items : items.filter((item) => item.status === filter);

  if (!items.length) {
    return (
      <FeedbackRecordsState
        icon={<MessageSquare size={20} />}
        title="暂时还没有反馈记录"
        text="提交后的反馈会按处理状态出现在这里。"
      />
    );
  }

  return (
    <div className="sf-next-feedback-records">
      <div ref={filterRailRef} className="sf-next-feedback-record-filter no-scrollbar">
        {RECORD_FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <UnifiedButton
              key={item.key}
              ref={(el) => setFilterRef(item.key, el)}
              type="button"
              onClick={() => {
                scrollFilterToKey(item.key);
                setFilter(item.key);
              }}
              className={`sf-next-feedback-record-filter__button${active ? " is-active" : ""}`}
            >
              <span>{item.label}</span>
              <span>{counts[item.key]}</span>
            </UnifiedButton>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <FeedbackRecordsState
          icon={<AlertCircle size={20} />}
          title="当前状态暂无记录"
          text="切换上方状态，可以查看其他处理阶段的反馈。"
        />
      ) : null}

      {filteredItems.map((item) => (
        <article key={item.id} className="sf-next-feedback-record-card">
          <div className="sf-next-feedback-record-card__head">
            <div>
              <p>
                {item.title || feedbackTypeLabel(item.type)}
              </p>
              <small>{item.content}</small>
            </div>
            <span className={`sf-next-feedback-status sf-next-feedback-status--${item.status}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <div className="sf-next-feedback-record-card__meta">
            <span>{feedbackTypeLabel(item.type)}</span>
            <span>{formatDateTime(item.created_at)}</span>
            {item.order_no ? <span>订单 {item.order_no}</span> : null}
          </div>
          {item.handler_note ? (
            <p className="sf-next-feedback-record-card__note">
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
  const { localizedPath } = usePublicLocale();
  const queryClient = useQueryClient();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const loggedIn = isLoggedIn();
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [activeView, setActiveView] = useState<FeedbackView>("submit");

  const sourcePage = useMemo(() => {
    const stateFrom = getStateFrom(location.state);
    if (stateFrom) return stateFrom;
    if (typeof document !== "undefined" && document.referrer) return document.referrer;
    return location.pathname;
  }, [location.pathname, location.state]);

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
      setActiveView("records");
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

  const loginAction = (
    <UnifiedButton
      type="button"
      onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/feedback") } })}
      className="sf-next-feedback-login-action"
    >
      <LogIn size={16} aria-hidden="true" />
      <span>登录查看</span>
    </UnifiedButton>
  );

  const renderRecordsPanel = () => {
    if (!loggedIn) {
      return (
        <FeedbackRecordsState
          icon={<UserRound size={20} />}
          title="登录后查看处理状态"
          text="提交过的反馈、处理进度和客服备注会保存在账号下。"
          action={loginAction}
        />
      );
    }

    if (myFeedbackQuery.isLoading) {
      return (
        <FeedbackRecordsState
          icon={<MessageSquare size={20} />}
          title="正在加载反馈记录"
          text="请稍候，正在读取你的提交记录。"
        />
      );
    }

    if (myFeedbackQuery.isError) {
      return (
        <FeedbackRecordsState
          icon={<AlertCircle size={20} />}
          title="反馈记录加载失败"
          text="网络或登录状态可能已变化，请稍后刷新页面。"
        />
      );
    }

    return <FeedbackRecordList items={myFeedbackQuery.data?.list ?? []} />;
  };

  if (submittedId) {
    return (
      <StoreStandardPageShell
        title="意见反馈"
        backFallback="/profile"
        contentClassName="sf-next-account-main md:max-w-3xl xl:max-w-4xl"
        className="sf-next-page sf-next-route-page sf-next-feedback-page pb-8 text-[var(--theme-text)]"
      >
        <SeoHead
          title={`意见反馈｜${siteName}`}
          description={`向${siteName}提交意见反馈。`}
          canonical={buildCanonical("/feedback")}
          robots="noindex,follow"
        />
        <div className="mx-auto w-full max-w-lg md:max-w-none">
          <section className="sf-next-feedback-success">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-success)_12%,var(--theme-surface))] text-[var(--theme-success)]">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--theme-text)]">已收到你的反馈</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-muted)]">
              编号 {submittedId.slice(0, 8)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <UnifiedButton
                type="button"
                onClick={() => navigate(localizedPath("/profile"), { replace: true })}
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

          <section className="sf-next-feedback-panel mt-3">
            <h2 className="text-base font-semibold text-[var(--theme-text)]">我的反馈记录</h2>
            <div className="mt-3">{renderRecordsPanel()}</div>
          </section>
        </div>
      </StoreStandardPageShell>
    );
  }

  return (
      <StoreStandardPageShell
      title="意见反馈"
      backFallback="/profile"
      contentClassName="sf-next-account-main md:max-w-3xl xl:max-w-4xl"
      className="sf-next-page sf-next-route-page sf-next-feedback-page pb-8 text-[var(--theme-text)]"
    >
      <SeoHead
        title={`意见反馈｜${siteName}`}
        description={`向${siteName}提交意见反馈。`}
        canonical={buildCanonical("/feedback")}
        robots="noindex,follow"
      />

      <div className="sf-next-feedback-main mx-auto w-full max-w-lg md:max-w-none">
        <div className="sf-next-feedback-segmented" role="tablist" aria-label="反馈视图">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "submit"}
            onClick={() => setActiveView("submit")}
          >
            提交反馈
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "records"}
            onClick={() => setActiveView("records")}
          >
            我的反馈
          </button>
        </div>

        {activeView === "submit" ? (
          <>
            <section className="sf-next-feedback-panel">
              <div className="sf-next-feedback-type-grid">
                {TYPE_OPTIONS.map((item) => {
                  const active = form.type === item.value;
                  return (
                    <UnifiedButton
                      key={item.value}
                      type="button"
                      onClick={() => updateForm({ type: item.value })}
                      className={`sf-next-feedback-type-option ${active ? "is-active" : ""}`}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </UnifiedButton>
                  );
                })}
              </div>
            </section>

            <section className="sf-next-feedback-panel sf-next-feedback-form">
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
                  placeholder="请描述问题或建议..."
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
          </>
        ) : null}

        {activeView === "records" ? (
          <section className="sf-next-feedback-panel">
            <h2 className="text-base font-semibold text-[var(--theme-text)]">我的反馈记录</h2>
            <div className="mt-3">{renderRecordsPanel()}</div>
          </section>
        ) : null}
      </div>
    </StoreStandardPageShell>
  );
}
