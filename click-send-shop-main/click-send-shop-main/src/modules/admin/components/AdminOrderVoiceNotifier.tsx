import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Play, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isAdminMfaStepUpPending } from "@/lib/adminMfaStepUp";
import * as orderService from "@/services/admin/orderService";
import {
  getAdminOrderVoiceSettings,
  updateAdminOrderVoiceSettings,
} from "@/api/admin/orderVoice";
import { isAdminAuthenticated } from "@/services/admin/accountService";
import type { AdminOrderVoiceEvent } from "@/services/admin/orderService";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const LAST_CHECKED_KEY = "admin_order_voice_last_checked_at";
const PLAYED_IDS_KEY = "admin_order_voice_played_event_ids";
const VOLUME_KEY = "admin_order_voice_volume";
const VISIBLE_POLL_MS = 20_000;
const HIDDEN_POLL_MS = 120_000;
const MAX_FAILURE_BACKOFF_MS = 120_000;
const MAX_PLAYED_IDS = 100;
const MAX_LOCAL_SINCE_AGE_MS = 10 * 60 * 1000;

type QueueItem = {
  text: string;
  fallbackToast: string;
};

function readVolume() {
  if (typeof window === "undefined") return 1;
  const value = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

function audibleSpeechVolume(volume: number) {
  return Math.min(1, Math.max(0.55, volume));
}

function readLastCheckedAt() {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(LAST_CHECKED_KEY);
  if (!raw) return undefined;
  const time = new Date(raw).getTime();
  const now = Date.now();
  if (!Number.isFinite(time) || time > now + 30_000 || time < now - MAX_LOCAL_SINCE_AGE_MS) {
    window.localStorage.removeItem(LAST_CHECKED_KEY);
    return undefined;
  }
  return raw;
}

function readPlayedIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAYED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function savePlayedIds(ids: string[]) {
  window.localStorage.setItem(PLAYED_IDS_KEY, JSON.stringify(ids.slice(-MAX_PLAYED_IDS)));
}

function getSpeechSupport() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContextCtor();
  }
  return sharedAudioContext;
}

/** 在用户点击的同一事件循环内解锁 Web Audio（浏览器自动播放策略）。 */
async function ensureAudioUnlocked() {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  await new Promise((resolve) => window.setTimeout(resolve, 16));
}

function resumeSpeechSynthesis() {
  if (!getSpeechSupport()) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

function waitForVoices(timeoutMs = 2500) {
  if (!getSpeechSupport()) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    const onChange = () => {
      if (window.speechSynthesis.getVoices().length > 0) finish();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    window.setTimeout(finish, timeoutMs);
  });
}

function pickChineseVoice() {
  if (!getSpeechSupport()) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    return lang.includes("zh") || name.includes("chinese") || name.includes("mandarin") || voice.name.includes("中文");
  }) ?? null;
}

function buildSingleMessage(event: AdminOrderVoiceEvent) {
  const amount = event.amount ? `，金额 ${event.amount} 马币` : "";
  if (event.type === "payment_success") {
    return `订单已付款成功${amount}，请及时安排处理。`;
  }
  return `叮咚，您有新的订单${amount}，请及时处理。`;
}

function buildQueueItems(events: AdminOrderVoiceEvent[]): QueueItem[] {
  const created = events.filter((event) => event.type === "order_created");
  const paid = events.filter((event) => event.type === "payment_success");
  const items: QueueItem[] = [];

  if (created.length === 1) {
    const text = buildSingleMessage(created[0]);
    items.push({ text, fallbackToast: text });
  } else if (created.length > 1) {
    const text = `您有 ${created.length} 个新的订单，请及时处理。`;
    items.push({ text, fallbackToast: text });
  }

  if (paid.length === 1) {
    const text = buildSingleMessage(paid[0]);
    items.push({ text, fallbackToast: text });
  } else if (paid.length > 1) {
    const text = `您有 ${paid.length} 个订单已付款成功，请及时处理。`;
    items.push({ text, fallbackToast: text });
  }

  return items;
}

