import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";
import { QUERY_CACHE_MAX_AGE } from "../lib/queryClient";
import { useFinancialEntities } from "./useFinancialEntities";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Banks list for input, filters, etc. Cache key ["banks", tenantId].
 * Fetches /banks/ and joins legal names from useFinancialEntities.
 * `data` stays the banks array with `name` set from the entity lookup.
 */
export function useBanks() {
  const { tenantId, getAuthHeaders } = useAuth();
  const { data: financialEntities } = useFinancialEntities();
  const query = useQuery({
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
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId,
    select: (data) => {
      // Persisted cache may still be { banks, financialEntities } from before the split.
      return Array.isArray(data) ? data : (data?.banks ?? []);
    },
    staleTime: 0,
    gcTime: QUERY_CACHE_MAX_AGE,
  });

  const data = useMemo(() => {
    const banks = Array.isArray(query.data) ? query.data : [];
    const entities = Array.isArray(financialEntities) ? financialEntities : [];
    const financialEntitiesMap = new Map();
    for (const entity of entities) {
      financialEntitiesMap.set(entity.code, entity.legal_name);
    }
    return banks.map((bank) => ({
      ...bank,
      name: financialEntitiesMap.get(bank.fe_code),
    }));
  }, [query.data, financialEntities]);

  return { ...query, data };
}
