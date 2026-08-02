import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getClientDesignStyleBySkinId, type ClientDesignStyle } from "@/utils/clientDesignStyle";

export function useClientDesignStyle(): ClientDesignStyle {
  const { skinId } = useThemeRuntime();
  return getClientDesignStyleBySkinId(skinId);
}
