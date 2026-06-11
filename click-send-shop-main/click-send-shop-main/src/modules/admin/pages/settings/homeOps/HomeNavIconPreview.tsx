import { Tx } from "@/components/admin/AdminText";

export default function HomeNavIconPreview({ value, compact = false }: { value: string; compact?: boolean }) {
  const v = value.trim();
  const sizeClassName = compact ? "h-10 w-10" : "h-12 w-12";
  const emptyTextClassName = compact ? "text-[10px]" : "text-xs";
  const iconTextClassName = compact ? "text-lg" : "text-xl";
  if (!v) {
    return (
      <div className={`flex ${sizeClassName} items-center justify-center ${emptyTextClassName} text-muted-foreground`}>
        <Tx>无图标</Tx>
      </div>
    );
  }
  if (v.startsWith("http") || v.startsWith("/")) {
    return <img src={v} alt="首页导航图标预览" className={`${sizeClassName} object-contain object-center`} />;
  }
  return <div className={`flex ${sizeClassName} items-center justify-center ${iconTextClassName} leading-none`}>{v.slice(0, 2)}</div>;
}
