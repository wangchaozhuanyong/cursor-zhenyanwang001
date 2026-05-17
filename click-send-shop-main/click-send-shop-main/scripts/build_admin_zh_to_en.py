#!/usr/bin/env python3
"""Build src/i18n/admin/zhToEn.ts from extracted Chinese strings + glossary."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = ROOT / "src/i18n/admin/_extracted_zh.json"
OUT = ROOT / "src/i18n/admin/zhToEn.ts"

# Phrase-level overrides (highest priority)
PHRASES: dict[str, str] = {
    "管理后台": "Admin Console",
    "请使用管理员账号登录": "Sign in with an administrator account",
    "管理员账号": "Administrator account",
    "输入账号": "Enter account",
    "输入密码": "Enter password",
    "登录中...": "Signing in...",
    "返回前台": "Back to storefront",
    "请输入账号和密码": "Please enter account and password",
    "登录成功": "Signed in successfully",
    "登录失败，请检查账号密码": "Sign-in failed. Check your account and password.",
    "账号设置": "Account settings",
    "退出登录": "Sign out",
    "更换皮肤": "Change theme",
    "切换系统皮肤": "Switch system theme",
    "切换皮肤": "Switch theme",
    "请选择一个皮肤以切换主题样式。": "Pick a theme to update the visual style.",
    "皮肤加载中...": "Loading themes...",
    "搜索菜单...": "Search menu...",
    "关闭菜单": "Close menu",
    "打开菜单": "Open menu",
    "加载失败": "Failed to load",
    "重试": "Retry",
    "全部履约状态": "All fulfillment statuses",
    "全部支付状态": "All payment statuses",
    "未知状态": "Unknown status",
    "未知支付状态": "Unknown payment status",
    "待付款": "Pending payment",
    "已付款": "Paid",
    "已发货": "Shipped",
    "已完成": "Completed",
    "已取消": "Cancelled",
    "退款中": "Refunding",
    "已退款": "Refunded",
    "待支付": "Pending payment",
    "支付失败": "Payment failed",
    "部分退款": "Partially refunded",
    "待审核": "Pending review",
    "已通过": "Approved",
    "已拒绝": "Rejected",
    "处理中": "Processing",
    "待处理": "Pending",
    "已付款(待发货)": "Paid (awaiting shipment)",
    "待发货": "Awaiting shipment",
    "待收货": "Awaiting delivery",
    "全部": "All",
    "成功": "Success",
    "失败": "Failed",
}

# Word / fragment glossary for compound strings
WORDS: dict[str, str] = {
    "管理": "Management",
    "后台": "Console",
    "商品": "Product",
    "订单": "Order",
    "用户": "User",
    "支付": "Payment",
    "退款": "Refund",
    "发货": "Shipment",
    "库存": "Inventory",
    "分类": "Category",
    "标签": "Tag",
    "优惠券": "Coupon",
    "活动": "Campaign",
    "积分": "Points",
    "通知": "Notification",
    "设置": "Settings",
    "站点": "Site",
    "皮肤": "Theme",
    "视觉": "Visual",
    "运费": "Shipping fee",
    "规则": "Rules",
    "内容": "Content",
    "审计": "Audit",
    "日志": "Logs",
    "角色": "Role",
    "权限": "Permission",
    "管理员": "Administrator",
    "回收站": "Recycle bin",
    "导出": "Export",
    "中心": "Center",
    "数据": "Data",
    "报表": "Report",
    "分析": "Analysis",
    "总览": "Overview",
    "日报": "Daily report",
    "月报": "Monthly report",
    "客户": "Customer",
    "搜索": "Search",
    "评论": "Review",
    "售后": "After-sales",
    "渠道": "Channel",
    "配置": "Configuration",
    "流水": "Transactions",
    "对账": "Reconciliation",
    "未完成": "Incomplete",
    "结算": "Checkout",
    "列表": "List",
    "新建": "Create",
    "编辑": "Edit",
    "删除": "Delete",
    "保存": "Save",
    "取消": "Cancel",
    "确认": "Confirm",
    "提交": "Submit",
    "加载": "Loading",
    "刷新": "Refresh",
    "筛选": "Filter",
    "排序": "Sort",
    "状态": "Status",
    "操作": "Actions",
    "详情": "Details",
    "名称": "Name",
    "描述": "Description",
    "价格": "Price",
    "售价": "Sale price",
    "库存": "Stock",
    "数量": "Quantity",
    "时间": "Time",
    "日期": "Date",
    "开始": "Start",
    "结束": "End",
    "启用": "Enable",
    "禁用": "Disable",
    "上架": "Listed",
    "下架": "Unlisted",
    "全部": "All",
    "暂无": "None",
    "数据": "Data",
    "今日": "Today",
    "昨日": "Yesterday",
    "本月": "This month",
    "上月": "Last month",
    "首页": "Home",
    "更多": "More",
    "返回": "Back",
    "关闭": "Close",
    "打开": "Open",
    "复制": "Copy",
    "恢复": "Restore",
    "永久": "Permanent",
    "清空": "Clear",
    "预览": "Preview",
    "发布": "Publish",
    "草稿": "Draft",
    "失败": "Failed",
    "成功": "Success",
    "未知": "Unknown",
    "默认": "Default",
    "可选": "Optional",
    "必填": "Required",
    "备注": "Notes",
    "地址": "Address",
    "手机": "Phone",
    "邮箱": "Email",
    "会员": "Member",
    "等级": "Level",
    "邀请": "Invite",
    "奖励": "Reward",
    "返现": "Cashback",
    "领券": "Coupon claim",
    "记录": "Records",
    "营销": "Marketing",
    "运营": "Operations",
    "Banner": "Banner",
    "Webhook": "Webhook",
    "事件": "Events",
    "履约": "Fulfillment",
    "待": "Pending ",
    "已": "",
    "未": "Not ",
    "无": "No ",
    "有": "Has ",
    "是": "Yes",
    "否": "No",
    "中": " in progress",
    "的": " ",
    "和": " and ",
    "或": " or ",
}


def guess_en(zh: str) -> str:
    if zh in PHRASES:
        return PHRASES[zh]
    # Try longest-first word replacement for known glossary hits
    out = zh
    for cn, en in sorted(WORDS.items(), key=lambda x: -len(x[0])):
        if cn in out and en:
            out = out.replace(cn, en)
    out = re.sub(r"\s+", " ", out).strip()
    if out and out != zh and re.search(r"[A-Za-z]", out):
        return out[0].upper() + out[1:] if out else zh
    return zh


def main() -> None:
    strings: list[str] = json.loads(EXTRACTED.read_text(encoding="utf-8"))
    mapping: dict[str, str] = dict(PHRASES)
    for zh in strings:
        if zh not in mapping:
            mapping[zh] = guess_en(zh)

    lines = [
        "/** Auto-generated — run scripts/build_admin_zh_to_en.py to refresh */",
        "export const adminZhToEn: Record<string, string> = {",
    ]
    for zh in sorted(mapping.keys(), key=lambda s: (len(s), s)):
        en = mapping[zh].replace("\\", "\\\\").replace('"', '\\"')
        z = zh.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{z}": "{en}",')
    lines.append("};")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    translated = sum(1 for k, v in mapping.items() if v != k)
    print(f"Wrote {len(mapping)} entries ({translated} translated) -> {OUT}")


if __name__ == "__main__":
    main()
