import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductReviewsViewModel } from "@/hooks/useProductReviews";
import type { ProductReviewStats, Review, ReviewEligibility } from "@/types/review";
import ProductReviews from "./ProductReviews";

vi.mock("@/modules/micro-interactions", () => ({
  AppModal: () => null,
}));

vi.mock("@/components/review/ReviewComposerSheet", () => ({
  default: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const eligibility: ReviewEligibility = {
  can_review: false,
  reason: "purchase_required",
  message: "购买并确认收货后可评价",
  pending_items: [],
  reviewed_count: 0,
};

function makeReview(rating: number): Review {
  return {
    id: "review-1",
    product_id: "product-1",
    user_id: "user-1",
    nickname: "用户",
    avatar: "",
    rating,
    content: "真实评价",
    images: [],
    created_at: new Date().toISOString(),
    likes_count: 0,
    liked: false,
  };
}

function makeViewModel({
  reviewTotal,
  avgRating,
}: {
  reviewTotal: number;
  avgRating: number;
}): ProductReviewsViewModel {
  const stats: ProductReviewStats = {
    total: reviewTotal,
    avg_rating: avgRating,
    rating_distribution: { 1: 0, 2: 0, 3: 0, 4: reviewTotal, 5: 0 },
    image_review_count: 0,
  };
  const reviews = reviewTotal > 0 ? [makeReview(4)] : [];

  return {
    reviews,
    stats,
    reviewTotal,
    loading: false,
    likedIds: new Set<string>(),
    imgInputRef: createRef<HTMLInputElement>(),
    avgRating,
    handleLike: vi.fn(async () => undefined),
    timeAgo: vi.fn(() => "今天"),
    eligibility,
    canReview: false,
    reviewCtaText: "购买后评价",
    showComposer: false,
    setShowComposer: vi.fn(),
    showSelector: false,
    setShowSelector: vi.fn(),
    selectedOrderItemId: "",
    setSelectedOrderItemId: vi.fn(),
    openReview: vi.fn(),
    reload: vi.fn(async () => undefined),
  };
}

describe("ProductReviews", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
  });

  async function renderReviews(vm: ProductReviewsViewModel) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<ProductReviews vm={vm} />);
    });

    return container;
  }

  it("shows no numeric score or filled stars when there are zero reviews", async () => {
    const view = await renderReviews(makeViewModel({ reviewTotal: 0, avgRating: 5 }));
    const score = view.querySelector(".sf-next-product-reviews__score > strong");
    const stars = view.querySelector(".sf-next-product-reviews__score .sf-next-product-stars");

    expect(score).toHaveTextContent("—");
    expect(score).not.toHaveTextContent("5.0");
    expect(stars).toHaveAttribute("aria-label", "暂无评分");
    expect(stars?.querySelectorAll(".fill-theme-price")).toHaveLength(0);
    expect(view).toHaveTextContent("0 条评价");
  });

  it("keeps the existing numeric score and rounded stars for real reviews", async () => {
    const view = await renderReviews(makeViewModel({ reviewTotal: 3, avgRating: 4.2 }));
    const score = view.querySelector(".sf-next-product-reviews__score > strong");
    const stars = view.querySelector(".sf-next-product-reviews__score .sf-next-product-stars");

    expect(score).toHaveTextContent("4.2");
    expect(stars).toHaveAttribute("aria-label", "4 星");
    expect(stars?.querySelectorAll(".fill-theme-price")).toHaveLength(4);
    expect(view).toHaveTextContent("3 条评价");
  });
});
