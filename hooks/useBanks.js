import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Banks list for input, filters, etc. Cache key ["banks", tenantId].
 */
export function useBanks() {
  const { tenantId, getAuthHeaders } = useAuth();
  return useQuery({
    queryKey: ["banks", tenantId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/banks/`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          formatApiError(data) || `Request failed (${response.status})`,
        );
      }
      return data;
    },
    enabled: !!tenantId,
    select: (data) =>
      [...data].sort((a, b) =>
        String(a.label ?? "").localeCompare(String(b.label ?? "")),
      ),
    staleTime: 1000 * 60 * 60, // 1 hour - treat as global, avoid refetch on tab switch
  });
}
