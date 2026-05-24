#!/usr/bin/env python3
"""Extract unique Chinese string literals from admin TSX for i18n map generation."""
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRS = [
    ROOT / "src/modules/admin",
    ROOT / "src/layouts",
    ROOT / "src/components/admin",
    ROOT / "src/components/SkinPickerDialog.tsx",
    ROOT / "src/config/adminEmptyStateGuides.ts",
    ROOT / "src/utils/auditLogI18n.ts",
    ROOT / "src/utils/adminAuditLogFilters.ts",
    ROOT / "src/utils/adminEventLabels.ts",
    ROOT / "src/utils/adminReportFilters.ts",
    ROOT / "src/utils/adminActivityFilters.ts",
]

CJK = re.compile(r"[\u4e00-\u9fff]")
STRING_RE = re.compile(r"""(?:'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^'\\]*)*)")""")
TX_RE = re.compile(r"<Tx>([^<]+)</Tx>")
TTEXT_RE = re.compile(r"""tText\(\s*(['"])(.*?)\1""", re.DOTALL)

SKIP_SUBSTR = (
    "/admin", "http", "className", "var(--", "hsl(", "text-", "bg-", "flex ",
    "import ", "@/", ".tsx", ".ts", "permission", "dashboard.", "product.",
)


def has_cjk(s: str) -> bool:
    return bool(CJK.search(s))


def should_skip(s: str) -> bool:
    if len(s) < 2:
        return True
    if not has_cjk(s):
        return True
    for sub in SKIP_SUBSTR:
        if sub in s:
            return True
    if s.startswith("{") or s.endswith("}"):
        return True
    return False


def collect_from_file(path: Path, found: set[str]) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")
        print(f"[extract_admin_zh] warning: repaired invalid UTF-8 in {path}")
    for m in STRING_RE.finditer(text):
        s = m.group(1) or m.group(2) or ""
        s = s.strip()
        if should_skip(s):
            continue
        found.add(s)
    for m in TX_RE.finditer(text):
        s = m.group(1).strip()
        if should_skip(s):
            continue
        found.add(s)
    for m in TTEXT_RE.finditer(text):
        s = m.group(2).strip()
        if should_skip(s):
            continue
        found.add(s)


def main() -> None:
    found: set[str] = set()
    for d in DIRS:
        if d.is_file():
            collect_from_file(d, found)
        else:
            for p in d.rglob("*.tsx"):
                collect_from_file(p, found)
            for p in d.rglob("*.ts"):
                collect_from_file(p, found)

    out = ROOT / "src/i18n/admin/_extracted_zh.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(sorted(found, key=len), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Extracted {len(found)} strings -> {out}")


if __name__ == "__main__":
    main()
