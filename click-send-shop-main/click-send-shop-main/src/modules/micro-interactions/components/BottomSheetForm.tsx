import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppModal } from "./AppModal";
import { LoadingButton } from "./LoadingButton";
import { FormFieldShake } from "./FormFieldShake";
import type { BottomSheetHeight } from "./BottomSheet";

export type BottomSheetFormProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  submitText?: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: () => void | Promise<void>;
  height?: BottomSheetHeight;
};

export function BottomSheetForm({
  open,
  onClose,
  title,
  description,
  children,
  submitText = "保存",
  loading: loadingProp,
  error,
  onSubmit,
  height = "70vh",
}: BottomSheetFormProps) {
  const [busy, setBusy] = useState(false);
  const loading = loadingProp ?? busy;
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      await onSubmit();
      onClose();
    } catch {
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <LoadingButton
      type="button"
      state={loading ? "loading" : "normal"}
      className="min-h-12 w-full rounded-full !bg-[var(--theme-primary)] !text-[var(--theme-primary-foreground)] text-sm font-semibold"
      onClick={() => void handleSubmit()}
      loadingText={submitText}
    >
      {submitText}
    </LoadingButton>
  );

  return (
    <AppModal
      tier="form"
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      height={height}
      stickyFooter
    >
      <FormFieldShake shake={error ? shakeKey : 0} className="space-y-3 pb-2">
        <form onSubmit={(e) => void handleSubmit(e)}>
          {error ? (
            <p className="rounded-lg bg-[color-mix(in_srgb,var(--theme-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--theme-danger)]">
              {error}
            </p>
          ) : null}
          {children}
        </form>
      </FormFieldShake>
    </AppModal>
  );
}
