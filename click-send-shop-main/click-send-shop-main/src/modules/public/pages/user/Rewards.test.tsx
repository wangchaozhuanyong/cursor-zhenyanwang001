import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RewardConfig } from "@/types/reward";
import Rewards from "./Rewards";
import * as rewardService from "@/services/rewardService";

vi.mock("@/services/rewardService", () => ({
  fetchRewardConfig: vi.fn(),
  fetchRewardTransactions: vi.fn(),
}));

vi.mock("@/hooks/useLoyaltyVisibility", () => ({
  useLoyaltyVisibility: () => ({
    loading: false,
    config: {
      reward: {
        displayEnabled: true,
        referralEnabled: true,
      },
    },
  }),
}));

vi.mock("@/hooks/useGoBack", () => ({
  useGoBack: () => vi.fn(),
}));

vi.mock("@/components/store/StoreAccountLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rewardConfig: RewardConfig = {
  balance: 0,
  pendingAmount: 0,
  stats: {
    totalEarned: 0,
    totalSpent: 0,
    reversedAmount: 0,
  },
  display: {
    balanceLabel: "购物可用返现",
    usageNotice: "返现金额仅可用于购物，不可提现。",
  },
};

describe("Rewards", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.mocked(rewardService.fetchRewardConfig).mockResolvedValue(rewardConfig);
    vi.mocked(rewardService.fetchRewardTransactions).mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  async function renderRewards() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/rewards"]}>
          <TooltipProvider>
            <Rewards />
          </TooltipProvider>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  it("shows usage notice from the question mark instead of inline hero text", async () => {
    await renderRewards();

    const helpButton = document.querySelector<HTMLButtonElement>("button[aria-label='查看返现说明']");
    expect(helpButton).toBeInTheDocument();
    expect(container?.textContent).toContain("购物可用返现");
    expect(container?.textContent).not.toContain("返现金额仅可用于购物，不可提现。");

    await act(async () => {
      helpButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("返现金额仅可用于购物，不可提现。");
  });
});
