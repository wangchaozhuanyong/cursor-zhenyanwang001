export default function SilkPageLoader() {
  return (
    <div className="space-y-4 p-[var(--store-page-x)]" aria-label="页面加载中">
      <div className="skeleton-base skeleton-shimmer h-40 w-full theme-rounded" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton-base skeleton-shimmer aspect-square w-full theme-rounded" />
            <div className="skeleton-base skeleton-shimmer h-3 w-4/5" />
            <div className="skeleton-base skeleton-shimmer h-5 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
