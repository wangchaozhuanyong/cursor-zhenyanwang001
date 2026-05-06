import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

export function useTheme() {
  return useThemeRuntime();
}
