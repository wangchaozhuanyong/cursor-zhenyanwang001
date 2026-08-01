import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import StoreSegmentedDateInput from "./StoreSegmentedDateInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("StoreSegmentedDateInput", () => {
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
    vi.clearAllMocks();
  });

  function renderInput(props: Partial<React.ComponentProps<typeof StoreSegmentedDateInput>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <StoreSegmentedDateInput
          value=""
          onChange={() => {}}
          {...props}
        />,
      );
    });
    return container;
  }

  it("emits a valid ISO date after all three segments are complete", () => {
    const onChange = vi.fn();
    const view = renderInput({ onChange });
    const year = view.querySelector<HTMLInputElement>("[aria-label='年（4 位）']");
    const month = view.querySelector<HTMLInputElement>("[aria-label='月（2 位）']");
    const day = view.querySelector<HTMLInputElement>("[aria-label='日（2 位）']");

    expect(year).not.toBeNull();
    expect(month).not.toBeNull();
    expect(day).not.toBeNull();

    changeInput(year!, "2026");
    changeInput(month!, "07");
    changeInput(day!, "29");

    expect(onChange).toHaveBeenLastCalledWith("2026-07-29");
  });

  it("keeps saved birthdays read-only", () => {
    const view = renderInput({ value: "2026-07-29", readOnly: true });

    expect(view.querySelector<HTMLInputElement>("[aria-label='年（4 位）']")).toHaveValue("2026");
    expect(view.querySelector<HTMLInputElement>("[aria-label='月（2 位）']")).toHaveValue("7");
    expect(view.querySelector<HTMLInputElement>("[aria-label='日（2 位）']")).toHaveValue("29");
    expect(view.querySelector<HTMLButtonElement>("[aria-label='打开日历']")).toBeDisabled();
  });

  it("keeps every date segment and the calendar control at least 44px wide", () => {
    const view = renderInput();

    expect(view.querySelector("[aria-label='年（4 位）']")).toHaveClass("min-w-[52px]");
    expect(view.querySelector("[aria-label='月（2 位）']")).toHaveClass("min-w-11");
    expect(view.querySelector("[aria-label='日（2 位）']")).toHaveClass("min-w-11");
    expect(view.querySelector("[aria-label='打开日历']")).toHaveClass("w-11");
  });
});