async function playBeep(volume: number) {
  const ctx = getSharedAudioContext();
  if (!ctx) throw new Error("AudioContext unsupported");
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  const baseVolume = Math.max(0.08, volume * 0.45);
  const tones = [
    { frequency: 880, start: 0, duration: 0.16 },
    { frequency: 1175, start: 0.2, duration: 0.18 },
    { frequency: 988, start: 0.44, duration: 0.22 },
  ];

  for (const tone of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = ctx.currentTime + tone.start;
    const endAt = startAt + tone.duration;
    oscillator.type = "triangle";
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.linearRampToValueAtTime(baseVolume, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, endAt);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }
  await new Promise((resolve) => window.setTimeout(resolve, 720));
}

const TEST_PLAY_SAMPLE = "叮咚，您有新的订单，请及时处理。";

type AdminOrderVoiceContextValue = {
  enabled: boolean;
  busy: boolean;
  statusLabel: string;
  testLabel: string;
  handleTestPlay: () => void;
  handleToggle: () => void;
};

const AdminOrderVoiceContext = createContext<AdminOrderVoiceContextValue | null>(null);

function useAdminOrderVoice() {
  const ctx = useContext(AdminOrderVoiceContext);
  if (!ctx) {
    throw new Error("useAdminOrderVoice must be used within AdminOrderVoiceProvider");
  }
  return ctx;
}

