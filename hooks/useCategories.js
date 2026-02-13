import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Global categories query. Uses a single cache key ["categories"] so data
 * is shared across reconcile, txns, input, and any other screen.
 * Prefetch in _layout so the cache is warm when the app loads.
 */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/categories`);
      return response.json();
    },
    select: (data) => data.sort((a, b) => a.label.localeCompare(b.label)),
    staleTime: 1000 * 60 * 5, // 5 minutes - treat as global, avoid refetch on tab switch
  });
}
