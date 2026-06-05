import { describe, expect, it } from "vitest";
import {
  formatDeviceLabel,
  formatLoginMethodLabel,
  formatRiskLevelLabel,
  formatRiskSignalSummary,
  formatRiskSourceLabel,
  formatRiskStatusLabel,
  formatUserSecurityEventDescription,
  formatUserSecurityEventTitle,
} from "./userSecurityDisplay";

describe("userSecurityDisplay", () => {
  it("把风险状态和等级转成中文", () => {
    expect(formatRiskStatusLabel("blocked")).toBe("已封禁");
    expect(formatRiskStatusLabel("watching")).toBe("观察中");
    expect(formatRiskLevelLabel("high")).toBe("高风险");
    expect(formatRiskLevelLabel("medium")).toBe("中风险");
    expect(formatRiskLevelLabel("low")).toBe("低风险");
  });

  it("把登录方式和设备标识转成可读文案", () => {
    expect(formatLoginMethodLabel("phone_password")).toBe("手机号密码登录");
    expect(formatLoginMethodLabel("phone_sms")).toBe("短信验证码登录");
    expect(formatDeviceLabel("abcdef1234567890abcdef")).toBe("设备指纹 abcdef1234567890ab...");
  });

  it("把风险来源和触发次数说明清楚", () => {
    expect(formatRiskSourceLabel("signal")).toBe("登录行为触发");
    expect(formatRiskSourceLabel("event")).toBe("安全事件触发");
    expect(formatRiskSignalSummary({ login_count: 8, event_count: 2 })).toBe("登录 8 次 / 安全事件 2 次");
    expect(formatRiskSignalSummary({ failed_count: 3 })).toBe("失败登录 3 次");
  });

  it("把安全事件类型转成业务文案", () => {
    expect(formatUserSecurityEventTitle("", "login_blocked_by_ip")).toBe("登录被风险 IP 拦截");
    expect(formatUserSecurityEventTitle("", "risk_device_unblocked")).toBe("解封风险设备");
    expect(formatUserSecurityEventDescription("该设备已被后台封禁", "login_blocked_by_device")).toBe("该设备已被后台封禁");
  });
});
