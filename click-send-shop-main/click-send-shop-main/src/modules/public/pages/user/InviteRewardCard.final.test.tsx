import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import InviteRewardCard from "./InviteRewardCard.final.jsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const cssSource = fs.readFileSync(path.join(currentDir, "InviteRewardCard.final.css"), "utf8");

describe("InviteRewardCard", () => {
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

  async function renderCard(props: Partial<{
    invitedCount: number;
    cashbackAmount: string;
    onInvite: () => void;
    onCode: () => void;
    onRecords: () => void;
  }> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <InviteRewardCard
          invitedCount={3}
          cashbackAmount="RM 12.34"
          {...props}
        />,
      );
    });
  }

  it("keeps the invite card background filled without the black outer stage", () => {
    expect(cssSource).toMatch(/\.ir-stage\s*{[^}]*background:\s*transparent;/s);
    expect(cssSource).toMatch(/\.ir-card\s*{[^}]*inset:\s*0;/s);
    expect(cssSource).not.toMatch(/\.ir-stage\s*{[^}]*background:\s*#000;/s);
    expect(cssSource).not.toMatch(/\.ir-card\s*{[^}]*(left:\s*1\.86cqw|top:\s*1\.86cqw|width:\s*96\.28cqw|height:\s*45\.38cqw)/s);
  });

  it("keeps invite, code, and record actions wired", async () => {
    const onInvite = vi.fn();
    const onCode = vi.fn();
    const onRecords = vi.fn();
    await renderCard({ onInvite, onCode, onRecords });

    expect(container?.textContent).toContain("邀请好友得奖励");
    expect(container?.textContent).toContain("已邀请");
    expect(container?.textContent).toContain("3 人");
    expect(container?.textContent).toContain("RM 12.34");

    const buttons = Array.from(container?.querySelectorAll("button") ?? []);
    expect(buttons).toHaveLength(3);

    await act(async () => {
      buttons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledTimes(1);
    expect(onRecords).toHaveBeenCalledTimes(1);
  });
});
