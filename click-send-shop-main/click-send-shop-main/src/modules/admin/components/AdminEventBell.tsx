import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Eye, Shield, Siren, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnchoredMenu from "@/components/admin/AnchoredMenu";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminMfaStepUpPending } from "@/hooks/useAdminMfaStepUpPending";
import * as eventService from "@/services/admin/eventCenterService";
import type { AdminEventRecord } from "@/services/admin/eventCenterService";
import { formatAdminEventSubtitle, formatAdminEventTitle, labelAdminEventSeverity } from "@/utils/adminEventLabels";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const P0_SOUND_PLAYED_KEY = "admin_event_p0_sound_played_ids";
const MAX_SOUND_PLAYED_IDS = 300;
const SUMMARY_POLL_MS = 30_000;
const EVENT_LIST_POLL_MS = 30_000;
const P0_SOUND_POLL_MS = 15_000;

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "urgent", label: "紧急" },
  { key: "security", label: "安全" },
  { key: "recovered", label: "已恢复" },
] as const;

function severityClass(severity: string) {
  if (severity === "P0") return "bg-red-600 text-white";
  if (severity === "P1") return "bg-orange-500 text-white";
  if (severity === "P2") return "bg-amber-100 text-amber-800";
  return "bg-secondary text-muted-foreground";
}

function readSoundPlayedIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(P0_SOUND_PLAYED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveSoundPlayedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(P0_SOUND_PLAYED_KEY, JSON.stringify(ids.slice(-MAX_SOUND_PLAYED_IDS)));
}

async function playP0Beep() {
  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const ctx = new AudioContextCtor();
  const gain = ctx.createGain();
  gain.gain.value = 0.16;
  gain.connect(ctx.destination);

  for (const [index, frequency] of [880, 660, 880].entries()) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    const start = ctx.currentTime + index * 0.16;
    oscillator.start(start);
    oscillator.stop(start + 0.11);
  }

  await new Promise((resolve) => window.setTimeout(resolve, 620));
  await ctx.close().catch(() => undefined);
}

function shouldPlayP0Sound(event: AdminEventRecord, locallyPlayed: Set<string>) {
  return event.severity === "P0"
    && event.soundEnabled
    && !event.soundPlayedAt
    && !locallyPlayed.has(event.id)
    && ["open", "acknowledged", "in_progress"].includes(event.status);
}

