import fs from "fs";

const p = "src/modules/admin/pages/settings/AdminHomeOps.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("  return (");
const end = s.indexOf("function IconPreview");
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
const navBody = s.slice(start, end);
const m = navBody.match(/<section className="rounded-2xl[\s\S]*<\/section>/);
const navSection = m ? m[0] : "";
const newReturn = `  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">首页运营</h1>
        <p className="text-sm text-muted-foreground">模块开关、展示规则、金刚区与新品主视觉统一在此配置</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-52 lg:flex-col lg:gap-1">
          {HOME_OPS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex min-w-[9.5rem] flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full",
                  active
                    ? "border-gold/40 bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-gold/25 hover:bg-secondary/50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={16} className={active ? "text-gold" : ""} />
                  {tab.label}
                </span>
                <span className="mt-0.5 hidden text-[10px] leading-snug lg:block">{tab.desc}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">
          {activeTab === "modules" ? <AdminHomeOpsModulePanel /> : null}
          {activeTab === "display" ? <AdminHomeOpsDisplayPanel /> : null}
          {activeTab === "newArrival" ? <AdminHomeOpsNewArrivalPanel /> : null}
          {activeTab === "nav" ? (
${navSection}
          ) : null}
        </div>
      </div>
    </div>
  );
}

`;
s = s.slice(0, start) + newReturn + s.slice(end);
s = s.replace(/<motion\.motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</div>");
fs.writeFileSync(p, s);
console.log("patched AdminHomeOps");
