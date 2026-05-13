import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Global subcategories query. Cache key ["subcategories", tenantId].
 * Each row: { id, name, category_id }.
 */
export function useSubcategories() {
  const { tenantId, getAuthHeaders } = useAuth();
  return useQuery({
    queryKey: ["subcategories", tenantId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/subcategories/`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          formatApiError(data) || `Request failed (${response.status})`,
        );
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId,
    select: (data) => data.sort((a, b) => a.label.localeCompare(b.label)),
    staleTime: 1000 * 60 * 60, // 1 hour - treat as global, avoid refetch on tab switch
  });
}
