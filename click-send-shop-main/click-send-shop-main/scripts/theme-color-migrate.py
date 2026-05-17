import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "src")
SKIP_FILES = {"themePresets.ts", "starterThemeSkins.ts", "themeContrast.ts"}

PAIRS = [
    ("rounded-full bg-gold ", "rounded-full btn-theme-price "),
    ("w-full rounded-2xl bg-gold ", "w-full rounded-2xl btn-theme-price "),
    ("w-full rounded-xl bg-gold ", "w-full rounded-xl btn-theme-price "),
    ("bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground", "btn-theme-price px-6 py-2.5 text-sm font-bold"),
    ("bg-gold px-1.5 text-[10px] font-bold text-primary-foreground", "btn-theme-price px-1.5 text-[10px] font-bold"),
    ("bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground", "btn-theme-price px-6 py-2.5 text-sm font-semibold"),
    ("bg-gold px-5 py-2 text-sm font-semibold text-primary-foreground", "btn-theme-price px-5 py-2 text-sm font-semibold"),
    ("fill-gold text-gold", "fill-theme-price text-theme-price"),
    ("bg-gold text-primary-foreground", "btn-theme-price"),
    ("text-white theme-shadow !min-h-0 [background:var(--theme-gradient)]", "btn-theme-gradient theme-shadow !min-h-0"),
    ("text-sm font-bold text-white theme-shadow", "text-sm font-bold btn-theme-gradient theme-shadow"),
    ("text-sm font-semibold text-white", "text-sm font-semibold btn-theme-gradient"),
    ("text-xs font-bold text-white", "text-xs font-bold btn-theme-gradient"),
    ("text-base font-bold text-white theme-shadow", "text-base font-bold btn-theme-gradient theme-shadow"),
    ("rounded-full px-6 py-2.5 text-sm font-semibold text-white", "rounded-full px-6 py-2.5 text-sm font-semibold btn-theme-gradient"),
    ("rounded-full px-4 py-2 text-xs font-bold text-white", "rounded-full px-4 py-2 text-xs font-bold btn-theme-gradient"),
    ("text-gold", "text-theme-price"),
    ("fill-gold", "fill-theme-price"),
]

def migrate(content: str) -> str:
    for old, new in PAIRS:
        content = content.replace(old, new)
    content = content.replace(' style={{ background: "var(--theme-gradient)" }}', "")
    content = content.replace("[background:var(--theme-gradient)]", "btn-theme-gradient")
    return content

def main() -> None:
    changed = 0
    for dirpath, _, files in os.walk(ROOT):
        for fn in files:
            if not fn.endswith((".tsx", ".ts")) or fn in SKIP_FILES:
                continue
            path = os.path.join(dirpath, fn)
            with open(path, encoding="utf-8") as f:
                original = f.read()
            updated = migrate(original)
            if updated != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(updated)
                changed += 1
                print(os.path.relpath(path, ROOT))
    print(f"updated {changed} files")

if __name__ == "__main__":
    main()
