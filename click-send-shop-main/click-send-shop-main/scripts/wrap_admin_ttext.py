#!/usr/bin/env python3
"""Wrap JSX Chinese text nodes with <Tx> for admin i18n."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "src/modules/admin"
CJK = re.compile(r"[\u4e00-\u9fff]")

IMPORT_LINE = 'import { Tx } from "@/components/admin/AdminText";\n'


def needs_tx(text: str) -> bool:
    return bool(CJK.search(text)) and text.strip() not in ("",)


def process_file(path: Path) -> bool:
    src = path.read_text(encoding="utf-8")
    if "<Tx>" in src or 'from "@/components/admin/AdminText"' in src:
        return False

    changed = False

    # >中文<  (text between tags, not attributes)
    def repl_text_node(m: re.Match) -> str:
        nonlocal changed
        inner = m.group(1)
        if not needs_tx(inner):
            return m.group(0)
        if "{" in inner or "}" in inner:
            return m.group(0)
        changed = True
        escaped = inner.replace("{", "{{").replace("}", "}}")
        return f"><Tx>{escaped}</Tx><"

    new = re.sub(r">([^<>{}]+)<", repl_text_node, src)

    if not changed:
        return False

    if IMPORT_LINE.strip() not in new:
        # insert after last import
        imp_end = 0
        for line in new.splitlines(True):
            if line.startswith("import "):
                imp_end += len(line)
            elif imp_end > 0 and line.strip() and not line.startswith("import "):
                break
        new = new[:imp_end] + IMPORT_LINE + new[imp_end:]

    path.write_text(new, encoding="utf-8")
    return True


def main() -> None:
    count = 0
    for p in ADMIN.rglob("*.tsx"):
        if process_file(p):
            count += 1
            print("wrapped", p.relative_to(ROOT))
    print(f"Done: {count} files updated")


if __name__ == "__main__":
    main()
