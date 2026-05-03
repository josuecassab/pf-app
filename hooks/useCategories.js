import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Global categories query. Uses cache key ["categories", tenantId] so data
 * is shared across reconcile, txns, input, and any other screen.
 * Prefetch in _layout so the cache is warm when the app loads.
 */
export function useCategories() {
  const { tenantId, getAuthHeaders } = useAuth();
  return useQuery({
    queryKey: ["categories", tenantId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/categories/`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
    enabled: !!tenantId,
    select: (data) => data.sort((a, b) => a.label.localeCompare(b.label)),
    staleTime: 1000 * 60 * 5, // 5 minutes - treat as global, avoid refetch on tab switch
  });
}
