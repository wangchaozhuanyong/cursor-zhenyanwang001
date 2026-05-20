import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import * as orderService from "@/services/admin/orderService";
import type { AdminOrderVoiceEvent } from "@/api/admin/order";

const ENABLED_KEY = "admin_order_voice_enabled";
const LAST_CHECKED_KEY = "admin_order_voice_last_checked_at";
const PLAYED_IDS_KEY = "admin_order_voice_played_event_ids";
const VOLUME_KEY = "admin_order_voice_volume";
const VISIBLE_POLL_MS = 10_000;
const HIDDEN_POLL_MS = 30_000;
const MAX_PLAYED_IDS = 100;

type QueueItem = {
  text: string;
  fallbackToast: string;
};

function readBoolean(key: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "true";
}

function readVolume() {
  if (typeof window === "undefined") return 1;
  const value = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
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
  const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const ctx = new AudioContextCtor();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = Math.max(0.02, volume * 0.18);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.18);
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  await ctx.close().catch(() => undefined);
}

export default function AdminOrderVoiceNotifier() {
  const [enabled, setEnabled] = useState(() => readBoolean(ENABLED_KEY));
  const [volume, setVolume] = useState(readVolume);
  const [unsupported, setUnsupported] = useState(() => !getSpeechSupport());
  const [voicesReady, setVoicesReady] = useState(false);
  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);
  const pollingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);

  const supportText = useMemo(
    () => unsupported ? "当前浏览器不支持中文语音播报，将使用提示音提醒" : "",
    [unsupported],
  );

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    if (!getSpeechSupport()) {
      setUnsupported(true);
      return;
    }
    const loadVoices = () => setVoicesReady(true);
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const speakText = useCallback((text: string, options?: { interrupt?: boolean }) => {
    if (!getSpeechSupport()) {
      setUnsupported(true);
      return Promise.reject(new Error("speechSynthesis unsupported"));
    }

    return new Promise<void>((resolve, reject) => {
      try {
        if (options?.interrupt) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-CN";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = volumeRef.current;
        const voice = pickChineseVoice();
        if (voice) utterance.voice = voice;
        utterance.onend = () => resolve();
        utterance.onerror = () => reject(new Error("speechSynthesis failed"));
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
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
          await speakText(item.text);
        } catch {
          try {
            await playBeep(volumeRef.current);
          } catch {
            setEnabled(false);
            window.localStorage.setItem(ENABLED_KEY, "false");
            toast.error("浏览器阻止了声音播放，请点击“开启提醒”。");
            break;
          }
          toast.info(item.fallbackToast);
        }
      }
    } finally {
      playingRef.current = false;
    }
  }, [speakText]);

  const enqueueEvents = useCallback((events: AdminOrderVoiceEvent[]) => {
    if (events.length === 0) return;
    queueRef.current.push(...buildQueueItems(events));
    void playQueue();
  }, [playQueue]);

  const pollEvents = useCallback(async () => {
    if (!enabledRef.current || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const since = window.localStorage.getItem(LAST_CHECKED_KEY) || new Date().toISOString();
      const checkedAt = new Date().toISOString();
      const events = await orderService.fetchRecentOrderEvents(since);
      const playedIds = readPlayedIds();
      const playedSet = new Set(playedIds);
      const freshEvents = events.filter((event) => !playedSet.has(event.id));

      if (freshEvents.length > 0) {
        savePlayedIds([...playedIds, ...freshEvents.map((event) => event.id)]);
        enqueueEvents(freshEvents);
      }
      window.localStorage.setItem(LAST_CHECKED_KEY, checkedAt);
    } catch (error) {
      console.warn("[AdminOrderVoiceNotifier] poll failed:", error);
    } finally {
      pollingRef.current = false;
    }
  }, [enqueueEvents]);

  useEffect(() => {
    if (!enabled) return;
    const schedule = () => {
      const delay = document.hidden ? HIDDEN_POLL_MS : VISIBLE_POLL_MS;
      return window.setTimeout(async () => {
        await pollEvents();
        timer = schedule();
      }, delay);
    };

    let timer = schedule();
    const handleVisibilityChange = () => {
      if (!document.hidden) void pollEvents();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void pollEvents();

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pollEvents]);

  const handleEnable = async () => {
    try {
      if (getSpeechSupport()) {
        await speakText("订单语音提醒已开启。", { interrupt: true });
      } else {
        setUnsupported(true);
        await playBeep(volume);
        toast.info("当前浏览器不支持中文语音播报，将使用提示音提醒");
      }
      window.localStorage.setItem(ENABLED_KEY, "true");
      window.localStorage.setItem(LAST_CHECKED_KEY, new Date().toISOString());
      setEnabled(true);
    } catch {
      window.localStorage.setItem(ENABLED_KEY, "false");
      setEnabled(false);
      toast.error("浏览器阻止了声音播放，请点击“开启提醒”。");
    }
  };

  const handleDisable = () => {
    if (getSpeechSupport()) window.speechSynthesis.cancel();
    queueRef.current = [];
    window.localStorage.setItem(ENABLED_KEY, "false");
    setEnabled(false);
  };

  const handleTest = async () => {
    try {
      await speakText("叮咚，您有新的订单，请及时处理。", { interrupt: true });
    } catch {
      try {
        await playBeep(volume);
        toast.info("有新的订单，请及时处理。");
      } catch {
        window.localStorage.setItem(ENABLED_KEY, "false");
        setEnabled(false);
        toast.error("浏览器阻止了声音播放，请点击“开启提醒”。");
      }
    }
  };

  return (
    <div className="fixed bottom-20 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg lg:static lg:z-auto lg:shadow-sm">
      {enabled ? (
        <Volume2 size={16} className="text-[var(--theme-primary)]" />
      ) : (
        <VolumeX size={16} className="text-muted-foreground" />
      )}
      <div className="hidden min-w-0 sm:block">
        <p className="whitespace-nowrap font-medium text-foreground">
          {enabled ? "订单语音提醒已开启" : "订单语音提醒未开启"}
        </p>
        {supportText ? <p className="max-w-56 truncate text-[11px] text-muted-foreground">{supportText}</p> : null}
      </div>
      {enabled ? (
        <>
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            音量
            <input
              aria-label="订单语音提醒音量"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-16 accent-[var(--theme-primary)]"
            />
          </label>
          <button
            type="button"
            onClick={handleTest}
            className="rounded-lg bg-secondary px-2 py-1 font-medium text-foreground hover:opacity-90"
          >
            测试播报
          </button>
          <button
            type="button"
            onClick={handleDisable}
            className="rounded-lg px-2 py-1 font-medium text-muted-foreground hover:bg-secondary"
          >
            关闭提醒
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--theme-primary)] px-2 py-1 font-medium text-[var(--theme-primary-foreground)] hover:opacity-90"
        >
          <BellRing size={14} />
          开启提醒
        </button>
      )}
      <span className="sr-only">{voicesReady ? "语音列表已加载" : "语音列表加载中"}</span>
    </div>
  );
}
