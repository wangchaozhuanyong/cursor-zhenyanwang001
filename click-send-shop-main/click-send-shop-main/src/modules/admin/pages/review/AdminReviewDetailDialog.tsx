import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { ReviewDetailPayload } from "@/services/admin/reviewService";

type Props = { detail: ReviewDetailPayload | null; loading: boolean; onClose: () => void; previewImage: (url: string) => void };

export default function AdminReviewDetailDialog({ detail, loading, onClose }: Props) {
  if (!detail && !loading) return null;
  const r = detail?.review;
  return (
    <MotionOverlay onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">评论详情</h3><button onClick={onClose}><X size={18} /></button></div>
        {loading ? <div className="text-sm">加载中...</div> : <div className="text-sm">{r?.content || "无内容"}</div>}
      </div>
    </MotionOverlay>
  );
}

function MotionOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>{children}</div>;
}