export function AdminOrderVoiceProvider({ children }: { children: ReactNode }) {
  const { tText } = useAdminT();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const volumeRef = useRef(readVolume());
  const enabledRef = useRef(false);
  const pollingRef = useRef(false);
  const pollFailureCountRef = useRef(0);
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);

  const applyEnabled = useCallback((next: boolean) => {
    enabledRef.current = next;
    setEnabled(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isAdminAuthenticated()) {
      applyEnabled(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const res = await getAdminOrderVoiceSettings();
        if (!cancelled) applyEnabled(Boolean(res.data?.enabled));
      } catch (error) {
        console.warn("[AdminOrderVoiceNotifier] load settings failed:", error);
        if (!cancelled) applyEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyEnabled]);

  useEffect(() => {
    if (!getSpeechSupport()) return;
    const loadVoices = () => undefined;
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const speakText = useCallback(async (
    text: string,
    options?: { interrupt?: boolean; allowCanceled?: boolean },
  ) => {
    if (!getSpeechSupport()) {
      throw new Error("speechSynthesis unsupported");
    }

    resumeSpeechSynthesis();
    if (options?.interrupt) {
      window.speechSynthesis.cancel();
      await new Promise((resolve) => window.setTimeout(resolve, 32));
    }
    await waitForVoices();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (ok: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        if (ok) resolve();
        else reject(new Error(reason || "speechSynthesis failed"));
      };

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-CN";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = audibleSpeechVolume(volumeRef.current);
        const voice = pickChineseVoice();
        if (voice) utterance.voice = voice;
        utterance.onend = () => finish(true);
        utterance.onerror = (event) => {
          const code = event.error || "";
          if (code === "interrupted") {
            finish(true);
            return;
          }
          if (code === "canceled" && options?.allowCanceled) {
            finish(true);
            return;
          }
          finish(false, code);
        };
        window.speechSynthesis.speak(utterance);
        window.setTimeout(() => {
          if (!settled && !window.speechSynthesis.speaking) {
            finish(false, "speechSynthesis timeout");
          }
        }, 8000);
      } catch (error) {
        finish(false, error instanceof Error ? error.message : "speechSynthesis failed");
      }
    });
  }, []);

  const playQueue = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      while (enabledRef.current && queueRef.current.length > 0) {
        const item = queueRef.current.shift();
        if (!item) continue;
        try {
          await playBeep(volumeRef.current);
          await speakText(item.text);
        } catch {
          try {
            await playBeep(volumeRef.current);
          } catch {
            toast.error(tText("浏览器阻止了声音播放，请检查系统音量或浏览器权限。"));
            break;
          }
          toast.info(item.fallbackToast);
        }
      }
    } finally {
      playingRef.current = false;
    }
  }, [speakText, tText]);

  const enqueueEvents = useCallback((events: AdminOrderVoiceEvent[]) => {
    if (events.length === 0) return;
    queueRef.current.push(...buildQueueItems(events));
    void playQueue();
  }, [playQueue]);

  const pollEvents = useCallback(async () => {
    if (!enabledRef.current || pollingRef.current || isAdminMfaStepUpPending() || !isAdminAuthenticated()) return;
    pollingRef.current = true;
    try {
      const since = readLastCheckedAt();
      const result = await orderService.fetchRecentOrderEvents(since);
      pollFailureCountRef.current = 0;
      const events = result.events || [];
      const checkedAt = result.checkedAt || new Date().toISOString();

      if (!since) {
        window.localStorage.setItem(LAST_CHECKED_KEY, checkedAt);
        return;
      }

      const playedIds = readPlayedIds();
      const playedSet = new Set(playedIds);
      const freshEvents = events.filter((event) => !playedSet.has(event.id));

      if (freshEvents.length > 0) {
        savePlayedIds([...playedIds, ...freshEvents.map((event) => event.id)]);
        enqueueEvents(freshEvents);
      }
      window.localStorage.setItem(LAST_CHECKED_KEY, checkedAt);
    } catch (error) {
      pollFailureCountRef.current = Math.min(pollFailureCountRef.current + 1, 4);
      console.warn("[AdminOrderVoiceNotifier] poll failed:", error);
    } finally {
      pollingRef.current = false;
    }
  }, [enqueueEvents]);

  useEffect(() => {
    if (!enabled || loading) return;
    let active = true;
    let timer: ReturnType<typeof window.setTimeout> | null = null;
    const schedule = () => {
      if (!active) return;
      const baseDelay = document.hidden ? HIDDEN_POLL_MS : VISIBLE_POLL_MS;
      const failureBackoff = pollFailureCountRef.current
        ? Math.min(MAX_FAILURE_BACKOFF_MS, VISIBLE_POLL_MS * (2 ** pollFailureCountRef.current))
        : 0;
      const delay = Math.max(baseDelay, failureBackoff);
      timer = window.setTimeout(async () => {
        await pollEvents();
        schedule();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) void pollEvents();
      if (timer) window.clearTimeout(timer);
      schedule();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule();
    void pollEvents();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, loading, pollEvents]);

  const verifyPlaybackForEnable = useCallback(async (): Promise<"speech" | "beep"> => {
    await ensureAudioUnlocked();
    if (getSpeechSupport()) {
      try {
        await speakText("订单语音提醒已开启。", { interrupt: true, allowCanceled: false });
        return "speech";
      } catch {
        await playBeep(volumeRef.current);
        return "beep";
      }
    }
    await playBeep(volumeRef.current);
    return "beep";
  }, [speakText]);

  const persistEnabled = useCallback(async (next: boolean) => {
    const res = await updateAdminOrderVoiceSettings(next);
    applyEnabled(Boolean(res.data?.enabled));
    if (!next) {
      if (getSpeechSupport()) {
        window.speechSynthesis.cancel();
      }
      queueRef.current = [];
      playingRef.current = false;
      window.localStorage.removeItem(LAST_CHECKED_KEY);
    }
  }, [applyEnabled]);

  const handleTestPlay = useCallback(async () => {
    if (loading || saving || testing) return;
    setTesting(true);
    try {
      await ensureAudioUnlocked();
      try {
        await speakText(TEST_PLAY_SAMPLE, { interrupt: true, allowCanceled: false });
        await playBeep(volumeRef.current);
        toast.success(tText("测试播放完成"));
      } catch {
        await playBeep(volumeRef.current);
        toast.success(tText("当前为提示音模式，测试播放完成"));
      }
    } catch {
      toast.error(tText("浏览器阻止了声音播放，请检查系统音量或浏览器权限。"));
    } finally {
      setTesting(false);
    }
  }, [loading, saving, speakText, testing, tText]);

  const handleToggle = useCallback(async () => {
    if (loading || saving || testing) return;

    if (enabled) {
      setSaving(true);
      try {
        await persistEnabled(false);
        toast.success(tText("订单语音提醒已关闭"));
      } catch {
        toast.error(tText("保存失败，请稍后重试"));
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const mode = await verifyPlaybackForEnable();
      await persistEnabled(true);
      toast.success(
        mode === "speech"
          ? "订单语音提醒已开启"
          : "订单语音提醒已开启（当前为提示音模式）",
      );
    } catch {
      toast.error(tText("浏览器阻止了声音播放，无法开启提醒。请再点一次「未开启」，或检查标签页是否静音。"));
    } finally {
      setSaving(false);
    }
  }, [enabled, loading, persistEnabled, saving, testing, tText, verifyPlaybackForEnable]);

  const busy = loading || saving || testing;
  const statusLabel = loading || saving ? "处理中" : enabled ? "已开启" : "未开启";
  const testLabel = testing ? "播放中" : "测试播放";

  const value = useMemo<AdminOrderVoiceContextValue>(
    () => ({
      enabled,
      busy,
      statusLabel,
      testLabel,
      handleTestPlay: () => void handleTestPlay(),
      handleToggle: () => void handleToggle(),
    }),
    [busy, enabled, handleTestPlay, handleToggle, statusLabel, testLabel],
  );

  return <AdminOrderVoiceContext.Provider value={value}>{children}</AdminOrderVoiceContext.Provider>;
}

/** 桌面端顶栏：测试播放 + 开启/关闭 */
export function AdminOrderVoiceToolbar() {
  const { tText } = useAdminT();
  const { busy, statusLabel, testLabel, handleTestPlay, handleToggle, enabled } = useAdminOrderVoice();

  return (
    <div className="admin-order-voice-toolbar hidden shrink-0 items-center gap-1 sm:flex">
      <UnifiedButton
        type="button"
        disabled={busy}
        onClick={handleTestPlay}
        title={tText("播放一条示例订单语音，用于检查浏览器与系统音量")}
        aria-label={tText("测试播放订单语音提醒")}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary px-2.5 text-[12px] font-medium leading-none text-muted-foreground hover:bg-muted disabled:opacity-60"
      >
        {testLabel}
      </UnifiedButton>
      <UnifiedButton
        type="button"
        disabled={busy}
        onClick={handleToggle}
        aria-pressed={enabled}
        title={enabled ? "订单语音提醒已开启，点击关闭" : "订单语音提醒未开启，点击开启"}
        aria-label={enabled ? "订单语音提醒已开启，点击关闭" : "订单语音提醒未开启，点击开启"}
        className={
          enabled
            ? "inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)] px-3 text-[12px] font-medium leading-none text-[var(--theme-primary-foreground)] hover:opacity-90 disabled:opacity-60"
            : "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-[12px] font-medium leading-none text-muted-foreground hover:bg-muted disabled:opacity-60"
        }
      >
        {statusLabel}
      </UnifiedButton>
    </div>
  );
}

/** 移动端：头像下拉菜单内的语音提醒项 */
export function AdminOrderVoiceMenuItems({ onClose }: { onClose?: () => void }) {
  const { busy, statusLabel, testLabel, handleTestPlay, handleToggle, enabled } = useAdminOrderVoice();

  const runAndClose = (action: () => void) => {
    action();
    onClose?.();
  };

  return (
    <div className="sm:hidden">
      <UnifiedButton
        type="button"
        disabled={busy}
        onClick={() => runAndClose(handleTestPlay)}
        className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary disabled:opacity-60"
      >
        <Play size={16} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">
          <Tx>测试播放</Tx>
        </span>
        <span className="text-xs text-muted-foreground">{testLabel}</span>
      </UnifiedButton>
      <UnifiedButton
        type="button"
        disabled={busy}
        onClick={() => runAndClose(handleToggle)}
        aria-pressed={enabled}
        className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary disabled:opacity-60"
      >
        <Volume2 size={16} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">
          <Tx>订单语音提醒</Tx>
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            enabled
              ? "bg-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-surface))] text-[var(--theme-primary)]"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {statusLabel}
        </span>
      </UnifiedButton>
    </div>
  );
}

