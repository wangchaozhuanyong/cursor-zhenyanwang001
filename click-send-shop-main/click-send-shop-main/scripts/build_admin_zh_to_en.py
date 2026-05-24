#!/usr/bin/env python3
"""Build src/i18n/admin/zhToEn.ts from extracted Chinese strings."""
import json
import re
from pathlib import Path

from admin_translate_engine import PHRASES, polish_translation, translate_admin_zh

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = ROOT / "src/i18n/admin/_extracted_zh.json"
OUT = ROOT / "src/i18n/admin/zhToEn.ts"

# Theme studio / constants (may not be in extracted tsx scan)
EXTRA_STRINGS = [
    "前台首页",
    "商品详情",
    "组件库",
    "移动端",
    "手机",
    "平板",
    "桌面",
    "默认",
    "生活服务",
    "高端服务",
    "签证留学",
    "好物商城",
    "促销活动",
    "无",
    "轻微",
    "柔和",
    "中等",
    "发光",
    "胶囊",
    "圆角",
    "方角",
    "简洁",
    "悬浮",
    "玻璃",
    "实心",
    "描边",
    "常规",
    "加粗",
    "高级",
    "标准",
    "促销",
    "紧凑",
    "无缝",
    "极简",
    "杂志",
    "美食",
    "黑金",
    "清新",
    "经典",
    "舒适",
    "皮肤列表",
    "搜索皮肤...",
    "新建",
    "编辑中",
    "默认",
    "设为默认",
    "复制",
]


def main() -> None:
    strings: list[str] = []
    if EXTRACTED.exists():
        strings = json.loads(EXTRACTED.read_text(encoding="utf-8"))
    all_strings = sorted(set(strings) | set(EXTRA_STRINGS) | set(PHRASES.keys()))

    mapping: dict[str, str] = {}
    for zh in all_strings:
        en = translate_admin_zh(zh)
        en = polish_translation(zh, en)
        if en == zh or re.search(r"[\u4e00-\u9fff]", en):
            retry = polish_translation(zh, translate_admin_zh(zh))
            if retry != zh and not re.search(r"[\u4e00-\u9fff]", retry):
                en = retry
        mapping[zh] = en

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
    translated = sum(1 for k, v in mapping.items() if v != k and not re.search(r"[\u4e00-\u9fff]", v))
    print(f"Wrote {len(mapping)} entries ({translated} fully translated) -> {OUT}")


if __name__ == "__main__":
    main()
