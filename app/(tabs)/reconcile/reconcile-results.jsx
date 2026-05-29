import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function formatCount(count, hasMore) {
  if (count == null) return "…";
  return `${count}${hasMore ? "+" : ""}`;
}

function BlockerBanner({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  theme,
  tone = "error",
}) {
  const isError = tone === "error";
  const accent = isError ? theme.colors.error : "#d97706";
  const backgroundColor = isError
    ? theme.isDark
      ? "rgba(239, 68, 68, 0.12)"
      : "rgba(239, 68, 68, 0.08)"
    : theme.isDark
      ? "rgba(217, 119, 6, 0.12)"
      : "rgba(217, 119, 6, 0.08)";

  return (
    <View
      style={[
        reconcileStyles.blockerBanner,
        { borderColor: accent, backgroundColor },
      ]}
    >
      <View style={reconcileStyles.blockerBannerRow}>
        <Ionicons name={icon} size={20} color={accent} />
        <View style={reconcileStyles.blockerBannerContent}>
          <Text style={[reconcileStyles.blockerBannerTitle, { color: accent }]}>
            {title}
          </Text>
          <Text
            style={[
              reconcileStyles.blockerBannerMessage,
              { color: theme.colors.text },
            ]}
          >
            {message}
          </Text>
          {actionLabel && onAction ? (
            <Pressable
              onPress={onAction}
              style={({ pressed }) => [
                reconcileStyles.blockerBannerAction,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  reconcileStyles.blockerBannerActionText,
                  { color: accent },
                ]}
              >
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SummaryStatChip({ label, tone, onPress, theme }) {
  const toneStyles = {
    success: {
      border: theme.colors.success,
      background: theme.isDark
        ? "rgba(16, 185, 129, 0.12)"
        : "rgba(16, 185, 129, 0.08)",
      text: theme.colors.success,
    },
    warning: {
      border: "#d97706",
      background: theme.isDark
        ? "rgba(217, 119, 6, 0.12)"
        : "rgba(217, 119, 6, 0.08)",
      text: "#d97706",
    },
    error: {
      border: theme.colors.error,
      background: theme.isDark
        ? "rgba(239, 68, 68, 0.12)"
        : "rgba(239, 68, 68, 0.08)",
      text: theme.colors.error,
    },
    neutral: {
      border: theme.colors.border,
      background: theme.colors.inputBackground,
      text: theme.colors.text,
    },
  };
  const colors = toneStyles[tone] ?? toneStyles.neutral;

  const chip = (
    <View
      style={[
        reconcileStyles.summaryStatChip,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text
        style={[reconcileStyles.summaryStatChipText, { color: colors.text }]}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return chip;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      {chip}
    </Pressable>
  );
}

export default function ReconcileResults() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const [isReconciling, setIsReconciling] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const statementLabel = route.params?.statementLabel;
  const bankLabel = route.params?.bankLabel;
  const joinedTableName = `${statementLabel}_joined`;

  const {
    data: duplicateRowsNav,
    refetch: refetchDuplicateRowsInfo,
    isPending: isDuplicatesPending,
  } = useQuery({
    queryKey: ["reconcile_compare", tenantId, joinedTableName],
    queryFn: async () => {
      const compareParams = new URLSearchParams({
        table_name: joinedTableName,
      });
      const compareRes = await fetch(
        `${API_URL}/compare_statement_tables/?${compareParams.toString()}`,
        { method: "GET", headers: getAuthHeaders() },
      );
      const compareBody = await compareRes.json().catch(() => ({}));
      if (!compareRes.ok || !Array.isArray(compareBody?.duplicates)) {
        return null;
      }
      if (compareBody.duplicates.length === 0) {
        return null;
      }
      return {
        table: compareBody.table_name ?? joinedTableName,
        ids: compareBody.duplicates.map((d) => d.id),
      };
    },
    enabled: !!statementLabel && !!tenantId,
  });

  const {
    data: uncategorizedCount,
    isPending: isUncategorizedPending,
    refetch: refetchUncategorizedCount,
  } = useQuery({
    queryKey: ["reconcile_uncategorized", tenantId, joinedTableName],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/get_uncategorized_count/?table_name=${encodeURIComponent(joinedTableName)}`,
        { method: "GET", headers: getAuthHeaders() },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      return body.count ?? 0;
    },
    enabled: !!statementLabel && !!tenantId,
  });

  useEffect(() => {
    if (!statementLabel || !bankLabel) {
      navigation.goBack();
    }
  }, [statementLabel, bankLabel, navigation]);

  useFocusEffect(
    useCallback(() => {
      refetchDuplicateRowsInfo();
      refetchUncategorizedCount();
    }, [refetchDuplicateRowsInfo, refetchUncategorizedCount]),
  );

  const goToDuplicateRows = useCallback(() => {
    if (!duplicateRowsNav) return;
    router.push({
      pathname: "/reconcile/reconcile-duplicate-rows",
      params: {
        table: duplicateRowsNav.table,
        ids: JSON.stringify(duplicateRowsNav.ids),
        statementLabel,
        bankLabel,
      },
    });
  }, [duplicateRowsNav, statementLabel, bankLabel]);

  const goToUnmatchedTxns = useCallback(() => {
    router.push({
      pathname: "/reconcile/reconcile-unmatched-txns",
      params: { statementLabel },
    });
  }, [statementLabel]);

  const goToMatchedTxns = useCallback(() => {
    router.push({
      pathname: "/reconcile/reconcile-matched-txns",
      params: { statementLabel },
    });
  }, [statementLabel]);

  const {
    data: matchedTxns,
    error: matchedTxnsError,
    hasNextPage: hasNextMatchedTxnsPage,
    isPending: isMatchedTxnsPending,
    refetch: refetchMatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["matched_txns", `${statementLabel}_joined`],
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
    hasNextPage: hasNextUnmatchedTxnsPage,
    isPending: isUnmatchedTxnsPending,
    refetch: refetchUnmatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["unmatched_txns", statementLabel],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `${API_URL}/reconcile_unmatched_txns/?table_name=${statementLabel}&page=${pageParam.page}&limit=${pageParam.limit}`,
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
    enabled: !!statementLabel && !!tenantId && !matchedTxnsError,
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

  const duplicateCount = duplicateRowsNav?.ids?.length ?? 0;
  const hasDuplicateBlocker = duplicateCount > 0;
  const hasUncategorizedBlocker = (uncategorizedCount ?? 0) > 0;
  const unmatchedCount = flattenedUnmatchedTxns.length;
  const hasUnmatchedWarning = !isUnmatchedTxnsPending && unmatchedCount > 0;
  const canComplete =
    !hasDuplicateBlocker && !hasUncategorizedBlocker && !isUncategorizedPending;

  const completeBlockerReason = useMemo(() => {
    const parts = [];
    if (hasDuplicateBlocker) {
      parts.push(
        `resuelve ${duplicateCount} grupo${duplicateCount === 1 ? "" : "s"} de duplicados`,
      );
    }
    if (hasUncategorizedBlocker) {
      const n = uncategorizedCount ?? 0;
      parts.push(`categoriza ${n} transacción${n === 1 ? "" : "es"}`);
    }
    if (parts.length === 0) return null;
    return `Para completar: ${parts.join(" y ")}.`;
  }, [
    duplicateCount,
    hasDuplicateBlocker,
    hasUncategorizedBlocker,
    uncategorizedCount,
  ]);

  const summaryLoading =
    isMatchedTxnsPending ||
    isUnmatchedTxnsPending ||
    isUncategorizedPending ||
    isDuplicatesPending;

  const runReconcile = async () => {
    setIsReconciling(true);
    try {
      const dropRes = await fetch(
        `${API_URL}/drop_statement_table/?table=${encodeURIComponent(`${statementLabel}_joined`)}`,
        { method: "POST", headers: getAuthHeaders() },
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
        `${API_URL}/create_statement_joined/?table_name=${encodeURIComponent(statementLabel)}&bank_name=${encodeURIComponent(bankLabel)}`,
        { method: "POST", headers: getAuthHeaders() },
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
        queryKey: ["matched_txns", tenantId, `${statementLabel}_joined`],
      });
      await queryClient.invalidateQueries({
        queryKey: ["unmatched_txns", tenantId, statementLabel],
      });
      refetchMatchedTxns();
      refetchUnmatchedTxns();
      refetchDuplicateRowsInfo();
      refetchUncategorizedCount();
      Alert.alert("Éxito", "Conciliación actualizada.");
    } catch (error) {
      console.error("Error reconciling:", error);
      Alert.alert("Error", "Error al conciliar transacciones");
    } finally {
      setIsReconciling(false);
    }
  };

  const completeReconcile = async () => {
    if (!canComplete) {
      Alert.alert(
        "No se puede completar",
        completeBlockerReason ??
          "Resuelve los problemas pendientes antes de completar la conciliación.",
      );
      return;
    }

    try {
      const compareParams = new URLSearchParams({
        table_name: `${statementLabel}_joined`,
      });
      const compareRes = await fetch(
        `${API_URL}/compare_statement_tables/?${compareParams.toString()}`,
        { method: "GET", headers: getAuthHeaders() },
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
        const tableName = compareBody.table_name ?? `${statementLabel}_joined`;
        const dupIds = compareBody.duplicates.map((d) => d.id);
        router.push({
          pathname: "/reconcile/reconcile-duplicate-rows",
          params: {
            table: tableName,
            ids: JSON.stringify(dupIds),
            statementLabel,
            bankLabel,
          },
        });
        return;
      }

      const res = await fetch(
        `${API_URL}/get_uncategorized_count/?table_name=${encodeURIComponent(`${statementLabel}_joined`)}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        },
      );
      const response = await res.json();
      if (!res.ok) {
        Alert.alert("Error", response.message);
        return;
      }
      if (response.count > 0) {
        router.push({
          pathname: "/reconcile/reconcile-matched-txns",
          params: { statementLabel },
        });
        return;
      }

      const minMaxDatesRes = await fetch(
        `${API_URL}/min_and_max_dates/?table_name=${encodeURIComponent(`${statementLabel}_joined`)}`,
        { headers: getAuthHeaders() },
      );
      const minMaxDatesResponse = await minMaxDatesRes.json();
      if (!minMaxDatesRes.ok) {
        Alert.alert("Error", minMaxDatesResponse.message);
        return;
      }
      const deleteTxnsRes = await fetch(
        `${API_URL}/delete_txns/?table=${encodeURIComponent(`${statementLabel}_joined`)}&from_date=${encodeURIComponent(minMaxDatesResponse.min_date)}&to_date=${encodeURIComponent(minMaxDatesResponse.max_date)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const deleteTxnsResponse = await deleteTxnsRes.json();
      if (!deleteTxnsRes.ok) {
        Alert.alert("Error", deleteTxnsResponse.message);
        return;
      }
      const insertTxnsRes = await fetch(
        `${API_URL}/insert_txns/?from_table=${encodeURIComponent(`${statementLabel}_joined`)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
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
          style={[
            reconcileStyles.summaryCard,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text
            style={[reconcileStyles.summaryMeta, { color: theme.colors.text }]}
          >
            {statementLabel} · {bankLabel}
          </Text>
          <View style={reconcileStyles.summaryStatsRow}>
            <SummaryStatChip
              theme={theme}
              tone="success"
              label={
                summaryLoading
                  ? "Conciliadas: …"
                  : `Conciliadas: ${formatCount(flattenedMatchedTxns.length, hasNextMatchedTxnsPage)}`
              }
              onPress={
                matchedTxnsError || isMatchedTxnsPending
                  ? undefined
                  : goToMatchedTxns
              }
            />
            <SummaryStatChip
              theme={theme}
              tone={hasUnmatchedWarning ? "warning" : "neutral"}
              label={
                isUnmatchedTxnsPending
                  ? "Sin conciliar: …"
                  : `Sin conciliar: ${formatCount(unmatchedCount, hasNextUnmatchedTxnsPage)}`
              }
              onPress={
                unmatchedTxnsError || isUnmatchedTxnsPending
                  ? undefined
                  : goToUnmatchedTxns
              }
            />
            <SummaryStatChip
              theme={theme}
              tone={hasDuplicateBlocker ? "error" : "neutral"}
              label={
                isDuplicatesPending
                  ? "Duplicados: …"
                  : `Duplicados: ${duplicateCount}`
              }
              onPress={hasDuplicateBlocker ? goToDuplicateRows : undefined}
            />
            <SummaryStatChip
              theme={theme}
              tone={hasUncategorizedBlocker ? "warning" : "neutral"}
              label={
                isUncategorizedPending
                  ? "Sin categorizar: …"
                  : `Sin categorizar: ${uncategorizedCount ?? 0}`
              }
              onPress={isUncategorizedPending ? undefined : goToMatchedTxns}
            />
          </View>
        </View>

        {hasDuplicateBlocker ? (
          <BlockerBanner
            theme={theme}
            tone="error"
            icon="copy-outline"
            title="Filas duplicadas"
            message={`Hay ${duplicateCount} grupo${duplicateCount === 1 ? "" : "s"} de filas duplicadas. Revísalas y corrígelas antes de completar la conciliación.`}
            actionLabel="Ver duplicados"
            onAction={goToDuplicateRows}
          />
        ) : null}

        {hasUncategorizedBlocker ? (
          <BlockerBanner
            theme={theme}
            tone="warning"
            icon="pricetag-outline"
            title="Transacciones sin categorizar"
            message={`Hay ${uncategorizedCount} transacción${uncategorizedCount === 1 ? "" : "es"} sin categorizar en la tabla de conciliadas. Asigna categoría antes de completar.`}
            actionLabel="Ver conciliadas"
            onAction={goToMatchedTxns}
          />
        ) : null}

        {hasUnmatchedWarning ? (
          <BlockerBanner
            theme={theme}
            tone="warning"
            icon="alert-circle-outline"
            title="Movimientos sin conciliar"
            message={`Quedan ${formatCount(unmatchedCount, hasNextUnmatchedTxnsPage)} movimiento${unmatchedCount === 1 ? "" : "s"} del extracto sin emparejar. Puedes revisarlos antes de completar.`}
            actionLabel="Ver sin conciliar"
            onAction={goToUnmatchedTxns}
          />
        ) : null}

        <View style={reconcileStyles.actionsRow}>
          <Pressable
            disabled={isReconciling}
            style={({ pressed }) => [
              reconcileStyles.secondaryButton,
              {
                borderColor: theme.colors.primary,
                opacity: isReconciling ? 0.7 : 1,
              },
              pressed && !isReconciling && { opacity: 0.8 },
            ]}
            onPress={runReconcile}
          >
            {isReconciling ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
                Actualizar conciliación
              </Text>
            )}
          </Pressable>
          <Pressable
            disabled={!canComplete}
            style={({ pressed }) => [
              reconcileStyles.completeButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !canComplete ? 0.5 : 1,
              },
              pressed && canComplete && reconcileStyles.completeButtonPressed,
            ]}
            onPress={completeReconcile}
          >
            <Text style={reconcileStyles.uploadButtonText}>Completar</Text>
          </Pressable>
        </View>

        {!canComplete && completeBlockerReason ? (
          <Text
            style={[
              reconcileStyles.completeHint,
              { color: theme.colors.textSecondary },
            ]}
          >
            {completeBlockerReason}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
