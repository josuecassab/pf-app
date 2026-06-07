import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTableWithSelectionToolbar from "../../../components/TxnTableWithSelectionToolbar";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useBanks } from "../../../hooks/useBanks";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useSubcategories";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function routeParamOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

export default function ReconcileMatchedTxns() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const params = useLocalSearchParams();
  const statementLabel = routeParamOne(params.statementLabel);
  const joinedTableName = `${statementLabel}_joined`;
  const { data: categoriesData } = useCategories();
  const { data: subcategoriesData } = useSubcategories();
  const { data: banksData } = useBanks();

  const categoriesById = useMemo(() => {
    const map = new Map();
    for (const c of categoriesData ?? []) {
      map.set(c.value, c.label);
    }
    return map;
  }, [categoriesData]);

  const subcategoriesById = useMemo(() => {
    const map = new Map();
    for (const c of subcategoriesData ?? []) {
      map.set(c.value, c.label);
    }
    return map;
  }, [subcategoriesData]);

  const banksById = useMemo(() => {
    const map = new Map();
    for (const c of banksData ?? []) {
      map.set(c.value, c.label);
    }
    return map;
  }, [banksData]);

  const {
    data: matchedTxns,
    error: matchedTxnsError,
    fetchNextPage: fetchNextMatchedTxnsPage,
    hasNextPage: hasNextMatchedTxnsPage,
    isFetchingNextPage: isFetchingNextMatchedTxnsPage,
    isPending: isMatchedTxnsPending,
    refetch: refetchMatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["matched_txns", joinedTableName],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `${API_URL}/reconcile_matched_txns/?table_name=${pageParam.table_name}&page=${pageParam.page}&limit=${pageParam.limit}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      return res.json();
    },
    enabled: !!statementLabel && !!tenantId,
    initialPageParam: {
      table_name: joinedTableName,
      page: 0,
      limit: 100,
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
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
  });

  const flattenedMatchedTxns = useMemo(
    () => matchedTxns?.pages?.flatMap((page) => page) ?? [],
    [matchedTxns],
  );

  if (!statementLabel) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          Falta el nombre del estado de cuenta.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        reconcileStyles.container,
        { flex: 1, backgroundColor: theme.colors.background },
      ]}
      edges={["bottom"]}
    >
      {/* <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      > */}
      <Text
        style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
      >
        Transacciones conciliadas ({flattenedMatchedTxns.length}
        {hasNextMatchedTxnsPage ? "+" : ""})
      </Text>
      <TxnTableWithSelectionToolbar
        queryKey={["matched_txns", joinedTableName]}
        tableName={joinedTableName}
        txns={flattenedMatchedTxns}
        error={matchedTxnsError}
        fetchNextPage={fetchNextMatchedTxnsPage}
        hasNextPage={hasNextMatchedTxnsPage}
        isFetchingNextPage={isFetchingNextMatchedTxnsPage}
        isPending={isMatchedTxnsPending}
        refetch={refetchMatchedTxns}
        categoriesById={categoriesById}
        subcategoriesById={subcategoriesById}
        banksById={banksById}
      />
      {/* </ScrollView> */}
    </SafeAreaView>
  );
}
