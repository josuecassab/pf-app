import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const categoryGroupsQueryKey = (schema) => ["categoryGroups", schema];

/**
 * Fetches persisted category groups for the schema and exposes merge/delete mutations.
 */
export function useCategoryGroups() {
  const { schema } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: categoryGroupsQueryKey(schema),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/groups/?schema=${schema}`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!schema,
  });

  const mergeGroup = useMutation({
    mutationFn: async ({ grupo_categoria, categoria }) => {
      const res = await fetch(
        `${API_URL}/groups/merge_group/?schema=${schema}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grupo_categoria, categoria }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || data.detail || JSON.stringify(data) || res.statusText,
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryGroupsQueryKey(schema) });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (grupo_categoria) => {
      const res = await fetch(
        `${API_URL}/groups/delete_group/?schema=${schema}&grupo_categoria=${encodeURIComponent(grupo_categoria)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || data.detail || JSON.stringify(data) || res.statusText,
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryGroupsQueryKey(schema) });
    },
  });

  return { ...query, mergeGroup, deleteGroup };
}
