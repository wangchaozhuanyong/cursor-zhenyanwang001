import { useRef, useCallback, useEffect, useState } from "react";
import { Copy, Download, Share2, Users, Gift } from "lucide-react";
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
    <StoreAccountLayout title="邀请中心" onBack={goBack} mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full space-y-0 sm:max-w-lg xl:max-w-3xl">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[linear-gradient(110deg,color-mix(in_srgb,var(--theme-secondary)_16%,var(--theme-surface)),var(--theme-surface))] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--theme-primary)]/15 p-2 text-[var(--theme-primary)]"><Gift size={22} /></div>
            <div>
              <h2 className="font-semibold text-[var(--theme-text-on-surface)]">邀请好友得奖励</h2>
              <p className="text-xs text-[var(--theme-text-muted-on-surface)]">好友付款成功即可获得现金返现</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <UnifiedButton onClick={copyLink} className="rounded-full bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">复制邀请链接</UnifiedButton>
            <UnifiedButton onClick={handleShare} className="rounded-full border border-[var(--theme-border)] py-2.5 text-sm font-semibold">分享邀请</UnifiedButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat title="邀请人数" value={String(stats?.directCount ?? 0)} />
          <Stat title="分享消费" value={`RM ${Number(stats?.totalOrderAmount ?? 0).toFixed(2)}`} />
          <Stat title="返现奖励" value={`RM ${Number(stats?.totalReward ?? 0).toFixed(2)}`} />
        </div>

        <div ref={posterPreviewRef} className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--theme-text)]">邀请海报预览</h3>
          <div className="mt-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 text-center">
            <p className="text-xl font-bold">邀请好友得奖励</p>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">好友付款成功即可获得现金返现</p>
            <p className="mt-3 text-xs text-[var(--theme-text-muted)]">我的邀请码</p>
            <p className="text-xl font-black tracking-wide text-[var(--theme-price)] sm:text-[22px]">{inviteCode || "----"}</p>
            <motion.div
              className="mt-3 inline-block rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
              initial={motionEnabled ? { opacity: 0, scale: 0.92 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, delay: inviteCode ? 0.08 : 0 }}
              key={inviteCode || "pending"}
            >
              <QRCodeCanvas ref={qrRef} value={inviteLink} size={170} level="H" marginSize={1} fgColor={qrFg} bgColor={qrBg} />
            </motion.div>
            <p className="mt-2 text-[11px] text-[var(--theme-text-muted)]">规则：邀请好友消费后可获积分/返现</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <UnifiedButton onClick={downloadQR} className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--theme-border)] py-2 text-xs"><Download size={12} /> 下载二维码</UnifiedButton>
            <UnifiedButton onClick={downloadPoster} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--theme-primary)] py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"><Download size={12} /> 下载海报</UnifiedButton>
          </div>
        </div>

        {parentInviteCode ? (
          <div className="mt-5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm">
            上级邀请码：<span className="font-semibold">{parentInviteCode}</span>
          </div>
        ) : null}

        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users size={16} className="text-[var(--theme-price)]" /> 分享用户</h3>
          {records.length === 0 ? (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center text-sm text-muted-foreground">暂无分享用户，快去邀请好友吧</div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-price)]/10 text-sm font-bold text-[var(--theme-price)]">{(r.invitee_nickname || "用户").charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.invitee_nickname || "用户"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </StoreAccountLayout>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-center">
      <p className="text-sm font-bold text-[var(--theme-text)]">{value}</p>
      <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{title}</p>
    </div>
  );
}
