import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import { Copy, Download, Gift, QrCode, Share2, Sparkles, Ticket, Users } from "lucide-react";
import { formatDateTime } from "@/utils/formatDateTime";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { QRCodeCanvas } from "qrcode.react";
import * as inviteService from "@/services/inviteService";
import type { InviteStats, InviteRecord } from "@/types/invite";
import { copyToClipboard } from "@/utils/clipboard";
import { runGuardedDownload } from "@/utils/downloadConfirm";
import { triggerBrowserFileDownload } from "@/utils/fileDownload";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function readThemeCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const INVITE_HERO_IMAGE = "/assets/home-banners/home-hero-05-support-bg.webp";
const INVITE_POSTER_IMAGE = "/assets/home-banners/home-hero-01-platform-bg.webp";

export default function Invite() {
  const { enabled: motionEnabled } = useMotionConfig();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { inviteCode, parentInviteCode, loadProfile } = useUserStore();
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();

  useEffect(() => {
    if (!loyaltyLoading && loyaltyConfig && !loyaltyConfig.reward.referralEnabled) {
      navigate("/profile", { replace: true });
      return;
    }
    loadProfile();
    Promise.all([
      inviteService.fetchInviteStats().then(setStats),
      inviteService.fetchInviteRecords().then((d) => setRecords(d.list)),
    ]).catch(() => toast.error("加载失败"));
  }, [loadProfile, loyaltyConfig, loyaltyLoading, navigate]);

  const inviteLink = `${window.location.origin}/login?ref=${encodeURIComponent(inviteCode || "")}`;
  const qrRef = useRef<HTMLCanvasElement>(null);
  const posterPreviewRef = useRef<HTMLDivElement>(null);

  const copyLink = async () => {
    if (!inviteCode) {
      toast.error("邀请码加载中，请稍后");
      return;
    }
    const copied = await copyToClipboard(inviteLink);
    if (copied) toast.success("邀请链接已复制", toastPresetQuickSuccess);
    else toast.error("复制失败，请手动复制");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "邀请好友得奖励",
          text: `邀请好友得奖励 ${inviteCode || ""}，快来一起领取福利。`,
          url: inviteLink,
        });
        return;
      } catch {
        // Fall back to copying the invite link when native share is cancelled or unavailable.
      }
    }
    copyLink();
  };

  const downloadQR = useCallback(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const fileName = `invite-qr-${inviteCode}.png`;
    void runGuardedDownload(() => {
      triggerBrowserFileDownload(canvas.toDataURL("image/png"), fileName);
      toast.success("二维码已下载", toastPresetQuickSuccess);
    }, { title: "确认下载", fileName });
  }, [inviteCode]);

  const downloadPoster = useCallback(() => {
    const qrCanvas = qrRef.current;
    if (!qrCanvas) {
      toast.error("二维码生成中，请稍后");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const w = 900;
      const h = 1500;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas init failed");

      const themeBg = readThemeCssVar("--theme-bg", "#f5f2e8");
      const themeText = readThemeCssVar("--theme-text", "#111111");
      const themeMuted = readThemeCssVar("--theme-text-muted", "#6b7280");
      const themePrimary = readThemeCssVar("--theme-primary", "#111111");
      const themePrimaryFg = readThemeCssVar("--theme-primary-foreground", "#ffffff");
      const themePrice = readThemeCssVar("--theme-price", "#d97706");
      const themeSurface = readThemeCssVar("--theme-surface", "#ffffff");

      ctx.fillStyle = themeBg;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = themeText;
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("邀请好友得奖励", w / 2, 120);

      ctx.fillStyle = themeMuted;
      ctx.font = "28px sans-serif";
      ctx.fillText("好友付款成功即可获得现金返现", w / 2, 170);

      ctx.fillStyle = themePrice;
      ctx.fillRect(100, 220, w - 200, 170);
      ctx.fillStyle = themePrimaryFg;
      ctx.font = "26px sans-serif";
      ctx.fillText("我的邀请码", w / 2, 285);
      ctx.font = "bold 58px monospace";
      ctx.fillText(inviteCode || "----", w / 2, 355);

      ctx.fillStyle = themeSurface;
      ctx.fillRect(210, 450, 480, 480);
      ctx.drawImage(qrCanvas, 240, 480, 420, 420);

      ctx.fillStyle = themeText;
      ctx.font = "24px sans-serif";
      ctx.fillText("扫码注册，自动绑定邀请关系", w / 2, 980);

      ctx.fillStyle = themeMuted;
      ctx.font = "20px sans-serif";
      ctx.fillText("规则：邀请好友消费后可获积分/返现，具体以平台规则为准", w / 2, 1060);

      ctx.fillStyle = themePrimary;
      ctx.font = "22px sans-serif";
      ctx.fillText(inviteLink, w / 2, 1140);

      const fileName = `invite-poster-${inviteCode}.png`;
      void runGuardedDownload(() => {
        triggerBrowserFileDownload(canvas.toDataURL("image/png"), fileName);
        toast.success("海报已下载", toastPresetQuickSuccess);
      }, { title: "确认下载", fileName });
    } catch {
      toast.error("海报生成失败");
    }
  }, [inviteCode, inviteLink]);

  const qrFg =
    typeof document !== "undefined" ? readThemeCssVar("--theme-text", "#111111") : "#111111";
  const qrBg =
    typeof document !== "undefined" ? readThemeCssVar("--theme-surface", "#ffffff") : "#ffffff";

  return (
    <StoreAccountLayout title="邀请中心" onBack={goBack} className="store-v12-page store-account-subpage-v12-page store-invite-v12-page" mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full space-y-0 md:max-w-5xl xl:max-w-4xl">
        <section
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-5 shadow-[var(--theme-shadow)] sm:px-6 sm:py-6"
          style={{
            backgroundImage: `linear-gradient(112deg, color-mix(in srgb, var(--theme-surface) 95%, transparent) 0%, color-mix(in srgb, var(--theme-surface) 84%, transparent) 46%, color-mix(in srgb, var(--theme-bg) 42%, transparent) 100%), url("${INVITE_HERO_IMAGE}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 py-1 text-xs font-semibold text-[var(--theme-primary)]">
                <Sparkles size={13} aria-hidden />
                会员邀请计划
              </span>
              <h2 className="mt-3 max-w-2xl text-[26px] font-black leading-tight text-[var(--theme-text-on-surface)] sm:text-4xl">
                把采购体验分享给朋友
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted-on-surface)]">
                复制专属链接或海报，好友注册并下单后，奖励会自动记录到你的账户。
              </p>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">我的邀请码</p>
                  <p className="mt-1 truncate font-mono text-2xl font-black text-[var(--theme-price)]">{inviteCode || "加载中"}</p>
                </div>
                <UnifiedButton
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-bold text-[var(--theme-primary-foreground)]"
                >
                  <Copy size={15} aria-hidden />
                  复制链接
                </UnifiedButton>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                <UnifiedButton
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-price)] px-4 text-sm font-bold text-[var(--theme-price-foreground)]"
                >
                  <Share2 size={15} aria-hidden />
                  分享邀请
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={downloadPoster}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_74%,transparent)] px-4 text-sm font-bold text-[var(--theme-text-on-surface)] backdrop-blur"
                >
                  <Download size={15} aria-hidden />
                  下载海报
                </UnifiedButton>
              </div>
            </div>

            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)] p-4 shadow-[0_20px_46px_-32px_color-mix(in_srgb,var(--theme-price)_54%,transparent)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">邀请素材</p>
                  <p className="mt-1 text-sm font-black text-[var(--theme-text-on-surface)]">扫码自动绑定</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))] text-[var(--theme-price)]">
                  <QrCode size={20} aria-hidden />
                </span>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                  <QRCodeCanvas value={inviteLink} size={132} level="H" marginSize={1} fgColor={qrFg} bgColor={qrBg} />
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)]">
                {loyaltyLoading ? "奖励规则同步中" : "好友注册后进入邀请记录"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat
            icon={<Users size={16} aria-hidden />}
            title="邀请人数"
            value={String(stats?.totalInvited ?? stats?.directCount ?? 0)}
            caption="累计关系"
          />
          <Stat
            icon={<Ticket size={16} aria-hidden />}
            title="分享消费"
            value={`RM ${Number(stats?.totalOrderAmount ?? 0).toFixed(2)}`}
            caption="成交金额"
          />
          <Stat
            icon={<Gift size={16} aria-hidden />}
            title="返现奖励"
            value={`RM ${Number(stats?.totalReward ?? 0).toFixed(2)}`}
            caption="累计奖励"
          />
        </div>

        <section ref={posterPreviewRef} className="mt-5 grid gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div
            className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] px-4 py-5 text-center"
            style={{
              backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 91%, transparent), color-mix(in srgb, var(--theme-bg) 56%, transparent)), url("${INVITE_POSTER_IMAGE}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          >
            <p className="text-xs font-bold text-[var(--theme-price)]">专属邀请海报</p>
            <p className="mt-2 text-2xl font-black leading-tight text-[var(--theme-text)]">邀请好友得奖励</p>
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">好友付款成功即可获得现金返现</p>
            <p className="mt-4 text-xs font-semibold text-[var(--theme-text-muted)]">我的邀请码</p>
            <p className="font-mono text-2xl font-black text-[var(--theme-price)] sm:text-3xl">{inviteCode || "----"}</p>
            <motion.div
              className="mt-4 inline-block rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[0_18px_40px_-30px_color-mix(in_srgb,var(--theme-text)_40%,transparent)]"
              initial={motionEnabled ? { opacity: 0, scale: 0.92 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, delay: inviteCode ? 0.08 : 0 }}
              key={inviteCode || "pending"}
            >
              <QRCodeCanvas ref={qrRef} value={inviteLink} size={170} level="H" marginSize={1} fgColor={qrFg} bgColor={qrBg} />
            </motion.div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--theme-text-muted)]">扫码注册，系统自动绑定邀请关系</p>
          </div>

          <div className="flex min-w-0 flex-col justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-[var(--theme-text-on-surface)]">分享资产工具</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--theme-text-muted-on-surface)]">
                链接、二维码和海报都可以直接分享。
              </p>
              <div className="mt-3 grid gap-2">
                {["复制链接", "下载二维码", "下载海报"].map((label) => (
                  <div key={label} className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_58%,var(--theme-surface))] px-3 py-2 text-xs font-semibold text-[var(--theme-text-on-surface)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--theme-price)]" aria-hidden />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <UnifiedButton onClick={downloadQR} className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--theme-border)] py-2.5 text-xs font-bold">
                <QrCode size={13} aria-hidden />
                下载二维码
              </UnifiedButton>
              <UnifiedButton onClick={downloadPoster} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--theme-primary)] py-2.5 text-xs font-bold text-[var(--theme-primary-foreground)]">
                <Download size={13} aria-hidden />
                下载海报
              </UnifiedButton>
            </div>
          </div>
        </section>

        {parentInviteCode ? (
          <section className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm shadow-[var(--theme-shadow)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">绑定关系</p>
              <p className="mt-1 truncate font-semibold text-[var(--theme-text-on-surface)]">上级邀请码：{parentInviteCode}</p>
            </div>
            <Gift size={20} className="shrink-0 text-[var(--theme-price)]" aria-hidden />
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-black text-[var(--theme-text-on-surface)]">
              <Users size={16} className="text-[var(--theme-price)]" aria-hidden />
              <span>分享用户</span>
            </h3>
            <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] px-2 py-1 text-[11px] font-semibold text-[var(--theme-primary)]">
              {records.length} 人
            </span>
          </div>
          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_60%,var(--theme-surface))] p-8 text-center text-sm text-[var(--theme-text-muted-on-surface)]">
              暂无分享用户，生成海报或复制链接后开始邀请。
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_44%,var(--theme-surface))] px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))] text-sm font-black text-[var(--theme-price)]">{(r.invitee_nickname || "用户").charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--theme-text-on-surface)]">{r.invitee_nickname || "用户"}</p>
                    <p className="text-[11px] text-[var(--theme-text-muted-on-surface)]">{formatDateTime(r.created_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-[var(--theme-primary)]">{r.status === "ordered" ? "已消费" : "已注册"}</p>
                    <p className="mt-1 text-[11px] text-[var(--theme-text-muted-on-surface)]">RM {Number(r.reward_amount ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </StoreAccountLayout>
  );
}

function Stat({ icon, title, value, caption }: { icon: ReactNode; title: string; value: string; caption: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[0_14px_32px_-28px_color-mix(in_srgb,var(--theme-text)_40%,transparent)]">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--theme-text-muted-on-surface)]">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))] text-[var(--theme-price)]">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </div>
      <p className="mt-2 truncate text-sm font-black tabular-nums text-[var(--theme-text-on-surface)] sm:text-lg">{value}</p>
      <p className="mt-1 truncate text-[10px] text-[var(--theme-text-muted-on-surface)]">{caption}</p>
    </div>
  );
}
