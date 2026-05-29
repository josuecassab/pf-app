import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../../../components/TxnTable";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useBanks } from "../../../hooks/useBanks";
import { useCategories } from "../../../hooks/useCategories";
import { useSubcategories } from "../../../hooks/useSubcategories";
import { formatApiError } from "../../../lib/apiErrors";
import { authJsonHeaders } from "../../../lib/apiHeaders";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function parseIdsParam(raw) {
  if (raw == null || raw === "") return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function routeParamOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

function collectTxnIds(rows) {
  const seen = new Set();
  const ids = [];
  for (const row of rows) {
    const raw = row?.txn_id;
    if (raw == null) continue;
    const key = String(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    const n = Number(raw);
    ids.push(!Number.isNaN(n) && String(n) === key ? n : raw);
  }
  return ids;
}

export default function ReconcileDuplicateRows() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const table = routeParamOne(params.table);
  const statementLabel =
    routeParamOne(params.statementLabel) ||
    (table.endsWith("_joined") ? table.slice(0, -"_joined".length) : table);
  const bankLabel = routeParamOne(params.bankLabel);
  const joinedTableName = `${statementLabel}_joined`;
  const ids = useMemo(() => parseIdsParam(params.ids), [params.ids]);
  const { data: categoriesData } = useCategories();
  const { data: subcategoriesData } = useSubcategories();
  const { data: banksData } = useBanks();
  const idsKey = useMemo(() => ids.join(","), [ids]);
  const [isReconciling, setIsReconciling] = useState(false);

  const queryKey = useMemo(
    () => ["statement_records", tenantId, table, idsKey],
    [tenantId, table, idsKey],
  );

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
    data: queryData,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const qs = new URLSearchParams({
        table: String(table),
      });
      const res = await fetch(
        `${API_URL}/statement_records/?${qs.toString()}`,
        {
          method: "POST",
          headers: authJsonHeaders(getAuthHeaders),
          body: JSON.stringify({ ids }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      const rows = Array.isArray(body) ? body : (body?.records ?? []);
      return { pages: [rows], pageParams: [null] };
    },
    enabled: Boolean(tenantId && table && ids.length > 0),
  });

  const txns = useMemo(
    () => queryData?.pages?.flatMap((p) => p) ?? [],
    [queryData],
  );

  const txnIdsToDelete = useMemo(() => collectTxnIds(txns), [txns]);

  const handleReconcileDuplicates = useCallback(() => {
    if (txnIdsToDelete.length === 0) {
      Alert.alert("Error", "No hay transacciones duplicadas para eliminar.");
      return;
    }
    if (!statementLabel || !bankLabel) {
      Alert.alert("Error", "Faltan datos del extracto o banco para conciliar.");
      return;
    }

    const count = txnIdsToDelete.length;
    Alert.alert(
      "Conciliar duplicados",
      count === 1
        ? "¿Eliminar la transacción duplicada y actualizar la conciliación?"
        : `¿Eliminar las ${count} transacciones duplicadas y actualizar la conciliación?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceptar",
          onPress: async () => {
            setIsReconciling(true);
            try {
              const deleteRes = await fetch(`${API_URL}/delete_txn/`, {
                method: "DELETE",
                headers: authJsonHeaders(getAuthHeaders),
                body: JSON.stringify({ ids: txnIdsToDelete }),
              });
              const deleteBody = await deleteRes.json().catch(() => ({}));
              if (!deleteRes.ok) {
                Alert.alert(
                  "Error",
                  formatApiError(deleteBody) || `Error ${deleteRes.status}`,
                );
                return;
              }

              const dropRes = await fetch(
                `${API_URL}/drop_statement_table/?table=${encodeURIComponent(joinedTableName)}`,
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
                queryKey: ["matched_txns", joinedTableName],
              });
              await queryClient.invalidateQueries({
                queryKey: ["unmatched_txns", statementLabel],
              });
              await queryClient.invalidateQueries({
                queryKey: ["reconcile_compare", tenantId, joinedTableName],
              });
              await queryClient.invalidateQueries({
                queryKey: [
                  "reconcile_uncategorized",
                  tenantId,
                  joinedTableName,
                ],
              });

              router.back();
            } catch (reconcileError) {
              console.error(
                "Failed to reconcile duplicate rows:",
                reconcileError,
              );
              Alert.alert(
                "Error",
                reconcileError?.message ??
                  "No se pudieron conciliar los duplicados.",
              );
            } finally {
              setIsReconciling(false);
            }
          },
        },
      ],
    );
  }, [
    txnIdsToDelete,
    statementLabel,
    bankLabel,
    joinedTableName,
    getAuthHeaders,
    queryClient,
    tenantId,
  ]);

  if (!table) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          Falta el nombre de la tabla.
        </Text>
      </SafeAreaView>
    );
  }

  if (!tenantId) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          Inicia sesión para ver estas filas.
        </Text>
      </SafeAreaView>
    );
  }

  if (ids.length === 0) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          No hay identificadores de duplicados para cargar.
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
        >
          Filas duplicadas ({ids.length} {ids.length === 1 ? "grupo" : "grupos"}
          )
        </Text>
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>
          Revise las transacciones duplicadas y concílielas para continuar.
        </Text>
        {txnIdsToDelete.length > 0 ? (
          <Pressable
            disabled={isReconciling || isPending}
            style={({ pressed }) => [
              reconcileStyles.destructiveActionButton,
              {
                borderColor: theme.colors.error,
                backgroundColor: theme.colors.surface,
                opacity: isReconciling || isPending ? 0.6 : 1,
              },
              pressed && !isReconciling && !isPending && { opacity: 0.85 },
            ]}
            onPress={handleReconcileDuplicates}
          >
            {isReconciling ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <Text
                style={[
                  reconcileStyles.destructiveActionButtonText,
                  { color: theme.colors.error },
                ]}
              >
                Eliminar y actualizar conciliación
              </Text>
            )}
          </Pressable>
        ) : null}
        <TxnTable
          table={String(table)}
          txns={txns}
          error={error}
          fetchNextPage={() => {}}
          hasNextPage={false}
          isFetchingNextPage={false}
          isPending={isPending}
          queryKey={queryKey}
          refetch={refetch}
          categoriesById={categoriesById}
          subcategoriesById={subcategoriesById}
          banksById={banksById}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
