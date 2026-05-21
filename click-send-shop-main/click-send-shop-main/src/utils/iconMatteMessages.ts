import type { IconMatteMethod } from "@/utils/imageTransparency";

export function iconMatteProgressToast(method: IconMatteMethod, phase: "start" | "done"): string {
  if (phase === "start") {
    return method === "ai"
      ? "AI 抠图中（首次约需下载 40MB 模型）…"
      : "正在快速去除背景…";
  }
  return method === "ai" ? "AI 抠图完成，正在上传…" : "已快速去底，正在上传…";
}

export function iconMatteSuccessToast(method: IconMatteMethod): string {
  if (method === "ai") return "AI 抠图并上传成功";
  if (method === "edge") return "图标已去底并上传";
  return "图标已上传";
}
