import { useEffect, useState } from "react";
import { isAdminMfaStepUpPending, subscribeAdminMfaStepUpState } from "@/lib/adminMfaStepUp";

/** 订阅 MFA step-up 等待状态，弹窗打开/关闭时触发重渲染 */
export function useAdminMfaStepUpPending(): boolean {
  const [pending, setPending] = useState(isAdminMfaStepUpPending);

  useEffect(() => {
    return subscribeAdminMfaStepUpState(() => {
      setPending(isAdminMfaStepUpPending());
    });
  }, []);

  return pending;
}
