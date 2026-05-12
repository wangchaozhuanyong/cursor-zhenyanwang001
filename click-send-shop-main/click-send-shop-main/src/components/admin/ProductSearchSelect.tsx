import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import type { Product } from "@/types/product";
import * as productService from "@/services/admin/productService";

type Props = {
  value?: string;
  selectedLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  /**
   * 选中后返回完整商品对象；上层可同步到本地 map，避免只靠初始 50 条导致信息缺失。
   */
  onSelect: (product: Product) => void;
  /**
   * 提供一组初始商品（如页面已预加载的 active 商品），用于首次展开时秒出结果。
   */
  initialOptions?: Product[];
  /**
   * 仅用于展示，不影响搜索；如需要限制可选范围（例如只选上架），请在后端/接口层处理。
   */
  className?: string;
};

function normalizeKeyword(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export default function ProductSearchSelect({
  value,
  selectedLabel,
  disabled,
  placeholder = "搜索商品（名称 / ID）…",
  onSelect,
  initialOptions = [],
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Product[]>(initialOptions);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const label = selectedLabel || (value ? `已选择：${value}` : "");

  const shownOptions = useMemo(() => {
    const kw = normalizeKeyword(keyword).toLowerCase();
    if (!kw) return options;
    // 双保险：后端 keyword 过滤 + 前端再做一次包含匹配，支持中文/英文/数字碎片
    return options.filter((p) => {
      const hay = `${p.name ?? ""} ${p.id ?? ""}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [keyword, options]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // 首次展开：若没有初始 options，则先拉一页 active 商品
    if (loadedOnce) return;
    if (initialOptions.length > 0) {
      setLoadedOnce(true);
      return;
    }
    setLoadedOnce(true);
    setLoading(true);
    productService
      .fetchProducts({ page: 1, pageSize: 50, status: "active" })
      .then((data) => setOptions(data.list))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [open, loadedOnce, initialOptions.length]);

  useEffect(() => {
    if (!open) return;
    const kw = normalizeKeyword(keyword);
    // 空关键词时不需要打接口（保留初始列表）
    if (!kw) return;
    const t = window.setTimeout(() => {
      setLoading(true);
      productService
        .fetchProducts({ page: 1, pageSize: 50, status: "active", keyword: kw })
        .then((data) => setOptions(data.list))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [keyword, open]);

  useEffect(() => {
    if (open) {
      // 等弹层渲染后聚焦
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const pick = (p: Product) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className || ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-left text-sm text-foreground disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`min-w-0 flex-1 truncate ${label ? "" : "text-muted-foreground"}`}>
          {label || "请选择商品…"}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[260px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
          <div className="flex items-center gap-2 border-b border-[var(--theme-border)] px-3 py-2">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {keyword && (
              <button
                type="button"
                className="touch-manipulation flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--theme-bg)]"
                onClick={() => setKeyword("")}
                aria-label="清除搜索"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="max-h-[280px] overflow-auto py-1" role="listbox" aria-label="商品列表">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 正在搜索…
              </div>
            )}

            {!loading && shownOptions.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">未找到匹配商品</div>
            )}

            {shownOptions.map((p) => {
              const active = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-bg)] ${active ? "bg-[var(--theme-bg)]" : ""}`}
                  role="option"
                  aria-selected={active}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{p.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">ID {p.id}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <div>RM <span className="text-[var(--theme-price)]">{p.price}</span></div>
                      <div>库存 {p.stock}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

