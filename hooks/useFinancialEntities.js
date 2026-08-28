import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";
import { QUERY_CACHE_MAX_AGE } from "../lib/queryClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Financial entities lookup. Cache key ["financialEntities", tenantId].
 * Fetches /banks/financial_entities/.
 */
export function useFinancialEntities() {
  const { tenantId, getAuthHeaders } = useAuth();
  return useQuery({
    queryKey: ["financialEntities", tenantId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/banks/financial_entities/`, {
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
    staleTime: 1000 * 60 * 60,
    gcTime: QUERY_CACHE_MAX_AGE,
  });
}
