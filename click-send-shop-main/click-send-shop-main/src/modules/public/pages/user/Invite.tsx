import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgePercent, Check, Copy, Download, Gift, Landmark, Share2, ShoppingBag, Ticket, Users } from "lucide-react";
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
import logoIconUrl from "@/assets/logo-icon.png";

const INVITE_HERO_IMAGE = "/assets/home-banners/invite-hero-premium-bg.webp";
const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1440;

type PosterTemplateId = "shopping" | "reward" | "life";
type PosterLayout = PosterTemplateId;

type PosterPalette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  soft: string;
  border: string;
};

type PosterTemplate = {
  id: PosterTemplateId;
  name: string;
  shortName: string;
  usage: string;
  title: string;
  subtitle: string;
  note: string;
  image: string;
  layout: PosterLayout;
  palette: PosterPalette;
};

const POSTER_TEMPLATES: readonly PosterTemplate[] = [
  {
    id: "shopping",
    name: "精选好物采购风",
    shortName: "精选好物",
    usage: "普通客户 / 家庭用户 / 熟人群",
    title: "扫码进入大马通",
    subtitle: "马来西亚华人精选好物与生活服务",
    note: "精选好物、优惠与本地生活服务，一码直达。",
    image: "/assets/home-banners/home-hero-03-local-goods-bg.webp",
    layout: "shopping",
    palette: {
      bg: "#f7fbf8",
      surface: "#ffffff",
      ink: "#10231f",
      muted: "#66746e",
      primary: "#0f6f5c",
      secondary: "#d7f1e8",
      accent: "#24b99a",
      soft: "#edf8f3",
      border: "#d7e9e1",
    },
  },
  {
    id: "reward",
    name: "会员返利福利风",
    shortName: "返利福利",
    usage: "朋友圈 / 微信群 / 活动分享",
    title: "好友下单，奖励到账",
    subtitle: "通过我的专属二维码注册，自动绑定邀请关系",
    note: "注册后下单，奖励按平台规则自动记录。",
    image: "/assets/home-banners/home-hero-05-support-bg.webp",
    layout: "reward",
    palette: {
      bg: "#fff8ed",
      surface: "#fffdf8",
      ink: "#3a1f14",
      muted: "#8c6a58",
      primary: "#c84a34",
      secondary: "#f3c766",
      accent: "#8f1f13",
      soft: "#fff0dc",
      border: "#f0d3ad",
    },
  },
  {
    id: "life",
    name: "马来西亚生活服务风",
    shortName: "生活服务",
    usage: "新客户 / 留学生 / 第二家园客户",
    title: "在马来西亚，生活采购更省心",
    subtitle: "商品、服务、优惠，一码直达",
    note: "覆盖采购、生活服务与本地优惠。",
    image: "/assets/home-banners/home-hero-01-platform-bg.webp",
    layout: "life",
    palette: {
      bg: "#eef5f3",
      surface: "#ffffff",
      ink: "#10231f",
      muted: "#64736e",
      primary: "#0b6b5a",
      secondary: "#d9c086",
      accent: "#143d34",
      soft: "#e6f3ef",
      border: "#d1e3de",
    },
  },
];

