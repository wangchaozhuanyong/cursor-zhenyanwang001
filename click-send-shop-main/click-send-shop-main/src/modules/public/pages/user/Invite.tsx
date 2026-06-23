import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, Download, Gift, QrCode, Share2, Users } from "lucide-react";
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
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import SharePassCard from "@/modules/storefront-v2/design/components/SharePassCard";
import logoIconUrl from "@/assets/logo-icon.png";

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
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { inviteCode, parentInviteCode, loadProfile } = useUserStore();
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "loading" | "copied">("idle");
  const copyResetTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  const inviteLink = `${window.location.origin}/login?ref=${encodeURIComponent(inviteCode || "")}`;
  const inviteCodeLabel = inviteCode || "加载中";
  const qrRef = useRef<HTMLCanvasElement>(null);
  const selectedTemplate = useMemo(() => getPosterTemplate("shopping"), []);
  const inviteSerial = inviteCode ? `NO. ${inviteCode.slice(-4).toUpperCase().padStart(4, "0")}` : undefined;

  const copyInviteCode = async () => {
    if (!inviteCode) {
      toast.error("邀请码加载中，请稍后");
      return;
    }
    setCopyState("loading");
    const copied = await copyToClipboard(inviteCode);
    if (copied) {
      setCopyState("copied");
      toast.success("邀请码已复制", toastPresetQuickSuccess);
      if (copyResetTimerRef.current) window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1600);
    } else {
      setCopyState("idle");
      toast.error("复制失败，请手动复制");
    }
  };

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

  const showQrCode = () => {
    document.querySelector(".sf-next-share-pass__qr")?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast.success("二维码已在上方展示", toastPresetQuickSuccess);
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
    <StoreAccountLayout
      title="邀请好友"
      onBack={goBack}
      className="sf-next-page sf-next-invite-page-shell"
      mainClassName="sf-next-account-main"
      rightSlot={(
        <button type="button" className="sf-next-header-icon" aria-label="分享邀请" onClick={handleShare}>
          <Share2 size={18} aria-hidden="true" />
        </button>
      )}
    >
      <main className="sf-next-container sf-next-invite-page">
        <div className="pointer-events-none fixed -left-[9999px] -top-[9999px]" aria-hidden>
          <QRCodeCanvas ref={qrRef} value={inviteLink} size={520} level="H" marginSize={2} fgColor="#12231f" bgColor="#ffffff" />
        </div>

        <SharePassCard
          inviteCode={inviteCodeLabel}
          serial={inviteSerial}
          copyState={copyState}
          disabled={!inviteCode}
          onCopyInviteCode={copyInviteCode}
          qrCode={inviteCode ? (
            <QRCodeCanvas value={inviteLink} size={132} level="H" marginSize={1} fgColor="#20231f" bgColor="#ffffff" />
          ) : (
            <span className="sf-next-qr-waiting">等待邀请码</span>
          )}
        />

        <section className="sf-next-section">
          <h2 className="sf-next-block-title">分享方式</h2>
          <div className="sf-next-share-methods">
            <InviteShareTile icon={<Copy size={24} aria-hidden="true" />} label="复制链接" onClick={copyLink} disabled={!inviteCode} />
            <InviteShareTile icon={<QrCode size={24} aria-hidden="true" />} label="二维码" onClick={showQrCode} disabled={!inviteCode} />
            <InviteShareTile icon={<Download size={24} aria-hidden="true" />} label="生成海报" onClick={downloadPoster} disabled={!inviteCode} />
          </div>
        </section>

        {stats ? (
          <section className="sf-next-section">
            <h2 className="sf-next-block-title">邀请进度</h2>
            <div className="sf-next-invite-progress">
              <InviteProgressValue value={String(stats.totalInvited ?? stats.directCount ?? 0)} label="已邀请" />
              <InviteProgressValue value={String(records.filter((record) => record.status === "ordered").length)} label="已完成" />
              <InviteProgressValue value={`RM ${Number(stats.totalReward ?? 0).toFixed(0)}`} label="已获得" />
            </div>
          </section>
        ) : null}

        {parentInviteCode ? (
          <section className="sf-next-bound-invite">
            <div className="min-w-0">
              <p>绑定关系</p>
              <strong>上级邀请码：{parentInviteCode}</strong>
            </div>
            <Gift size={20} aria-hidden="true" />
          </section>
        ) : null}

        <section className="sf-next-section">
          <h2 className="sf-next-block-title">邀请记录</h2>
          {records.length === 0 ? (
            <InviteEmptyState />
          ) : (
            <div className="sf-next-invite-records">
              {records.map((record) => (
                <InviteRecordRow key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>
      </main>
    </StoreAccountLayout>
  );
}

function InviteShareTile({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="sf-next-share-method" disabled={disabled} onClick={onClick}>
      <span className="sf-next-share-method__icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function InviteProgressValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="sf-next-invite-progress__item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InviteRecordRow({ record }: { record: InviteRecord }) {
  const nickname = record.invitee_nickname || "好友";
  const statusText = record.status === "ordered" ? "已完成条件" : "已注册";
  return (
    <article className="sf-next-invite-record">
      <div className="sf-next-invite-record__avatar" aria-hidden="true">{nickname.charAt(0)}</div>
      <div className="sf-next-invite-record__body">
        <h3>{nickname}</h3>
        <p>{formatDateTime(record.created_at)}</p>
        <span>{statusText}</span>
      </div>
      <strong>+ RM {Number(record.reward_amount ?? 0).toFixed(0)}</strong>
    </article>
  );
}

function InviteEmptyState() {
  return (
    <div className="sf-next-invite-empty">
      <Users size={20} aria-hidden="true" />
      <p>暂无邀请记录</p>
    </div>
  );
}
