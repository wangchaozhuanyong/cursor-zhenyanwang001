import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import MemberBenefitsView from "./MemberBenefitsView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("MemberBenefitsView", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it("renders the fixed member summary without legacy folio copy", () => {
    const onClaimBenefit = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <MemberBenefitsView
          state="ready"
          currentLevelName="黄金会员"
          totalSpentLabel="RM 1,280.00"
          validOrderCountLabel="8 笔"
          progressPercent={46}
          progressDescription="距离下一等级还需完成有效消费"
          benefits={[
            {
              id: "shipping",
              title: "生日礼遇",
              description: "会员专享",
            },
          ]}
          levels={[
            { id: "standard", name: "普通会员", state: "current" },
            { id: "gold", name: "黄金会员", state: "next" },
          ]}
          claimableBenefits={[
            {
              id: "birthday",
              title: "生日优惠券",
              actionLabel: "领取",
            },
          ]}
          onClaimBenefit={onClaimBenefit}
        />,
      );
    });

    expect(container.textContent).toContain("会员等级");
    expect(container.textContent).toContain("黄金会员");
    expect(container.textContent).not.toContain("MEMBER FOLIO");
    expect(container.textContent).not.toContain("权益以当前会员配置为准");
    expect(container.textContent).not.toContain("◇");
    expect(container.querySelector("[role='progressbar']")).toHaveAttribute("aria-valuenow", "46");

    const claimButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "领取",
    );
    act(() => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClaimBenefit).toHaveBeenCalledWith("birthday");
  });
});
