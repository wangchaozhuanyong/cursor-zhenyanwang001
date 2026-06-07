type SilkPageLoaderProps = {
  variant?: "home" | "page";
};

export default function SilkPageLoader({ variant = "home" }: SilkPageLoaderProps) {
  const shellClassName = variant === "page" ? "preboot-shell preboot-shell--page" : "preboot-shell";

  return (
    <div className={shellClassName} aria-busy="true" aria-label="页面加载中">
      <header className="preboot-topbar">
        <div className="preboot-topbar-inner">
          <div className="preboot-logo preboot-skeleton" />
          <div className="preboot-search preboot-skeleton" />
          <div className="preboot-action preboot-skeleton" />
        </div>
      </header>
      <main className="preboot-main">
        <section className="preboot-hero preboot-skeleton" />
        <div className="preboot-grid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="preboot-card preboot-skeleton" />
          ))}
        </div>
      </main>
    </div>
  );
}