function getPosterTemplate(id: PosterTemplateId): PosterTemplate {
  return POSTER_TEMPLATES.find((template) => template.id === id) ?? POSTER_TEMPLATES[0];
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function font(weight: number, size: number): string {
  return `${weight} ${size}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
  roundedPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, stroke: string, lineWidth = 2) {
  roundedPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, opacity = 1) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): number {
  let line = "";
  let lines = 0;
  for (const char of text) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = char;
      if (lines >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawPosterBrand(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, palette: PosterPalette, x: number, y: number) {
  fillRoundRect(ctx, x, y, 72, 72, 24, palette.surface);
  strokeRoundRect(ctx, x, y, 72, 72, 24, palette.border, 2);
  if (logo) ctx.drawImage(logo, x + 10, y + 10, 52, 52);
  ctx.fillStyle = palette.ink;
  ctx.font = font(900, 33);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("大马通", x + 94, y + 44);
  ctx.fillStyle = palette.muted;
  ctx.font = font(600, 18);
  ctx.fillText("Malaysia Chinese Lifestyle", x + 96, y + 70);
}

async function createPosterCanvas({
  template,
  qrCanvas,
  inviteCode,
  logoUrl,
}: {
  template: PosterTemplate;
  qrCanvas: HTMLCanvasElement;
  inviteCode: string;
  logoUrl: string;
}): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas init failed");

  const [background, logo] = await Promise.all([
    loadCanvasImage(template.image).catch(() => null),
    loadCanvasImage(logoUrl).catch(() => null),
  ]);
  const palette = template.palette;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  if (template.layout === "shopping") {
    if (background) drawCoverImage(ctx, background, 0, 0, POSTER_WIDTH, 620, 0.2);
    const gradient = ctx.createLinearGradient(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.58, palette.bg);
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    if (background) drawCoverImage(ctx, background, 560, 116, 420, 320, 0.72);

    drawPosterBrand(ctx, logo, palette, 72, 74);
    ctx.fillStyle = palette.primary;
    ctx.font = font(900, 34);
    ctx.textAlign = "left";
    ctx.fillText("精选好物采购", 72, 254);
    ctx.fillStyle = palette.ink;
    ctx.font = font(950, 72);
    drawWrappedText(ctx, template.title, 72, 350, 620, 86, 2);
    ctx.fillStyle = palette.muted;
    ctx.font = font(650, 31);
    drawWrappedText(ctx, template.subtitle, 72, 482, 650, 44, 2);

    fillRoundRect(ctx, 96, 806, 888, 474, 48, palette.surface);
    strokeRoundRect(ctx, 96, 806, 888, 474, 48, palette.border, 3);
    fillRoundRect(ctx, 330, 864, 420, 420, 34, "#ffffff");
    ctx.drawImage(qrCanvas, 370, 904, 340, 340);
    ctx.fillStyle = palette.primary;
    ctx.font = font(900, 32);
    ctx.textAlign = "center";
    ctx.fillText(`邀请码：${inviteCode}`, POSTER_WIDTH / 2, 1340);
    ctx.fillStyle = palette.muted;
    ctx.font = font(600, 22);
    ctx.fillText(template.note, POSTER_WIDTH / 2, 1382);
  }

  if (template.layout === "reward") {
    const gradient = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT);
    gradient.addColorStop(0, "#fff6df");
    gradient.addColorStop(0.5, "#fffdf8");
    gradient.addColorStop(1, "#fff0df");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    if (background) drawCoverImage(ctx, background, 0, 0, POSTER_WIDTH, POSTER_HEIGHT, 0.1);
    ctx.save();
    ctx.translate(708, 126);
    ctx.rotate(-0.12);
    fillRoundRect(ctx, 0, 0, 300, 78, 28, "rgba(200,74,52,0.12)");
    fillRoundRect(ctx, 34, 24, 220, 38, 19, "rgba(243,199,102,0.32)");
    ctx.restore();

    drawPosterBrand(ctx, logo, palette, 72, 74);
    fillRoundRect(ctx, 72, 238, 270, 58, 29, palette.primary);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(850, 26);
    ctx.textAlign = "center";
    ctx.fillText("会员返利福利", 207, 276);

    ctx.fillStyle = palette.ink;
    ctx.textAlign = "left";
    ctx.font = font(950, 78);
    drawWrappedText(ctx, template.title, 72, 404, 820, 92, 2);
    ctx.fillStyle = palette.muted;
    ctx.font = font(650, 30);
    drawWrappedText(ctx, template.subtitle, 72, 584, 790, 45, 2);

    fillRoundRect(ctx, 84, 780, 912, 408, 52, "#fffaf1");
    strokeRoundRect(ctx, 84, 780, 912, 408, 52, palette.border, 3);
    fillRoundRect(ctx, 130, 838, 332, 332, 34, "#ffffff");
    ctx.drawImage(qrCanvas, 164, 872, 264, 264);
    ctx.fillStyle = palette.primary;
    ctx.font = font(950, 42);
    ctx.textAlign = "left";
    ctx.fillText(`邀请码：${inviteCode}`, 512, 938);
    ctx.fillStyle = palette.ink;
    ctx.font = font(850, 34);
    ctx.fillText("扫码自动绑定关系", 512, 1006);
    ctx.fillStyle = palette.muted;
    ctx.font = font(600, 24);
    drawWrappedText(ctx, template.note, 512, 1068, 386, 36, 2);

    fillRoundRect(ctx, 210, 1270, 660, 62, 31, palette.primary);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(850, 25);
    ctx.textAlign = "center";
    ctx.fillText("分享给好友，奖励明细自动记录", POSTER_WIDTH / 2, 1311);
  }

  if (template.layout === "life") {
    if (background) drawCoverImage(ctx, background, 0, 0, POSTER_WIDTH, POSTER_HEIGHT, 0.9);
    const overlay = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT);
    overlay.addColorStop(0, "rgba(255,255,255,0.88)");
    overlay.addColorStop(0.44, "rgba(255,255,255,0.56)");
    overlay.addColorStop(1, "rgba(7,48,42,0.82)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

    drawPosterBrand(ctx, logo, palette, 72, 74);
    ctx.fillStyle = palette.ink;
    ctx.font = font(950, 66);
    ctx.textAlign = "left";
    drawWrappedText(ctx, template.title, 72, 330, 760, 82, 3);
    ctx.fillStyle = palette.muted;
    ctx.font = font(650, 31);
    drawWrappedText(ctx, template.subtitle, 72, 612, 620, 46, 2);

    fillRoundRect(ctx, 92, 952, 896, 300, 46, "rgba(255,255,255,0.93)");
    strokeRoundRect(ctx, 92, 952, 896, 300, 46, "rgba(255,255,255,0.8)", 2);
    fillRoundRect(ctx, 676, 996, 230, 230, 30, "#ffffff");
    ctx.drawImage(qrCanvas, 704, 1024, 174, 174);
    ctx.fillStyle = palette.ink;
    ctx.font = font(900, 38);
    ctx.fillText("商品、服务、优惠", 146, 1046);
    ctx.fillStyle = palette.primary;
    ctx.font = font(850, 30);
    ctx.fillText("一码直达", 146, 1102);
    ctx.fillStyle = palette.muted;
    ctx.font = font(600, 24);
    drawWrappedText(ctx, `邀请码：${inviteCode} · ${template.note}`, 146, 1164, 474, 36, 2);
  }

  return canvas;
}

export default function Invite() {
  const { enabled: motionEnabled } = useMotionConfig();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { inviteCode, parentInviteCode, loadProfile } = useUserStore();
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<PosterTemplateId>("shopping");
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
  const inviteCodeLabel = inviteCode || "加载中";
  const previewInviteCode = inviteCode || "0CDB54";
  const qrRef = useRef<HTMLCanvasElement>(null);
  const selectedTemplate = useMemo(() => getPosterTemplate(selectedTemplateId), [selectedTemplateId]);

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
    if (!inviteCode) {
      toast.error("邀请码加载中，请稍后");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedTemplate.title,
          text: `${selectedTemplate.title}，邀请码：${inviteCode}`,
          url: inviteLink,
        });
        return;
      } catch {
        // Fall back to copying the invite link when native share is cancelled or unavailable.
      }
    }
    copyLink();
  };

  const downloadPoster = useCallback(() => {
    if (!inviteCode) {
      toast.error("邀请码加载中，请稍后");
      return;
    }
    const qrCanvas = qrRef.current;
    if (!qrCanvas) {
      toast.error("二维码生成中，请稍后");
      return;
    }
    const fileName = `damatong-invite-${selectedTemplate.id}-${inviteCode}.png`;
    void runGuardedDownload(async () => {
      try {
        const canvas = await createPosterCanvas({
          template: selectedTemplate,
          qrCanvas,
          inviteCode,
          logoUrl: logoIconUrl,
        });
        triggerBrowserFileDownload(canvas.toDataURL("image/png"), fileName);
        toast.success("海报已下载", toastPresetQuickSuccess);
      } catch {
        toast.error("海报生成失败");
      }
    }, { title: "确认下载海报", fileName });
  }, [inviteCode, selectedTemplate]);

  return (
    <StoreAccountLayout title="邀请中心" onBack={goBack} className="store-v12-page store-account-subpage-v12-page store-invite-v12-page" mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full space-y-0 md:max-w-5xl xl:max-w-4xl">
        <div className="pointer-events-none fixed -left-[9999px] -top-[9999px]" aria-hidden>
          <QRCodeCanvas ref={qrRef} value={inviteLink} size={520} level="H" marginSize={2} fgColor="#12231f" bgColor="#ffffff" />
        </div>

        <section
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-5 shadow-[var(--theme-shadow)] sm:px-6 sm:py-6"
          style={{
            backgroundImage: `linear-gradient(112deg, color-mix(in srgb, var(--theme-surface) 98%, transparent) 0%, color-mix(in srgb, var(--theme-surface) 92%, transparent) 52%, color-mix(in srgb, var(--theme-bg) 34%, transparent) 100%), radial-gradient(circle at 86% 14%, color-mix(in srgb, var(--theme-price) 14%, transparent), transparent 34%), url("${INVITE_HERO_IMAGE}")`,
            backgroundPosition: "center right",
            backgroundSize: "cover",
          }}
        >
          <div className="relative grid gap-4 text-center">
            <div className="mx-auto w-full max-w-2xl min-w-0">
              <h2 className="mx-auto max-w-2xl text-center text-[26px] font-black leading-tight text-[var(--theme-text-on-surface)] sm:text-4xl">
                把采购体验分享给朋友
              </h2>
              <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] p-3 text-center backdrop-blur">
                <p className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">我的邀请码</p>
                <div className="mt-2 flex flex-col items-center gap-3">
                  <p className="max-w-full truncate text-center font-mono text-2xl font-black text-[var(--theme-price)]">{inviteCodeLabel}</p>
                  <div className="grid w-full max-w-[328px] grid-cols-2 gap-2 sm:max-w-sm">
                    <UnifiedButton
                      type="button"
                      onClick={copyLink}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-bold text-[var(--theme-primary-foreground)]"
                    >
                      <Copy size={15} aria-hidden />
                      复制链接
                    </UnifiedButton>
                    <UnifiedButton
                      type="button"
                      onClick={handleShare}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-price)] px-4 text-sm font-bold text-[var(--theme-price-foreground)]"
                    >
                      <Share2 size={15} aria-hidden />
                      分享邀请
                    </UnifiedButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat
            icon={<Users size={15} aria-hidden />}
            title="邀请人数"
            value={String(stats?.totalInvited ?? stats?.directCount ?? 0)}
            caption="累计"
          />
          <Stat
            icon={<Ticket size={15} aria-hidden />}
            title="分享消费"
            value={`RM ${Number(stats?.totalOrderAmount ?? 0).toFixed(2)}`}
            caption="成交"
          />
          <Stat
            icon={<Gift size={15} aria-hidden />}
            title="返现奖励"
            value={`RM ${Number(stats?.totalReward ?? 0).toFixed(2)}`}
            caption="奖励"
          />
        </div>

        <section className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <div className="relative flex items-center justify-center">
            <div className="min-w-0 text-center">
              <h3 className="text-center text-lg font-black text-[var(--theme-text-on-surface)]">选择分享海报</h3>
            </div>
            <span className="absolute right-0 hidden shrink-0 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] sm:inline-flex">
              3 款模板
            </span>
          </div>

          <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
            {POSTER_TEMPLATES.map((template) => {
              const active = template.id === selectedTemplateId;
              return (
                <UnifiedButton
                  key={template.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`min-w-[10.6rem] rounded-2xl border p-2 text-left transition active:scale-[0.99] sm:min-w-0 ${
                    active
                      ? "border-[color-mix(in_srgb,var(--theme-primary)_48%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] shadow-[0_16px_34px_-30px_color-mix(in_srgb,var(--theme-primary)_50%,transparent)]"
                      : "border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_36%,var(--theme-surface))]"
                  }`}
                >
                  <PosterPreview template={template} inviteLink={inviteLink} inviteCode={previewInviteCode} compact />
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-[var(--theme-text-on-surface)]">{template.shortName}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[var(--theme-text-muted-on-surface)]">{template.usage}</p>
                    </div>
                    {active ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
                        <Check size={12} aria-hidden />
                      </span>
                    ) : null}
                  </div>
                </UnifiedButton>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <motion.div
              key={selectedTemplate.id}
              initial={motionEnabled ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="mx-auto w-full max-w-[25rem] lg:max-w-none"
            >
              <PosterPreview template={selectedTemplate} inviteLink={inviteLink} inviteCode={previewInviteCode} />
            </motion.div>

            <div className="rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_42%,var(--theme-surface))] p-4">
              <div className="grid gap-2 text-xs font-semibold text-[var(--theme-text-on-surface)]">
                <PosterPoint icon={<ShoppingBag size={14} aria-hidden />} label={selectedTemplate.title} />
                <PosterPoint icon={<BadgePercent size={14} aria-hidden />} label={selectedTemplate.subtitle} />
                <PosterPoint icon={<Landmark size={14} aria-hidden />} label={`邀请码：${previewInviteCode}`} />
              </div>
              <div className="mt-4 grid gap-2">
                <UnifiedButton
                  type="button"
                  onClick={downloadPoster}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-black text-[var(--theme-primary-foreground)]"
                >
                  <Download size={16} aria-hidden />
                  下载当前海报
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-sm font-bold text-[var(--theme-text-on-surface)]"
                >
                  <Copy size={15} aria-hidden />
                  复制邀请链接
                </UnifiedButton>
              </div>
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
              暂无分享用户，选择海报或复制链接后开始邀请。
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_44%,var(--theme-surface))] px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))] text-sm font-black text-[var(--theme-price)]">
                    {(record.invitee_nickname || "用户").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--theme-text-on-surface)]">{record.invitee_nickname || "用户"}</p>
                    <p className="text-[11px] text-[var(--theme-text-muted-on-surface)]">{formatDateTime(record.created_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-[var(--theme-primary)]">{record.status === "ordered" ? "已消费" : "已注册"}</p>
                    <p className="mt-1 text-[11px] text-[var(--theme-text-muted-on-surface)]">RM {Number(record.reward_amount ?? 0).toFixed(2)}</p>
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

function PosterPreview({
  template,
  inviteLink,
  inviteCode,
  compact = false,
}: {
  template: PosterTemplate;
  inviteLink: string;
  inviteCode: string;
  compact?: boolean;
}) {
  const qrSize = compact ? 42 : 132;
  const logoSize = compact ? 18 : 34;
  const palette = template.palette;

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden border text-left ${compact ? "rounded-xl p-2" : "rounded-[1.35rem] p-5 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.42)] sm:p-6"}`}
      style={{
        borderColor: palette.border,
        background:
          template.layout === "reward"
            ? `linear-gradient(160deg, ${palette.bg}, ${palette.surface} 52%, ${palette.soft})`
            : `linear-gradient(160deg, rgba(255,255,255,0.92), rgba(255,255,255,0.62)), url("${template.image}") center / cover`,
        color: palette.ink,
      }}
    >
      {template.layout === "reward" ? (
        <div className="absolute right-3 top-5 h-7 w-[46%] -rotate-6 rounded-full opacity-70" style={{ background: palette.secondary }} aria-hidden />
      ) : null}
      {template.layout === "life" ? (
        <div className="absolute inset-x-0 bottom-0 h-[44%]" style={{ background: "linear-gradient(180deg, transparent, rgba(11,75,65,0.82))" }} aria-hidden />
      ) : null}

      <div className="relative z-10 flex items-center gap-2">
        <span className="flex shrink-0 items-center justify-center rounded-full bg-white/90" style={{ width: logoSize + 8, height: logoSize + 8 }}>
          <img src={logoIconUrl} alt="" className="object-contain" style={{ width: logoSize, height: logoSize }} />
        </span>
        <span className={`${compact ? "text-[10px]" : "text-sm"} font-black`}>大马通</span>
      </div>

      {template.layout === "shopping" ? (
        <>
          <div className={`relative z-10 ${compact ? "mt-3" : "mt-8"}`}>
            <p className={`${compact ? "text-[9px]" : "text-xs"} font-black`} style={{ color: palette.primary }}>精选好物采购</p>
            <p className={`${compact ? "mt-1 text-[15px] leading-tight" : "mt-2 text-[2rem] leading-tight sm:text-[2.35rem]"} font-black`}>{template.title}</p>
            <p className={`${compact ? "mt-1 line-clamp-2 text-[8px] leading-3" : "mt-3 text-sm leading-6"} max-w-[82%]`} style={{ color: palette.muted }}>{template.subtitle}</p>
          </div>
          <div className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-2xl bg-white text-center ${compact ? "bottom-2 p-2" : "bottom-5 p-4"}`}>
            <QRCodeCanvas value={inviteLink} size={qrSize} level="H" marginSize={1} fgColor="#12231f" bgColor="#ffffff" />
            <p className={`${compact ? "mt-1 text-[7px]" : "mt-2 text-xs"} font-black`} style={{ color: palette.primary }}>邀请码：{inviteCode}</p>
          </div>
        </>
      ) : null}

      {template.layout === "reward" ? (
        <>
          <div className={`relative z-10 ${compact ? "mt-3" : "mt-8"}`}>
            <span className={`${compact ? "px-2 py-1 text-[8px]" : "px-3 py-1.5 text-xs"} rounded-full font-black text-white`} style={{ background: palette.primary }}>
              会员返利福利
            </span>
            <p className={`${compact ? "mt-3 text-[15px] leading-tight" : "mt-5 text-[2rem] leading-tight sm:text-[2.35rem]"} font-black`}>{template.title}</p>
            <p className={`${compact ? "mt-1 line-clamp-2 text-[8px] leading-3" : "mt-3 text-sm leading-6"} max-w-[92%]`} style={{ color: palette.muted }}>{template.subtitle}</p>
          </div>
          <div className={`absolute inset-x-3 z-10 grid grid-cols-[auto_minmax(0,1fr)] items-center rounded-2xl bg-white/90 ${compact ? "bottom-3 gap-2 p-2" : "bottom-6 gap-4 p-4"}`}>
            <QRCodeCanvas value={inviteLink} size={qrSize} level="H" marginSize={1} fgColor="#2d1a12" bgColor="#ffffff" />
            <div className="min-w-0">
              <p className={`${compact ? "text-[8px]" : "text-xs"} font-black`} style={{ color: palette.primary }}>邀请码：{inviteCode}</p>
              <p className={`${compact ? "mt-1 text-[7px] leading-3" : "mt-2 text-xs leading-5"}`} style={{ color: palette.muted }}>扫码注册，自动绑定邀请关系</p>
            </div>
          </div>
        </>
      ) : null}

      {template.layout === "life" ? (
        <>
          <div className={`relative z-10 ${compact ? "mt-3" : "mt-8"}`}>
            <p className={`${compact ? "text-[9px]" : "text-xs"} font-black`} style={{ color: palette.primary }}>马来西亚生活服务</p>
            <p className={`${compact ? "mt-2 text-[14px] leading-tight" : "mt-4 text-[1.85rem] leading-tight sm:text-[2.2rem]"} font-black`}>{template.title}</p>
            <p className={`${compact ? "mt-1 text-[8px] leading-3" : "mt-3 text-sm leading-6"} max-w-[78%]`} style={{ color: palette.muted }}>{template.subtitle}</p>
          </div>
          <div className={`absolute z-10 rounded-2xl bg-white/92 ${compact ? "bottom-2 right-2 p-2" : "bottom-5 right-5 p-4"}`}>
            <QRCodeCanvas value={inviteLink} size={qrSize} level="H" marginSize={1} fgColor="#143d34" bgColor="#ffffff" />
            <p className={`${compact ? "mt-1 text-[7px]" : "mt-2 text-xs"} text-center font-black`} style={{ color: palette.primary }}>{inviteCode}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PosterPoint({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[var(--theme-surface)] px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function Stat({ icon, title, value, caption }: { icon: ReactNode; title: string; value: string; caption: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_84%,transparent)] p-2.5 text-center shadow-[0_12px_28px_-28px_color-mix(in_srgb,var(--theme-text)_38%,transparent)]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-[var(--theme-price)]">
        {icon}
      </span>
      <p className="mt-1.5 max-w-full truncate text-[10px] font-semibold text-[var(--theme-text-muted-on-surface)]">{title}</p>
      <p className="mt-1 max-w-full truncate text-center text-sm font-black tabular-nums text-[var(--theme-text-on-surface)]">{value}</p>
      <p className="mt-0.5 max-w-full truncate text-center text-[10px] text-[var(--theme-text-muted-on-surface)]">{caption}</p>
    </div>
  );
}
