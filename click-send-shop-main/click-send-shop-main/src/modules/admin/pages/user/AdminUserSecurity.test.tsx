import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeRuntimeProvider } from "@/contexts/ThemeRuntimeProvider";
import AdminUserSecurity from "./AdminUserSecurity";

const serviceMock = vi.hoisted(() => ({
  blockRiskDevice: vi.fn(),
  blockRiskIp: vi.fn(),
  fetchRiskDevices: vi.fn(),
  fetchRiskIps: vi.fn(),
  fetchUserLoginAttempts: vi.fn(),
  fetchUserSecurityEvents: vi.fn(),
  fetchUserSecurityOverview: vi.fn(),
  unblockRiskDevice: vi.fn(),
  unblockRiskIp: vi.fn(),
}));

vi.mock("@/components/admin/PermissionGate", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminPageShell", () => ({
  default: ({ children, filters }: { children: ReactNode; filters?: ReactNode }) => (
    <div>
      {filters}
      {children}
    </div>
  ),
}));

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useAdminT", () => ({
  useAdminT: () => ({
    locale: "zh",
    setLocale: vi.fn(),
    t: (key: string) => key,
    tText: (text: string) => text,
  }),
}));

vi.mock("@/modules/admin/components/AdminInputSheet", () => ({
  AdminInputSheet: () => null,
}));

vi.mock("@/services/admin/userSecurityService", () => serviceMock);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminUserSecurity", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderPage() {
    serviceMock.fetchUserSecurityOverview.mockResolvedValue({
      data: {
        loginAttemptCount24h: 7,
        uniqueLoginUsers24h: 2,
        securityEventCount24h: 0,
        highRiskEventCount24h: 0,
        blockedIpCount: 0,
        blockedDeviceCount: 0,
        recentEvents: [],
        topRiskIps: [],
        topRiskDevices: [],
      },
    });
    serviceMock.fetchRiskIps.mockResolvedValue({
      data: {
        list: [
          {
            ip: "2405:3800:8ba:3c1:5c71:8838:bd01:5549",
            ip_location: {
              ip: "2405:3800:8ba:3c1:5c71:8838:bd01:5549",
              ip_type: "IPv6",
              country_code: "MY",
              country: "马来西亚",
              label: "马来西亚",
              city_missing_reason: "当前 IP 库未提供城市级数据",
              source: "geoip-lite",
            },
            risk_level: "medium",
            reason: "登录行为触发观察",
            status: "watching",
            login_count: 7,
            related_user_count: 2,
            related_users: [
              {
                user_id: "user-a",
                phone: "+60123456789",
                nickname: "测试用户A",
                login_count: 5,
                last_seen_at: "2026-06-07T06:01:32.000Z",
              },
              {
                user_id: "user-b",
                phone: "+60198765432",
                login_count: 2,
                last_seen_at: "2026-06-07T05:01:32.000Z",
              },
            ],
            source: "signal",
            last_seen_at: "2026-06-07T06:01:32.000Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });
    serviceMock.fetchRiskDevices.mockResolvedValue({ data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    serviceMock.fetchUserLoginAttempts.mockResolvedValue({ data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    serviceMock.fetchUserSecurityEvents.mockResolvedValue({ data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/admin/user-security"]}>
          <ThemeRuntimeProvider>
            <AdminUserSecurity />
          </ThemeRuntimeProvider>
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

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

  it("在风险 IP 列显示 IP 归属国家", async () => {
    await renderPage();

    expect(container).toHaveTextContent("2405:3800:...:bd01:5549");
    expect(container).toHaveTextContent("马来西亚");
    expect(container).toHaveTextContent("测试用户A");
    expect(container).toHaveTextContent("+60198765432");
    expect(container).toHaveTextContent("登录行为触发观察");

    const relatedUsersCell = Array.from(container?.querySelectorAll("td") ?? []).find((cell) =>
      cell.textContent?.includes("测试用户A"),
    );
    const moreButton = relatedUsersCell?.querySelector("button");
    expect(moreButton).toHaveTextContent("更多");

    await act(async () => {
      moreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body).toHaveTextContent("+60123456789");
    expect(document.body).toHaveTextContent("+60198765432");
  });
});
