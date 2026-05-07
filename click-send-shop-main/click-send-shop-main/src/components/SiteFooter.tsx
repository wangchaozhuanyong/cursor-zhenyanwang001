import { Link } from "react-router-dom";
import { ArrowRight, Headphones, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";
import type { FooterNavItem } from "@/types/content";

/**
 * 解析后台配置的 footerNav JSON
 * 失败时返回 null，由调用方回退到默认导航
 */
function parseFooterNav(json?: string): FooterNavItem[] | null {
  if (!json || !json.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(
      (it): it is FooterNavItem =>
        it && typeof it.label === "string" && typeof it.path === "string",
    );
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/**
 * 渲染单条页脚链接 - 自动识别外链 / 内链
 */
function FooterLink({ item }: { item: FooterNavItem }) {
  if (item.path.startsWith("http")) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground"
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.path} className="hover:text-foreground">
      {item.label}
    </Link>
  );
}

/**
 * 全站统一页脚 - 桌面端为 4 列，移动端为单列
 * 内容均来自后端 site_settings (useSiteInfo)
 *
 * 导航策略：
 * 1) 后台配置了 footerNav JSON → 拆分为「服务支持」(前 3 条) + 「政策与说明」(其余)
 * 2) 未配置 → 使用内置默认（快速导航 + 帮助中心）
 */
export default function SiteFooter() {
  const site = useSiteInfo();
  const year = new Date().getFullYear();
  const supportText = (site.supportText || "").trim();
  const shippingNotice = (site.shippingNotice || "").trim();
  const paymentNotice = (site.paymentNotice || "").trim();
  const supportBadges = [supportText, shippingNotice, paymentNotice].filter(Boolean);

  const company = site.footerCompanyName || site.siteName || "大马通";
  const copyright =
    site.footerCopyright || `© ${year} ${company}. All rights reserved.`;

  const customNav = parseFooterNav(site.footerNav);
  const supportNav = customNav ? customNav.slice(0, 3) : null;
  const policyNav = customNav ? customNav.slice(3) : null;

  return (
    <footer className="mt-12 border-t border-[var(--theme-border)] bg-[linear-gradient(180deg,var(--theme-surface),var(--theme-bg))] md:mt-20">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-8 md:px-6 md:py-12">
        <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 p-5 shadow-lg shadow-black/5 backdrop-blur md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                <Sparkles size={13} />
                客服与售后保障
              </p>
              <h3 className="mt-3 font-display text-xl font-black text-foreground md:text-2xl">
                {supportText || "需要帮助？我们随时在线。"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {shippingNotice || "从商品咨询、订单配送到售后处理，客服团队会协助你完成每一步。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {site.whatsappUrl && (
                <a
                  href={site.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]"
                >
                  <Headphones size={15} />
                  联系客服
                </a>
              )}
              <Link
                to="/help"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-background/60 px-4 py-2.5 text-sm font-semibold text-foreground"
              >
                帮助中心
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[1.25fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={site.siteName || "logo"}
                  className="h-11 w-11 rounded-2xl object-contain ring-1 ring-[var(--theme-border)]"
                />
              )}
              <h3 className="font-display text-xl font-black tracking-tight text-foreground">
                {renderBrandTitle(site.siteName || "大马通")}
              </h3>
            </div>
            {site.siteSlogan && (
              <p className="mt-3 text-sm font-medium text-foreground">{site.siteSlogan}</p>
            )}
            {site.siteDescription && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{site.siteDescription}</p>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-foreground">服务支持</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {supportNav ? supportNav.map((it, i) => (
                <li key={`${it.label}-${i}`}><FooterLink item={it} /></li>
              )) : (
                <>
                  <li><Link to="/" className="hover:text-foreground">首页</Link></li>
                  <li><Link to="/categories" className="hover:text-foreground">全部分类</Link></li>
                  <li><Link to="/cart" className="hover:text-foreground">购物车</Link></li>
                  <li><Link to="/orders" className="hover:text-foreground">我的订单</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-foreground">政策与说明</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {policyNav && policyNav.length > 0 ? policyNav.map((it, i) => (
                <li key={`${it.label}-${i}`}><FooterLink item={it} /></li>
              )) : (
                <>
                  <li><Link to="/help" className="hover:text-foreground">常见问题</Link></li>
                  <li><Link to="/about" className="hover:text-foreground">关于我们</Link></li>
                  {site.privacyPolicyPath ? <li><FooterLink item={{ label: "隐私政策", path: site.privacyPolicyPath }} /></li> : site.footerPolicyUrl ? <li><FooterLink item={{ label: "隐私政策", path: site.footerPolicyUrl }} /></li> : null}
                  {site.termsPath ? <li><FooterLink item={{ label: "服务条款", path: site.termsPath }} /></li> : site.footerTermsUrl ? <li><FooterLink item={{ label: "服务条款", path: site.footerTermsUrl }} /></li> : null}
                  {site.refundPolicyPath && <li><FooterLink item={{ label: "退款政策", path: site.refundPolicyPath }} /></li>}
                  {site.shippingPolicyPath && <li><FooterLink item={{ label: "配送政策", path: site.shippingPolicyPath }} /></li>}
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-foreground">联系我们</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {site.contactPhone && <li className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0 text-gold" /><span>{site.contactPhone}</span></li>}
              {site.contactEmail && <li className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0 text-gold" /><a href={`mailto:${site.contactEmail}`} className="hover:text-foreground">{site.contactEmail}</a></li>}
              {site.contactWhatsApp && <li className="flex items-start gap-2"><Headphones size={14} className="mt-0.5 shrink-0 text-gold" />{site.whatsappUrl ? <a href={site.whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">{site.contactWhatsApp}</a> : site.contactWhatsApp}</li>}
              {site.businessHours && <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" /><span>{site.businessHours}</span></li>}
              {site.address && <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-gold" /><span>{site.address}</span></li>}
            </ul>
          </div>
        </section>

        <section className="mt-6 flex flex-wrap gap-2 md:mt-8">
          {(supportBadges.length > 0 ? supportBadges : ["正品保障", "快速配送", "安心售后"]).map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-muted-foreground"
            >
              <ShieldCheck size={12} className="text-gold" />
              {label}
            </span>
          ))}
        </section>

        <section className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-[var(--theme-border)] pt-6 text-xs text-muted-foreground md:mt-10 md:flex-row md:items-center">
          <span>{copyright}</span>
          {site.footerIcpNo && (
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {site.footerIcpNo}
            </a>
          )}
        </section>
      </div>
    </footer>
  );
}
