import { useRef, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, Download, Share2, Users, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import * as inviteService from "@/services/inviteService";
import type { InviteStats, InviteRecord } from "@/types/invite";

export default function Invite() {
  const navigate = useNavigate();
  const { inviteCode, parentInviteCode, subordinateEnabled, loadProfile } = useUserStore();
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [bindCode, setBindCode] = useState("");
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    loadProfile();
    Promise.all([
      inviteService.fetchInviteStats().then(setStats),
      inviteService.fetchInviteRecords().then((d) => setRecords(d.list)),
    ]).catch(() => toast.error("加载失败"));
  }, [loadProfile]);

  const handleBind = async () => {
    if (!bindCode.trim()) { toast.error("请输入邀请码"); return; }
    setBinding(true);
    try {
      await inviteService.bindInviteCode(bindCode.trim());
      toast.success("绑定成功");
      setBindCode("");
      loadProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "绑定失败");
    } finally {
      setBinding(false);
    }
  };
  const inviteLink = `${window.location.origin}?ref=${inviteCode}`;
  const posterRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const copyCode = () => {
    if (!inviteCode) { toast.error("邀请码加载中，请稍后"); return; }
    navigator.clipboard.writeText(inviteCode).then(
      () => toast.success("邀请码已复制"),
      () => toast.error("复制失败，请手动复制")
    );
  };

  const copyLink = () => {
    if (!inviteCode) { toast.error("邀请码加载中，请稍后"); return; }
    navigator.clipboard.writeText(inviteLink).then(
      () => toast.success("邀请链接已复制"),
      () => toast.error("复制失败，请手动复制")
    );
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "邀请好友 赚取奖励",
          text: `使用我的邀请码 ${inviteCode} 注册，享受专属优惠！`,
          url: inviteLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  const downloadQR = useCallback(() => {
    const canvas = posterRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `invite-${inviteCode}.png`;
    a.click();
    toast.success("二维码已下载");
  }, [inviteCode]);

  const downloadPoster = useCallback(async () => {
    try {
      const canvas = document.createElement("canvas");
      const w = 600;
      const h = 900;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1a1a1a");
      grad.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Gold accent line
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(0, 0, w, 4);

      // Title
      ctx.fillStyle = "#D4AF37";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("邀请好友 赚取奖励", w / 2, 80);

      // Subtitle
      ctx.fillStyle = "#999";
      ctx.font = "16px sans-serif";
      ctx.fillText("扫描下方二维码加入", w / 2, 120);

      // QR code from existing canvas
      const qrCanvas = posterRef.current?.querySelector("canvas");
      if (qrCanvas) {
        const qrSize = 280;
        const qrX = (w - qrSize) / 2;
        const qrY = 180;
        // White background for QR
        ctx.fillStyle = "#fff";
        const pad = 20;
        ctx.beginPath();
        ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 16);
        ctx.fill();
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
      }

      // Invite code section
      ctx.fillStyle = "rgba(212,175,55,0.15)";
      ctx.beginPath();
      ctx.roundRect(100, 530, w - 200, 80, 12);
      ctx.fill();

      ctx.fillStyle = "#999";
      ctx.font = "14px sans-serif";
      ctx.fillText("我的邀请码", w / 2, 560);

      ctx.fillStyle = "#D4AF37";
      ctx.font = "bold 32px monospace";
      ctx.fillText(inviteCode, w / 2, 598);

      // Footer
      ctx.fillStyle = "#666";
      ctx.font = "13px sans-serif";
      ctx.fillText("每位好友消费，您都能获得积分返现", w / 2, 680);

      // Bottom gold line
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(0, h - 4, w, 4);

      // Download
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `invite-poster-${inviteCode}.png`;
      a.click();
      toast.success("海报已下载");
    } catch {
      toast.error("海报生成失败");
    }
  }, [inviteCode]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">邀请中心</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Invite card */}
        <div className="rounded-xl bg-primary p-6 text-center">
          <Share2 size={32} className="mx-auto text-gold" />
          <h2 className="mt-3 font-display text-xl font-bold text-primary-foreground">邀请好友 赚取奖励</h2>
          <p className="mt-1 text-xs text-primary-foreground/70">每位好友消费，您都能获得积分返现</p>

          <div className="mt-6 rounded-lg bg-primary-foreground/10 p-4">
            <p className="text-xs text-primary-foreground/70">我的邀请码</p>
            <p className="mt-1 text-2xl font-bold tracking-widest text-gold">{inviteCode}</p>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={copyCode} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gold py-3 text-sm font-semibold text-primary-foreground">
              <Copy size={14} /> 复制邀请码
            </button>
            <button onClick={handleShare} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-primary-foreground/30 py-3 text-sm font-semibold text-primary-foreground">
              <Share2 size={14} /> {typeof navigator !== "undefined" && navigator.share ? "分享" : "复制链接"}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center" ref={posterRef}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">邀请二维码</h3>
          <div className="mx-auto inline-block rounded-xl bg-white p-4">
            <QRCodeCanvas
              ref={qrRef}
              value={inviteLink}
              size={180}
              level="H"
              marginSize={1}
              fgColor="#1a1a1a"
              bgColor="#ffffff"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">扫描二维码即可注册并绑定邀请关系</p>
          <div className="mt-4 flex gap-3">
            <button onClick={downloadQR} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border py-2.5 text-sm text-foreground transition-colors hover:bg-secondary">
              <Download size={14} /> 下载二维码
            </button>
            <button onClick={downloadPoster} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gold py-2.5 text-sm font-semibold text-primary-foreground">
              <Download size={14} /> 下载海报
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-bold text-gold">{stats?.directCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">邀请人数</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-bold text-foreground">RM {stats?.totalOrderAmount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">下级消费</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-bold text-gold">{stats?.totalReward ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">返现奖励</p>
          </div>
        </div>

        {/* Bind invite code */}
        {!parentInviteCode && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 size={16} className="text-gold" /> 绑定邀请码
            </h3>
            <div className="flex gap-2">
              <input
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value.toUpperCase())}
                placeholder="输入邀请码"
                className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground"
              />
              <button
                onClick={handleBind}
                disabled={binding}
                className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {binding ? "绑定中..." : "绑定"}
              </button>
            </div>
          </div>
        )}

        {/* Parent */}
        {parentInviteCode && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">我的上级邀请码</p>
            <p className="mt-1 font-semibold text-foreground">{parentInviteCode}</p>
          </div>
        )}

        {/* Subordinate list */}
        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users size={16} className="text-gold" /> 我的下级
          </h3>
          {records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              暂无下级用户，快去邀请好友吧！
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                    {(r.invitee_nickname || "用户").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.invitee_nickname || "用户"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
