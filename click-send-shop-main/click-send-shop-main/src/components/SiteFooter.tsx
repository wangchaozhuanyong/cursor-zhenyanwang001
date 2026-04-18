import { Link } from "react-router-dom";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";

/**
 * 全站统一页脚 - 桌面端为 4 列，移动端为单列
 * 内容均来自后端 site_settings (useSiteInfo)
 */
export default function SiteFooter() {
  const site = useSiteInfo();
  const year = new Date().getFullYear();

  const company = site.footerCompanyName || site.siteName || "真烟网";
  const copyright =
    site.footerCopyright || `© ${year} ${company}. All rights reserved.`;

  return (
    <footer className="mt-16 border-t border-border bg-card/40">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-10 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 品牌 */}
          <div className="md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={site.siteName || "logo"}
                  className="h-8 w-8 rounded-md object-cover"
                />
              )}
              <h3 className="text-base font-bold tracking-wide">
                {renderBrandTitle(site.siteName || "真烟网")}
              </h3>
            </div>
            {site.siteSlogan && (
              <p className="text-xs text-muted-foreground">{site.siteSlogan}</p>
            )}
            {site.siteDescription && (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {site.siteDescription}
              </p>
            )}
          </div>

          {/* 快捷导航 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">快速导航</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground">首页</Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-foreground">全部分类</Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-foreground">购物车</Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-foreground">我的订单</Link>
              </li>
            </ul>
          </div>

          {/* 帮助 / 政策 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">帮助中心</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/help" className="hover:text-foreground">常见问题</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-foreground">关于我们</Link>
              </li>
              {site.footerPolicyUrl && (
                <li>
                  <a
                    href={site.footerPolicyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    隐私政策
                  </a>
                </li>
              )}
              {site.footerTermsUrl && (
                <li>
                  <a
                    href={site.footerTermsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    服务条款
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* 联系 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">联系我们</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {site.contactPhone && <li>电话：{site.contactPhone}</li>}
              {site.contactEmail && (
                <li>
                  邮箱：
                  <a
                    href={`mailto:${site.contactEmail}`}
                    className="hover:text-foreground"
                  >
                    {site.contactEmail}
                  </a>
                </li>
              )}
              {site.contactWhatsApp && (
                <li>
                  WhatsApp：
                  {site.whatsappUrl ? (
                    <a
                      href={site.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      {site.contactWhatsApp}
                    </a>
                  ) : (
                    site.contactWhatsApp
                  )}
                </li>
              )}
              {site.businessHours && <li>营业：{site.businessHours}</li>}
              {site.address && <li>地址：{site.address}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-[11px] text-muted-foreground md:flex-row">
          <span>{copyright}</span>
          {site.footerIcpNo && (
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              {site.footerIcpNo}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
