import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LanguageGate from "@/components/LanguageGate";
import AgeGate from "./AgeGate";
import { BlockingAccessDialogProvider } from "./BlockingAccessDialog";

const gateMocks = vi.hoisted(() => ({
  capabilitiesReady: true,
  chineseBrowserLanguage: false,
  languageGateEnabled: false,
  siteInfo: {
    ageGateEnabled: "1",
    minimumAge: "18",
    complianceNotice: "",
  },
  stableBack: vi.fn(),
}));

vi.mock("@/hooks/useSiteInfo", () => ({
  useSiteInfo: () => gateMocks.siteInfo,
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => ({ languageGateEnabled: gateMocks.languageGateEnabled }),
  useSiteCapabilitiesReady: () => gateMocks.capabilitiesReady,
}));

vi.mock("@/hooks/useStableBack", () => ({
  useStableBack: () => gateMocks.stableBack,
}));

vi.mock("@/utils/browserLanguage", () => ({
  isChineseBrowserLanguage: () => gateMocks.chineseBrowserLanguage,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type GateTestAppProps = {
  path?: string;
  showGates: boolean;
};

function GateTestApp({ path = "/", showGates }: GateTestAppProps) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <BlockingAccessDialogProvider>
        {showGates ? (
          <>
            <LanguageGate />
            <AgeGate />
          </>
        ) : null}
      </BlockingAccessDialogProvider>
      <main data-testid="store-main">
        <button type="button" data-testid="background-action">后台操作</button>
      </main>
    </MemoryRouter>
  );
}

function getDialogs(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>(".sf-fixed-access-gate__panel"));
}

async function flushFocusEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 5));
  });
}

describe("blocking access gates", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const renderApp = async (props: GateTestAppProps) => {
    await act(async () => {
      root?.render(<GateTestApp {...props} />);
    });
    await flushFocusEffects();
  };

  beforeEach(() => {
    gateMocks.capabilitiesReady = true;
    gateMocks.chineseBrowserLanguage = false;
    gateMocks.languageGateEnabled = false;
    gateMocks.siteInfo = {
      ageGateEnabled: "1",
      minimumAge: "18",
      complianceNotice: "",
    };
    gateMocks.stableBack.mockReset();
    sessionStorage.clear();

    container = document.createElement("div");
    container.id = "root";
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      await flushFocusEffects();
    }
    container?.remove();
    container = null;
    root = null;
    sessionStorage.clear();
  });

  it("moves focus into the age gate, traps it, isolates the background, and restores the opener", async () => {
    await renderApp({ showGates: false });
    const backgroundAction = container?.querySelector<HTMLElement>("[data-testid='background-action']");
    backgroundAction?.focus();
    expect(document.activeElement).toBe(backgroundAction);

    await renderApp({ showGates: true });

    const [dialog] = getDialogs();
    expect(getDialogs()).toHaveLength(1);
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog).toHaveTextContent("年龄确认");
    expect(document.activeElement).toBe(dialog);
    expect(container).toHaveAttribute("aria-hidden", "true");

    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons).toHaveLength(2);

    buttons[1].focus();
    buttons[1].dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    }));
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
      shiftKey: true,
    }));
    expect(document.activeElement).toBe(buttons[1]);

    backgroundAction?.focus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    dialog.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    }));
    document.body.querySelector<HTMLElement>(".sf-fixed-access-gate")?.click();
    expect(getDialogs()).toHaveLength(1);

    const confirmButton = buttons.find((button) => button.textContent?.includes("我已满"));
    await act(async () => {
      confirmButton?.click();
    });
    await flushFocusEffects();

    expect(getDialogs()).toHaveLength(0);
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(document.activeElement).toBe(backgroundAction);
  });

  it("keeps a control-free language gate focused and restores focus when it unmounts", async () => {
    gateMocks.siteInfo = { ...gateMocks.siteInfo, ageGateEnabled: "0" };
    gateMocks.languageGateEnabled = true;

    await renderApp({ showGates: false });
    const backgroundAction = container?.querySelector<HTMLElement>("[data-testid='background-action']");
    backgroundAction?.focus();

    await renderApp({ showGates: true });

    const [dialog] = getDialogs();
    expect(dialog).toHaveTextContent("暂不支持当前浏览器语言");
    expect(dialog.querySelectorAll("button")).toHaveLength(0);
    expect(document.activeElement).toBe(dialog);
    expect(container).toHaveAttribute("aria-hidden", "true");

    const tabEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    dialog.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog);

    const reverseTabEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
      shiftKey: true,
    });
    dialog.dispatchEvent(reverseTabEvent);
    expect(reverseTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog);

    await renderApp({ showGates: false });

    expect(getDialogs()).toHaveLength(0);
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(document.activeElement).toBe(backgroundAction);
  });

  it("shows only the higher-priority age gate, then hands focus to the language gate", async () => {
    gateMocks.languageGateEnabled = true;

    await renderApp({ showGates: false });
    const backgroundAction = container?.querySelector<HTMLElement>("[data-testid='background-action']");
    backgroundAction?.focus();

    await renderApp({ showGates: true });

    let dialogs = getDialogs();
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent("年龄确认");

    const confirmButton = Array.from(dialogs[0].querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("我已满"));
    await act(async () => {
      confirmButton?.click();
    });
    await flushFocusEffects();

    dialogs = getDialogs();
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent("暂不支持当前浏览器语言");
    expect(document.activeElement).toBe(dialogs[0]);
    expect(document.activeElement).not.toBe(backgroundAction);

    await renderApp({ showGates: false });
    expect(document.activeElement).toBe(backgroundAction);
  });

  it("falls back to the main landmark when there is no valid opener", async () => {
    await renderApp({ showGates: false });
    expect(document.activeElement).toBe(document.body);

    await renderApp({ showGates: true });
    const dialog = getDialogs()[0];
    const confirmButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("我已满"));

    await act(async () => {
      confirmButton?.click();
    });
    await flushFocusEffects();

    expect(document.activeElement).toBe(container?.querySelector("main"));
  });

  it("does not register or isolate either gate on admin routes", async () => {
    gateMocks.languageGateEnabled = true;

    await renderApp({ path: "/admin/login", showGates: true });

    expect(getDialogs()).toHaveLength(0);
    expect(container).not.toHaveAttribute("aria-hidden");
  });
});
