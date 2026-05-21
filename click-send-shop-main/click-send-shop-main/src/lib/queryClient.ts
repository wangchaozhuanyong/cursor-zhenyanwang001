import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 300_000,
      gcTime: 1_800_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

export function clearAdminQueryCache() {
  queryClient.removeQueries({ queryKey: ["admin"] });
}
