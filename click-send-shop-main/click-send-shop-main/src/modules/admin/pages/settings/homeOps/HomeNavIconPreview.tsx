import { Tx } from "@/components/admin/AdminText";

export default function HomeNavIconPreview({ value }: { value: string }) {
  const v = value.trim();
  if (!v) {
    return (
      <div className="flex h-12 w-12 items-center justify-center text-xs text-muted-foreground">
        <Tx>无图标</Tx>
      </div>
    );
  }
  if (v.startsWith("http") || v.startsWith("/")) {
    return <img src={v} alt="" className="h-12 w-12 object-contain object-center" />;
  }
  return <div className="flex h-12 w-12 items-center justify-center text-xl leading-none">{v.slice(0, 2)}</div>;
}
