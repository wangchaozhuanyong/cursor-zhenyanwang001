/** 与后台「标签管理」颜色选项一致 */
const COLOR_MAP: Record<string, string> = {
  红色: "bg-red-500/10 text-red-500 border-red-500/20",
  绿色: "bg-green-500/10 text-green-500 border-green-500/20",
  蓝色: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  金色: "bg-gold/10 text-theme-price border-gold/20",
};

export function productTagBadgeClass(color?: string | null): string {
  const key = color && COLOR_MAP[color] ? color : "金色";
  return COLOR_MAP[key] || COLOR_MAP.金色;
}
