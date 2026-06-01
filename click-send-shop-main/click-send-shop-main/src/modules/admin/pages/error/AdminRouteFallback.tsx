import { ArrowLeft, Home, LockKeyhole, SearchX, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AdminRouteFallbackProps = {
  type?: "not-found" | "feature-disabled" | "forbidden";
};

const copy = {
  "not-found": {
    icon: SearchX,
    title: "后台页面不存在",
    description: "当前地址没有对应的后台页面，可能是链接已失效、菜单已调整，或地址输入有误。",
    primary: "返回后台首页",
    secondary: "返回上一页",
  },
  "feature-disabled": {
    icon: Settings,
    title: "功能暂未开启",
    description: "该后台模块当前未启用。请先到站点能力或相关配置中开启，再继续操作。",
    primary: "返回后台首页",
    secondary: "返回上一页",
  },
  forbidden: {
    icon: LockKeyhole,
    title: "没有访问权限",
    description: "当前账号没有访问该页面的权限。如需处理该模块，请联系超级管理员调整角色权限。",
    primary: "返回可访问页面",
    secondary: "返回上一页",
  },
};

export default function AdminRouteFallback({ type = "not-found" }: AdminRouteFallbackProps) {
  const navigate = useNavigate();
  const item = copy[type];
  const Icon = item.icon;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={26} />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-[var(--theme-text)]">{item.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{item.description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin", { replace: true })}
            className="inline-flex items-center gap-2 rounded-lg btn-theme-price px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Home size={15} />
            {item.primary}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]"
          >
            <ArrowLeft size={15} />
            {item.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
