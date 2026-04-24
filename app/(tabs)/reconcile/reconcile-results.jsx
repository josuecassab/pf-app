import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../../../components/TxnTable";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useCategories } from "../../../hooks/useCategories";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TXNS_TABLE = "txns";

export default function ReconcileResults() {
  const { theme } = useTheme();
  const { schema } = useAuth();
  const queryClient = useQueryClient();
  const [isReconciling, setIsReconciling] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const statementLabel = route.params?.statementLabel;
  const bankLabel = route.params?.bankLabel;
  /** When set, compare API reported duplicate row groups — show navigation to detail screen. */
  const [duplicateRowsNav, setDuplicateRowsNav] = useState(null);

  const { data: categoriesData } = useCategories();

  const refreshDuplicateRowsInfo = useCallback(async () => {
    if (!statementLabel || !schema) {
      setDuplicateRowsNav(null);
      return;
    }
    const compareParams = new URLSearchParams({
      schema,
      table_name: `${statementLabel}_joined`,
    });
    const compareRes = await fetch(
      `${API_URL}/compare_statement_tables/?${compareParams.toString()}`,
      { method: "GET" },
    );
    const compareBody = await compareRes.json().catch(() => ({}));
    if (!compareRes.ok || !Array.isArray(compareBody?.duplicates)) {
      setDuplicateRowsNav(null);
      return;
    }
    if (compareBody.duplicates.length === 0) {
      setDuplicateRowsNav(null);
      return;
    }
    const tableName =
      compareBody.table_name ?? `${statementLabel}_joined`;
    const dupIds = compareBody.duplicates.map((d) => d.id);
    setDuplicateRowsNav({ table: tableName, ids: dupIds });
  }, [statementLabel, schema]);

  useEffect(() => {
    if (!statementLabel || !bankLabel) {
      navigation.goBack();
    }
  }, [statementLabel, bankLabel, navigation]);

  useFocusEffect(
    useCallback(() => {
      refreshDuplicateRowsInfo();
    }, [refreshDuplicateRowsInfo]),
  );

  const goToDuplicateRows = useCallback(() => {
    if (!duplicateRowsNav || !schema) return;
    router.push({
      pathname: "/reconcile/reconcile-duplicate-rows",
      params: {
        schema,
        table: duplicateRowsNav.table,
        ids: JSON.stringify(duplicateRowsNav.ids),
      },
    });
  }, [duplicateRowsNav, schema]);

  const {
    data: matchedTxns,
    error: matchedTxnsError,
    fetchNextPage: fetchNextMatchedTxnsPage,
    hasNextPage: hasNextMatchedTxnsPage,
    isFetchingNextPage: isFetchingNextMatchedTxnsPage,
    isPending: isMatchedTxnsPending,
    refetch: refetchMatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["matched_txns", `${statementLabel}_joined`],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `${API_URL}/reconcile_matched_txns/?table_name=${pageParam.table_name}&page=${pageParam.page}&limit=${pageParam.limit}&schema=${schema}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      return res.json();
    },
    enabled: !!statementLabel,
    initialPageParam: {
      table_name: `${statementLabel}_joined`,
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: unmatchedTxns,
    error: unmatchedTxnsError,
    fetchNextPage: fetchNextUnmatchedTxnsPage,
    hasNextPage: hasNextUnmatchedTxnsPage,
    isFetchingNextPage: isFetchingNextUnmatchedTxnsPage,
    isPending: isUnmatchedTxnsPending,
    refetch: refetchUnmatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["unmatched_txns", statementLabel],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `${API_URL}/reconcile_unmatched_txns/?table_name=${statementLabel}&page=${pageParam.page}&limit=${pageParam.limit}&schema=${schema}&bank_name=${bankLabel}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      return res.json();
    },
    enabled: !!statementLabel && !matchedTxnsError,
    initialPageParam: { page: 0, limit: 100 },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (
        !lastPage ||
        !Array.isArray(lastPage) ||
        lastPage.length < lastPageParam.limit
      ) {
        return undefined;
      }
      return { page: lastPageParam.page + 1, limit: lastPageParam.limit };
    },
  });

  const flattenedMatchedTxns = useMemo(
    () => matchedTxns?.pages?.flatMap((page) => page) ?? [],
    [matchedTxns],
  );

  const flattenedUnmatchedTxns = useMemo(
    () => unmatchedTxns?.pages?.flatMap((page) => page) ?? [],
    [unmatchedTxns],
  );

  const runReconcile = async () => {
    setIsReconciling(true);
    try {
      const dropRes = await fetch(
        `${API_URL}/drop_statement_table/?schema=${schema}&table=${statementLabel}_joined`,
        { method: "POST" },
      );
      const dropBody = await dropRes.json().catch(() => ({}));
      if (!dropRes.ok) {
        Alert.alert(
          "Error",
          dropBody?.detail ??
            dropBody?.message ??
            `Error al eliminar tabla (${dropRes.status})`,
        );
        return;
      }

      const joinRes = await fetch(
        `${API_URL}/create_statement_joined?table_name=${statementLabel}&schema=${schema}&bank_name=${bankLabel}`,
        { method: "POST" },
      );
      const joinBody = await joinRes.json().catch(() => ({}));
      if (!joinRes.ok) {
        Alert.alert(
          "Error",
          joinBody?.detail ?? joinBody?.message ?? "Error al conciliar",
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["matched_txns", `${statementLabel}_joined`],
      });
      await queryClient.invalidateQueries({
        queryKey: ["unmatched_txns", statementLabel],
      });
      refetchMatchedTxns();
      refetchUnmatchedTxns();
      await refreshDuplicateRowsInfo();
      Alert.alert("Éxito", "Conciliación actualizada.");
    } catch (error) {
      console.error("Error reconciling:", error);
      Alert.alert("Error", "Error al conciliar transacciones");
    } finally {
      setIsReconciling(false);
    }
  };

  const completeReconcile = async () => {
    try {
      const compareParams = new URLSearchParams({
        schema,
        table_name: `${statementLabel}_joined`,
      });
      const compareRes = await fetch(
        `${API_URL}/compare_statement_tables/?${compareParams.toString()}`,
        { method: "GET" },
      );
      const compareBody = await compareRes.json().catch(() => ({}));
      if (!compareRes.ok) {
        Alert.alert(
          "Error",
          compareBody?.detail ??
            compareBody?.message ??
            "Error al comparar tablas",
        );
        return;
      }
      if (!Array.isArray(compareBody?.duplicates)) {
        Alert.alert(
          "Error",
          "Respuesta inválida del servidor al comparar tablas.",
        );
        return;
      }
      if (compareBody.duplicates.length > 0) {
        const tableName =
          compareBody.table_name ?? `${statementLabel}_joined`;
        const dupIds = compareBody.duplicates.map((d) => d.id);
        router.push({
          pathname: "/reconcile/reconcile-duplicate-rows",
          params: {
            schema,
            table: tableName,
            ids: JSON.stringify(dupIds),
          },
        });
        return;
      }

      const res = await fetch(
        `${API_URL}/get_uncategorized_count/?table_name=${statementLabel}_joined&schema=${schema}`,
        {
          method: "GET",
        },
      );
      const response = await res.json();
      if (!res.ok) {
        Alert.alert("Error", response.message);
        return;
      }
      if (response.count > 0) {
        Alert.alert(
          "Alerta",
          "Hay transacciones no categorizadas: porfavor categorice las transacciones antes de completar la conciliación",
        );
        return;
      }

      const minMaxDatesRes = await fetch(
        `${API_URL}/min_and_max_dates/?table_name=${statementLabel}_joined&schema=${schema}`,
      );
      const minMaxDatesResponse = await minMaxDatesRes.json();
      if (!minMaxDatesRes.ok) {
        Alert.alert("Error", minMaxDatesResponse.message);
        return;
      }
      const deleteTxnsRes = await fetch(
        `${API_URL}/delete_txns/?table=${TXNS_TABLE}&bank_name=${bankLabel}&from_date=${minMaxDatesResponse.min_date}&to_date=${minMaxDatesResponse.max_date}&schema=${schema}`,
        {
          method: "DELETE",
        },
      );
      const deleteTxnsResponse = await deleteTxnsRes.json();
      if (!deleteTxnsRes.ok) {
        Alert.alert("Error", deleteTxnsResponse.message);
        return;
      }
      const insertTxnsRes = await fetch(
        `${API_URL}/insert_txns/?from_table=${statementLabel}_joined&to_table=${TXNS_TABLE}&schema=${schema}`,
        {
          method: "POST",
        },
      );
      const insertTxnsResponse = await insertTxnsRes.json();
      if (!insertTxnsRes.ok) {
        Alert.alert("Error", insertTxnsResponse.message);
        return;
      }
      Alert.alert("Éxito", "✅ Conciliación completada correctamente!");
      navigation.goBack();
    } catch (error) {
      console.error("Error completing reconcile:", error);
      Alert.alert("Error", "Error al completar la conciliación");
    }
  };

  if (!statementLabel || !bankLabel) {
    return null;
  }

  return (
    <SafeAreaView
      style={[
        reconcileStyles.container,
        { flex: 1, backgroundColor: theme.colors.background },
      ]}
      edges={["bottom"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Pressable
            disabled={isReconciling}
            style={({ pressed }) => [
              reconcileStyles.completeButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: isReconciling ? 0.7 : 1,
              },
              pressed &&
                !isReconciling &&
                reconcileStyles.completeButtonPressed,
            ]}
            onPress={runReconcile}
          >
            {isReconciling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={reconcileStyles.uploadButtonText}>Reconciliar</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              reconcileStyles.completeButton,
              { backgroundColor: theme.colors.primary },
              pressed && reconcileStyles.completeButtonPressed,
            ]}
            onPress={completeReconcile}
          >
            <Text style={reconcileStyles.uploadButtonText}>Completar</Text>
          </Pressable>
          {duplicateRowsNav != null && (
            <Pressable
              style={({ pressed }) => [
                reconcileStyles.completeButton,
                {
                  backgroundColor: theme.colors.error ?? theme.colors.primary,
                },
                pressed && reconcileStyles.completeButtonPressed,
              ]}
              onPress={goToDuplicateRows}
            >
              <Text style={reconcileStyles.uploadButtonText}>
                Ver filas duplicadas
              </Text>
            </Pressable>
          )}
        </View>

        <View style={reconcileStyles.unmatchedSection}>
          <Text
            style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
          >
            Transacciones no concilidadas
          </Text>
          <TxnTable
            table={statementLabel}
            txns={flattenedUnmatchedTxns}
            error={unmatchedTxnsError}
            fetchNextPage={fetchNextUnmatchedTxnsPage}
            hasNextPage={hasNextUnmatchedTxnsPage}
            isFetchingNextPage={isFetchingNextUnmatchedTxnsPage}
            isPending={isUnmatchedTxnsPending}
            queryKey={["unmatched_txns", statementLabel]}
            refetch={refetchUnmatchedTxns}
          />
        </View>

        <View>
          <Text
            style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
          >
            Transacciones concilidadas
          </Text>
          <TxnTable
            categories={categoriesData}
            table={`${statementLabel}_joined`}
            txns={flattenedMatchedTxns}
            error={matchedTxnsError}
            fetchNextPage={fetchNextMatchedTxnsPage}
            hasNextPage={hasNextMatchedTxnsPage}
            isFetchingNextPage={isFetchingNextMatchedTxnsPage}
            isPending={isMatchedTxnsPending}
            queryKey={["matched_txns", `${statementLabel}_joined`]}
            refetch={refetchMatchedTxns}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
