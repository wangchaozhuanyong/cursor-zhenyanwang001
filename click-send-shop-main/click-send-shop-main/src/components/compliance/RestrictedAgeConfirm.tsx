import { writeAgeGateConfirmation } from "@/utils/ageGate";

type Props = {
  requiredAge: number;
  onConfirmed?: () => void;
};

/** 商品最低年龄高于会话已确认年龄时，在详情页补充确认 */
export default function RestrictedAgeConfirm({ requiredAge, onConfirmed }: Props) {
  return (
    <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-900">
      <p>该商品需年满 {requiredAge} 岁方可购买或咨询。</p>
      <button
        type="button"
        className="mt-2 rounded-md bg-amber-800/90 px-3 py-1.5 text-[11px] font-semibold text-white"
        onClick={() => {
          writeAgeGateConfirmation(requiredAge);
          onConfirmed?.();
        }}
      >
        确认我已满 {requiredAge} 岁
      </button>
    </div>
  );
}
