import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatApiError } from "../lib/apiErrors";
import { authJsonHeaders } from "../lib/apiHeaders";
import { consumePendingTxnTablePostEffects } from "../lib/pendingTxnTableModal";
import { stringifyQueryKeyForParams } from "../lib/queryKeyParams";
import Button from "./Button";
import TxnTable from "./TxnTable";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
export default function TxnTableWithSelectionToolbar({
  style,
  tableStyle,
  queryKey,
  tableName = "txns",
  txns = [],
  categoriesById = {},
  subcategoriesById = {},
  banksById = {},
  ...tableProps
}) {
  const { theme } = useTheme();
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState({});
  const [displayTxns, setDisplayTxns] = useState(txns);
  const [deleting, setDeleting] = useState(false);

  const selectedCount = useMemo(
    () => Object.keys(selectedTxnIds).filter((id) => selectedTxnIds[id]).length,
    [selectedTxnIds],
  );

  const txnsById = useMemo(() => {
    const map = {};
    for (const t of txns) {
      if (t?.id != null) map[String(t.id)] = t;
    }
    return map;
  }, [txns]);

  const handleDisplayTxnsChange = useCallback((rows) => {
    setDisplayTxns(rows);
  }, []);

  const toggleTxnSelected = useCallback((id) => {
    const key = String(id);
    setSelectedTxnIds((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedTxnIds((prev) => {
      const visible = displayTxns;
      const allVisibleSelected =
        visible.length > 0 && visible.every((t) => prev[String(t.id)]);
      const next = { ...prev };
      if (allVisibleSelected) {
        for (const t of visible) {
          delete next[String(t.id)];
        }
      } else {
        for (const t of visible) {
          next[String(t.id)] = true;
        }
      }
      return next;
    });
  }, [displayTxns]);

  const clearBulkSelection = useCallback(() => {
    setSelectedTxnIds({});
    setSelectionMode(false);
  }, []);

  const handleChangeCategory = useCallback(() => {
    const idsArray = Object.keys(selectedTxnIds);
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(n) === id ? n : id;
    });
    if (ids.length === 0) return;
    router.push({
      pathname: "/txn-modals/select-category",
      params: {
        table: String(tableName),
        queryKeyJson: stringifyQueryKeyForParams(queryKey),
        ids: JSON.stringify(ids),
      },
    });
  }, [selectedTxnIds, queryKey, tableName]);

  const handleChangeSubcategory = useCallback(() => {
    const idsArray = Object.keys(selectedTxnIds).filter(
      (id) => selectedTxnIds[id],
    );
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(n) === id ? n : id;
    });
    if (ids.length === 0) return;

    const selectedTxns = idsArray.map((id) => txnsById[id]);
    const categoryKeys = selectedTxns.map((t) =>
      t?.category_id != null ? String(t.category_id) : null,
    );
    const firstKey = categoryKeys[0];
    const allSameCategory =
      firstKey != null && categoryKeys.every((k) => k === firstKey);

    if (!allSameCategory) {
      Alert.alert(
        "No se puede cambiar la subcategoría",
        "Para establecer la subcategoría, todas las transacciones seleccionadas deben pertenecer a la misma categoría y tener una categoría asignada.",
      );
      return;
    }

    router.push({
      pathname: "/txn-modals/select-subcategory",
      params: {
        table: String(tableName),
        queryKeyJson: stringifyQueryKeyForParams(queryKey),
        ids: JSON.stringify(ids),
        category_id: String(firstKey),
      },
    });
  }, [selectedTxnIds, queryKey, tableName, txnsById]);

  const handleChangeDate = useCallback(() => {
    const idsArray = Object.keys(selectedTxnIds);
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(n) === id ? n : id;
    });
    if (ids.length === 0) return;
    const firstId = idsArray[0];
    const firstTxn = txnsById[firstId];
    const dateStr = firstTxn?.date != null ? String(firstTxn.date) : "";
    router.push({
      pathname: "/txn-modals/edit-date",
      params: {
        table: String(tableName),
        queryKeyJson: stringifyQueryKeyForParams(queryKey),
        ids: JSON.stringify(ids),
        ...(dateStr ? { dateStr } : {}),
      },
    });
  }, [selectedTxnIds, queryKey, tableName, txnsById]);

  const handleDeleteTxns = useCallback(() => {
    const idsArray = Object.keys(selectedTxnIds).filter(
      (id) => selectedTxnIds[id],
    );
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(n) === id ? n : id;
    });
    if (ids.length === 0 || queryKey == null) return;

    const count = ids.length;
    Alert.alert(
      "Eliminar transacciones",
      count === 1
        ? "¿Eliminar la transacción seleccionada? Esta acción no se puede deshacer."
        : `¿Eliminar las ${count} transacciones seleccionadas? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await fetch(`${API_URL}/delete_txn/`, {
                method: "DELETE",
                headers: authJsonHeaders(getAuthHeaders),
                body: JSON.stringify({ ids }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) {
                Alert.alert(
                  "Error",
                  formatApiError(body) || `Error ${res.status}`,
                );
                return;
              }

              const idSet = new Set(ids.map((x) => String(x)));
              queryClient.setQueryData(queryKey, (oldData) => {
                if (!oldData?.pages) return oldData;
                return {
                  ...oldData,
                  pages: oldData.pages.map((page) =>
                    Array.isArray(page)
                      ? page.filter((txn) => !idSet.has(String(txn.id)))
                      : page,
                  ),
                };
              });

              clearBulkSelection();
            } catch (error) {
              console.error("Failed to delete transactions:", error);
              Alert.alert(
                "Error",
                error?.message ?? "No se pudieron eliminar las transacciones.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [
    selectedTxnIds,
    queryKey,
    getAuthHeaders,
    queryClient,
    clearBulkSelection,
  ]);

  useFocusEffect(
    useCallback(() => {
      const fx = consumePendingTxnTablePostEffects();
      if (fx?.clearSelection) {
        clearBulkSelection();
      }
    }, [clearBulkSelection]),
  );

  return (
    <View style={[styles.root, style]}>
      <View
        style={[styles.toolbar, !selectionMode && styles.toolbarEditAlignEnd]}
      >
        {selectionMode ? (
          <>
            <Pressable
              onPress={clearBulkSelection}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                Cancelar
              </Text>
            </Pressable>
            {selectedCount > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
              >
                <Pressable
                  onPress={handleChangeCategory}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.primary, fontWeight: "600" },
                    ]}
                  >
                    Cambiar categoría ({selectedCount})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleChangeSubcategory}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.primary, fontWeight: "600" },
                    ]}
                  >
                    Cambiar subcategoría ({selectedCount})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleChangeDate}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.primary, fontWeight: "600" },
                    ]}
                  >
                    Cambiar fecha ({selectedCount})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteTxns}
                  disabled={deleting}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed || deleting ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.error, fontWeight: "600" },
                    ]}
                  >
                    Eliminar txns ({selectedCount})
                  </Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </>
        ) : (
          <Button title="Editar" onPress={() => setSelectionMode(true)} />
        )}
      </View>
      <TxnTable
        style={tableStyle}
        selectionMode={selectionMode}
        queryKey={queryKey}
        tableName={tableName}
        selectedTxnIds={selectedTxnIds}
        txns={txns}
        onDisplayTxnsChange={handleDisplayTxnsChange}
        onToggleTxnSelected={toggleTxnSelected}
        onToggleSelectAllVisible={toggleSelectAllVisible}
        categoriesById={categoriesById}
        subcategoriesById={subcategoriesById}
        banksById={banksById}
        {...tableProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 8,
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 0,
  },
  toolbarEditAlignEnd: {
    justifyContent: "flex-start",
  },
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  cancelButton: {
    flexShrink: 0,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
  },
});