export default function AdminEventBell() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("pending");
  const mfaStepUpPending = useAdminMfaStepUpPending();

  const summaryQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterSummary(),
    queryFn: () => eventService.fetchAdminEventSummary(),
    refetchInterval: mfaStepUpPending ? false : SUMMARY_POLL_MS,
    refetchIntervalInBackground: false,
  });
  const eventsQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterEvents({ tab, page: 1, pageSize: 8 }),
    queryFn: () => eventService.fetchAdminEvents({ tab, page: 1, pageSize: 8 }),
    enabled: open,
    refetchInterval: open && !mfaStepUpPending ? EVENT_LIST_POLL_MS : false,
    refetchIntervalInBackground: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
  };
  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "read" | "ack" | "progress" | "resolve" | "ignore" }) => {
      if (action === "read") return eventService.markAdminEventRead(id);
      if (action === "ack") return eventService.acknowledgeAdminEvent(id);
      if (action === "progress") return eventService.startAdminEventProgress(id);
      if (action === "resolve") return eventService.resolveAdminEvent(id);
      return eventService.ignoreAdminEvent(id);
    },
    onSuccess: refresh,
  });

  const summary = summaryQuery.data;
  const badge = Math.max(summary?.unreadCount || 0, summary?.p0Count || 0);
  const rows = eventsQuery.data?.list || [];
  const hasP0 = (summary?.p0Count || 0) > 0;
  const p0SoundQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterEvents({ tab: "urgent", severity: "P0", page: 1, pageSize: 10 }),
    queryFn: () => eventService.fetchAdminEvents({ tab: "urgent", severity: "P0", page: 1, pageSize: 10 }),
    enabled: hasP0,
    refetchInterval: hasP0 && !mfaStepUpPending ? P0_SOUND_POLL_MS : false,
    refetchIntervalInBackground: false,
  });

  const markSoundPlayed = useCallback(async (eventId: string) => {
    try {
      await eventService.markAdminEventSoundPlayed(eventId);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
    } catch {
      // Local persistence still prevents repeated browser alarms if the network hiccups.
    }
  }, [queryClient]);

  useEffect(() => {
    const events = p0SoundQuery.data?.list || [];
    if (!events.length) return;

    const playedIds = readSoundPlayedIds();
    const playedSet = new Set(playedIds);
    const next = events.find((event) => shouldPlayP0Sound(event, playedSet));
    if (!next) return;

    saveSoundPlayedIds([...playedIds, next.id]);
    void playP0Beep().finally(() => {
      void markSoundPlayed(next.id);
    });
  }, [markSoundPlayed, p0SoundQuery.data?.list]);

  const counts = useMemo(() => [
    { label: tText("未读"), value: summary?.unreadCount || 0 },
    { label: tText("未处理"), value: summary?.unresolvedCount || 0 },
    { label: "P0", value: summary?.p0Count || 0 },
    { label: tText("安全"), value: summary?.securityCount || 0 },
  ], [summary, tText]);

  return (
    <div className="relative shrink-0">
      <UnifiedButton
        ref={anchorRef}
        type="button"
        aria-label={tText("后台事件中心")}
        className={`touch-manipulation relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-secondary ${hasP0 ? "text-red-600" : "text-muted-foreground"}`}
        onClick={() => setOpen((v) => !v)}
      >
        {hasP0 ? <Siren size={18} /> : <Bell size={18} />}
        {badge > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </UnifiedButton>
      <AnchoredMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        width={360}
        gap={6}
        placement="bottom-end"
        className="p-3"
      >
        <div className="w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle size={17} className={hasP0 ? "text-red-600" : "text-muted-foreground"} />
              <p className="truncate text-sm font-semibold text-foreground"><Tx>后台事件监控</Tx></p>
            </div>
            <UnifiedButton
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setOpen(false);
                navigate("/admin/event-center");
              }}
            >
              事件中心
            </UnifiedButton>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {counts.map((item) => (
              <div key={item.label} className="rounded-lg border border-border px-2 py-1.5 text-center">
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <UnifiedButton
                key={item.key}
                type="button"
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs ${tab === item.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </UnifiedButton>
            ))}
          </div>
          <div className="mt-2 max-h-80 overflow-y-auto">
            {rows.length ? rows.map((item) => (
              <div key={item.id} className="border-b border-border py-2 last:border-b-0">
                <UnifiedButton
                  type="button"
                  className="flex w-full gap-2 rounded-lg p-1 text-left hover:bg-secondary"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/admin/event-center?eventId=${encodeURIComponent(item.id)}`);
                  }}
                >
                  {item.category === "security" ? <Shield size={15} className="mt-0.5 shrink-0 text-red-600" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${severityClass(item.severity)}`}>{tText(labelAdminEventSeverity(item.severity))}</span>
                      <span className="truncate text-xs font-medium text-foreground">{tText(formatAdminEventTitle(item.title, item.eventType, item.category))}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{tText(formatAdminEventSubtitle(item.message, item.eventType, item.category, item.title))}</span>
                  </span>
                </UnifiedButton>
                <div className="mt-1 flex flex-wrap gap-1 pl-7">
                  <UnifiedButton type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "read" })}><Eye size={12} className="mr-1 inline" /><Tx>已读</Tx></UnifiedButton>
                  <UnifiedButton type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ack" })}><Tx>确认</Tx></UnifiedButton>
                  <UnifiedButton type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "progress" })}><Tx>处理中</Tx></UnifiedButton>
                  <UnifiedButton type="button" className="rounded px-2 py-1 text-[11px] text-emerald-700 hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "resolve" })}><CheckCircle2 size={12} className="mr-1 inline" /><Tx>完成</Tx></UnifiedButton>
                  <UnifiedButton type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ignore" })}><XCircle size={12} className="mr-1 inline" /><Tx>忽略</Tx></UnifiedButton>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground"><Tx>暂无事件</Tx></div>
            )}
          </div>
        </div>
      </AnchoredMenu>
    </div>
  );
}
