import { describe, expect, it } from "vitest";
import {
  formatDeviceLabel,
  formatIpAddressLabel,
  formatIpLocationCityLine,
  formatIpLocationLabel,
  formatIpTypeLabel,
  formatLoginMethodLabel,
  normalizeIpAddress,
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

  it("把 IP 归属地转成国家和城市显示", () => {
    expect(formatIpLocationLabel({ country: "马来西亚", city: "吉隆坡" })).toBe("马来西亚 / 吉隆坡");
    expect(formatIpLocationLabel({ label: "美国 / CA / Mountain View" })).toBe("美国 / CA / Mountain View");
    expect(formatIpLocationLabel({ label: "原始归属地", country: "新加坡", city: "Singapore" })).toBe("新加坡 / Singapore");
    expect(formatIpLocationLabel({ country_code: "US", region: "CA", city: "Mountain View" })).toBe("US / CA / Mountain View");
    expect(formatIpLocationLabel(null)).toBe("归属地未知");
  });

  it("把长 IPv6 转成适合表格展示的短格式", () => {
    expect(formatIpAddressLabel("13.212.179.213")).toBe("13.212.179.213");
    expect(formatIpAddressLabel("192.168.1.1")).toBe("192.168.1.1");
    expect(formatIpAddressLabel("8.8.8.8")).toBe("8.8.8.8");
    expect(formatIpAddressLabel("::1")).toBe("::1");
    expect(formatIpAddressLabel("0:0:0:0:0:0:0:1")).toBe("::1");
    expect(formatIpAddressLabel("::ffff:192.168.1.10")).toBe("192.168.1.10");
    expect(formatIpAddressLabel("2405:3800:8ba:3c1:5c71:8838:bd01:5549")).toBe("2405:3800:...:bd01:5549");
  });

  it("详情弹窗使用完整 IP 与城市缺失说明", () => {
    const ip = "2405:3800:8ba:3c1:5c71:8838:bd01:5549";
    expect(normalizeIpAddress(ip)).toBe(ip);
    expect(formatIpTypeLabel(ip, { ip_type: "IPv6" })).toBe("IPv6");
    expect(formatIpLocationCityLine({ city_missing_reason: "当前 IP 库未提供城市级数据" }))
      .toBe("未知（当前 IP 库未提供城市级数据）");
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
