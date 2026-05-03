import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

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
      const data = await response.json();
      if (!response.ok) {
        const msg =
          data?.detail ?? data?.message ?? `Request failed (${response.status})`;
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      return data;
    },
    enabled: !!tenantId,
    select: (data) =>
      [...data].sort((a, b) =>
        String(a.label ?? "").localeCompare(String(b.label ?? "")),
      ),
    staleTime: 1000 * 60 * 5,
  });
}
