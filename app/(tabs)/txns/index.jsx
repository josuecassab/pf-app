import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTableWithSelectionToolbar from "../../../components/TxnTableWithSelectionToolbar";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TABLE = "txns";

export default function Txns() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();

  const queryKey = useMemo(() => ["txns", tenantId], [tenantId]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetch(
        `${API_URL}/latests_txns/?page=${pageParam.page}&limit=${pageParam.limit}`,
        { headers: getAuthHeaders() },
      ).then((res) => res.json()),
    enabled: !!tenantId,
    initialPageParam: { page: 0, limit: 100 },
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
  });

  const txns = useMemo(() => {
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={{ flex: 1 }}>
        <TxnTableWithSelectionToolbar
          tableStyle={styles.tableContainer}
          queryKey={queryKey}
          tableName={TABLE}
          txns={txns}
          error={error}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isPending={isPending}
          refetch={refetch}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    gap: 8,
  },
  tableContainer: {
    flex: 1,
    minHeight: 0,
  },
});
