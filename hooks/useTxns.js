import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";
import { QUERY_CACHE_MAX_AGE } from "../lib/queryClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useTxns() {

    const { tenantId, getAuthHeaders } = useAuth();

    return useInfiniteQuery({
        queryKey: ["txns", tenantId],
        queryFn: async ({ pageParam }) => {
        const res = await fetch(
            `${API_URL}/latests_txns/?page=${pageParam.page}&limit=${pageParam.limit}`,
            { headers: getAuthHeaders() },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(formatApiError(data) || `Error ${res.status}`);
        }
        return data;
        },
        enabled: !!tenantId,
        initialPageParam: { page: 0, limit: 400 },
        getNextPageParam: (lastPage, allPages, lastPageParam) => {
        if (
            !lastPage ||
            !Array.isArray(lastPage) ||
            lastPage.length < lastPageParam.limit
        ) {
            return undefined;
        }
        return {
            table_name: lastPageParam.table_name,
            page: lastPageParam.page + 1,
            limit: lastPageParam.limit,
        };
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 60, // 1 hour - treat as global, avoid refetch on tab switch
        gcTime: QUERY_CACHE_MAX_AGE,
    })
}