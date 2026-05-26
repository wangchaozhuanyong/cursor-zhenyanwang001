import { AppModal } from "@/modules/micro-interactions";
import { writeAgeGateConfirmation } from "@/utils/ageGate";

type Props = {
  open: boolean;
  requiredAge: number;
  onClose: () => void;
  onConfirmed: () => void;
};

/** 受监管商品：购买/咨询前年龄确认（light Dialog，接入全局 ModalLayer） */
export default function RestrictedAgeConfirmModal({ open, requiredAge, onClose, onConfirmed }: Props) {
  return (
    <AppModal
      tier="light"
      open={open}
      onClose={onClose}
      title={`年满 ${requiredAge} 岁确认`}
      height="auto"
      showHandle={false}
      stickyFooter
      footer={
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)]"
          onClick={() => {
            writeAgeGateConfirmation(requiredAge);
            onConfirmed();
          }}
        >
          确认我已满 {requiredAge} 岁
        </button>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--theme-text-muted)]">
        该商品需年满 {requiredAge} 岁方可购买或咨询。请确认您已达到法定年龄要求。
      </p>
    </AppModal>
  );
}
