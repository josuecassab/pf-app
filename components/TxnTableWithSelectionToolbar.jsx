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
import { useTheme } from "../contexts/ThemeContext";
import { consumePendingTxnTablePostEffects } from "../lib/pendingTxnTableModal";
import { stringifyQueryKeyForParams } from "../lib/queryKeyParams";
import TxnTable from "./TxnTable";

export default function TxnTableWithSelectionToolbar({
  style,
  tableStyle,
  queryKey,
  tableName = "txns",
  txns = [],
  ...tableProps
}) {
  const { theme } = useTheme();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState({});
  const [displayTxns, setDisplayTxns] = useState(txns);

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
        style={[
          styles.toolbar,
          !selectionMode && styles.toolbarEditAlignEnd,
        ]}
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
              </ScrollView>
            ) : null}
          </>
        ) : (
          <Pressable
            onPress={() => setSelectionMode(true)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              Editar
            </Text>
          </Pressable>
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
