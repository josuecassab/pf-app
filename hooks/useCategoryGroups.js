import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { authJsonHeaders } from "../lib/apiHeaders";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const categoryGroupsQueryKey = (tenantId) => [
  "categoryGroups",
  tenantId,
];

async function parseErrorBody(res) {
  const text = await res.text();
  if (!text) return res.statusText;
  try {
    const data = JSON.parse(text);
    return (
      data.message || data.detail || JSON.stringify(data) || res.statusText
    );
  } catch {
    return text || res.statusText;
  }
}

/**
 * Fetches persisted category groups for the tenant and exposes create/update/delete mutations.
 */
export function useCategoryGroups() {
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: categoryGroupsQueryKey(tenantId),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/groups/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(await parseErrorBody(res));
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, category_ids }) => {
      const res = await fetch(`${API_URL}/groups/`, {
        method: "POST",
        headers: authJsonHeaders(getAuthHeaders),
        body: JSON.stringify({ name, category_ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || data.detail || JSON.stringify(data) || res.statusText,
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: categoryGroupsQueryKey(tenantId),
      });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name, category_ids }) => {
      const res = await fetch(`${API_URL}/groups/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: authJsonHeaders(getAuthHeaders),
        body: JSON.stringify({ name, category_ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || data.detail || JSON.stringify(data) || res.statusText,
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: categoryGroupsQueryKey(tenantId),
      });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId) => {
      const res = await fetch(
        `${API_URL}/groups/${encodeURIComponent(groupId)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (!res.ok) {
        throw new Error(await parseErrorBody(res));
      }
      const text = await res.text();
      if (!text.trim()) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: categoryGroupsQueryKey(tenantId),
      });
    },
  });

  return { ...query, createGroup, updateGroup, deleteGroup };
}
