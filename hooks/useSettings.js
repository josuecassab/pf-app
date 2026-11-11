import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";
import { authJsonHeaders } from "../lib/apiHeaders";
import { QUERY_CACHE_MAX_AGE } from "../lib/queryClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const SETTINGS_QUERY_KEY = (tenantId, keys) =>
  keys?.length ? ["settings", tenantId, ...keys] : ["settings", tenantId];

/** Tenant setting key for remaining free reconciliations. */
export const RECONCILIATION_COUNTER_KEY = "reconciliation_counter";

/** Tenant setting key for statement labels already counted against free reconciliations. */
export const RECONCILED_STATEMENTS_KEY = "reconciled_statements";

/** Free reconciliations granted when the counter is first created. */
export const FREE_RECONCILIATIONS = 2;

function buildSettingsUrl(keys) {
  const url = new URL(`${API_URL}/tenants/settings/`);
  if (Array.isArray(keys)) {
    for (const key of keys) {
      if (key != null && key !== "") {
        url.searchParams.append("keys", String(key));
      }
    }
  }
  return url.toString();
}

/**
 * Tenant settings. Cache key ["settings", tenantId] (or with keys when filtered).
 * GET /tenants/settings/ — optional ?keys=… (omit for all).
 * PUT /tenants/settings/ — { settings } upserts only those keys; values must be strings;
 * response is the upserted pairs.
 */
export function useSettings(keys) {
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const requestedKeys = Array.isArray(keys) && keys.length > 0 ? keys : null;

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY(tenantId, requestedKeys),
    queryFn: async () => {
      const response = await fetch(buildSettingsUrl(requestedKeys), {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          formatApiError(data) || `Request failed (${response.status})`,
        );
      }
      return data?.settings ?? {};
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 60,
    gcTime: QUERY_CACHE_MAX_AGE,
  });

  const updateSettings = useMutation({
    mutationFn: async (partialSettings) => {
      const payload =
        partialSettings && typeof partialSettings === "object"
          ? partialSettings
          : {};
      const response = await fetch(`${API_URL}/tenants/settings/`, {
        method: "PUT",
        headers: authJsonHeaders(getAuthHeaders),
        body: JSON.stringify({ settings: payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          formatApiError(data) || `Request failed (${response.status})`,
        );
      }
      // API returns only upserted key/value pairs.
      return data?.settings ?? payload;
    },
    onSuccess: (upserted) => {
      // Merge upserted pairs into every settings cache for this tenant.
      queryClient.setQueriesData({ queryKey: ["settings", tenantId] }, (current) => ({
        ...(current ?? {}),
        ...upserted,
      }));
    },
  });

  return { ...query, updateSettings };
}
