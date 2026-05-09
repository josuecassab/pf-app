import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { formatSpanishNumber } from "../lib/formatSpanishNumber";
import { consumePendingTxnTablePostEffects } from "../lib/pendingTxnTableModal";
import { stringifyQueryKeyForParams } from "../lib/queryKeyParams";

export default function TxnTable({
  table,
  txns,
  allTxns,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isPending,
  queryKey,
  refetch,
  style,
  onHeaderFilterPress,
}) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState({});
  const sourceTxns = allTxns ?? txns;

  const toggleTxnSelected = (id) => {
    setSelectedTxnIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const openBulkCategorySelectionModal = () => {
    const idsArray = Object.keys(selectedTxnIds);
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(n) === id ? n : id;
    });
    console.log(ids);
    if (ids.length === 0) return;
    router.push({
      pathname: "/txn-modals/select-category",
      params: {
        table: String(table),
        queryKeyJson: stringifyQueryKeyForParams(queryKey),
        ids: JSON.stringify(ids),
      },
    });
  };

  const openBulkSubcategorySelectionModal = () => {
    const idsArray = Object.keys(selectedTxnIds);
    const ids = idsArray.map((id) => {
      const n = Number(id);
      return !Number.isNaN(n) && String(id) === id ? n : id;
    });
    if (ids.length === 0) return;

    router.push({
      pathname: "/txn-modals/select-subcategory",
      params: {
        table: String(table),
        queryKeyJson: stringifyQueryKeyForParams(queryKey),
        ids: JSON.stringify(ids),
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      const fx = consumePendingTxnTablePostEffects();
      if (fx?.clearSelection) {
        setSelectedTxnIds({});
        setSelectionMode(false);
      }
    }, []),
  );

  if (isPending)
    return (
      <View
        style={[
          styles.root,
          style,
          { padding: 16, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );

  if (error)
    return (
      <View
        style={[styles.root, style, { padding: 16, justifyContent: "center" }]}
      >
        <Text style={{ color: theme.colors.error }}>
          An error has occurred: {error.message}
        </Text>
      </View>
    );

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleLoadRecent = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey,
    });
    setRefreshing(false);
  };

  // Table rendering functions — column widths come from StyleSheet only
  const headerColumnStyle = {
    Fecha: styles.colDate,
    Descripción: styles.colDescription,
    Monto: styles.colAmount,
    Categoria: styles.colCategory,
    Subcategoria: styles.colSubcategoria,
    Cuenta: styles.colBank,
    Editar: styles.colEditar,
  };

  const renderHeaderCell = (label) => (
    <Pressable
      style={[headerColumnStyle[label]]}
      onPress={() => {
        if (label === "Editar") return;
        onHeaderFilterPress?.(label);
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.headerCell,
            headerColumnStyle[label],
            {
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const showEditColumn = sourceTxns.some(
    (item) => item?.reconciled !== undefined,
  );

  const renderSelectAllHeaderCell = () => {
    const allVisibleSelected =
      txns.length > 0 && txns.every((t) => selectedTxnIds[String(t.id)]);
    const someVisibleSelected = txns.some((t) => selectedTxnIds[String(t.id)]);
    const iconName =
      txns.length === 0
        ? "check-box-outline-blank"
        : allVisibleSelected
          ? "check-box"
          : someVisibleSelected
            ? "indeterminate-check-box"
            : "check-box-outline-blank";

    const toggleSelectAllVisible = () => {
      if (allVisibleSelected) {
        setSelectedTxnIds((prev) => {
          const next = { ...prev };
          for (const t of txns) {
            delete next[String(t.id)];
          }
          return next;
        });
      } else {
        setSelectedTxnIds((prev) => {
          const next = { ...prev };
          for (const t of txns) {
            next[String(t.id)] = true;
          }
          return next;
        });
      }
    };

    return (
      <Pressable style={styles.colSelect} onPress={toggleSelectAllVisible}>
        {({ pressed }) => (
          <View
            style={[
              styles.headerCell,
              styles.colSelect,
              {
                flex: 1,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={22}
              color={theme.colors.text}
            />
          </View>
        )}
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.row}>
      {selectionMode && renderSelectAllHeaderCell()}
      {renderHeaderCell("Fecha")}
      {renderHeaderCell("Descripción")}
      {renderHeaderCell("Monto")}
      {renderHeaderCell("Categoria")}
      {renderHeaderCell("Subcategoria")}
      {renderHeaderCell("Cuenta")}
      {showEditColumn && renderHeaderCell("Editar")}
    </View>
  );

  const renderDateCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colDate,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );

  const renderAmountCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          styles.cell,
          styles.colAmount,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderDescriptionCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colDescription,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderCategoryCell = (category) => (
    <View
      style={[
        styles.cell,
        styles.colCategory,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {category?.toLowerCase()}
      </Text>
    </View>
  );

  const renderSubCategoryCell = (subCategory) => (
    <View
      style={[
        styles.cell,
        styles.colSubcategory,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {subCategory?.toLowerCase()}
      </Text>
    </View>
  );

  const renderBankCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colBank,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text
        style={[styles.cellText, { color: theme.colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderEditCell = (reconciled) => {
    const sharedStyle = [
      styles.cell,
      styles.editCell,
      styles.colEdit,
      {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      },
    ];

    if (reconciled) {
      return (
        <View style={sharedStyle}>
          <MaterialIcons
            name="check-circle"
            size={24}
            color={theme.colors.text}
          />
        </View>
      );
    }

    return (
      <View style={sharedStyle}>
        <MaterialIcons
          name="delete-outline"
          size={24}
          color={theme.colors.text}
        />
      </View>
    );
  };

  const renderSelectRowCell = (id) => {
    const checked = !!selectedTxnIds[id];
    return (
      <Pressable
        style={[
          styles.cell,
          styles.colSelect,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
        onPress={() => toggleTxnSelected(id)}
      >
        <MaterialIcons
          name={checked ? "check-box" : "check-box-outline-blank"}
          size={22}
          color={theme.colors.text}
        />
      </Pressable>
    );
  };

  const renderTxns = (item) => (
    <View style={styles.row}>
      {selectionMode && renderSelectRowCell(item.id)}
      {renderDateCell(item.date)}
      {renderDescriptionCell(item.description)}
      {renderAmountCell(item.amount)}
      {renderCategoryCell(item.category)}
      {renderSubCategoryCell(item.subcategory)}
      {renderBankCell(item.bank)}
      {showEditColumn && renderEditCell(item.reconciled)}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  };

  const selectedCount = Object.keys(selectedTxnIds).filter(
    (id) => selectedTxnIds[id],
  ).length;

  const selectionToolbar = (
    <View style={styles.selectionToolbar}>
      {selectionMode ? (
        <>
          <Pressable
            onPress={() => {
              setSelectionMode(false);
              setSelectedTxnIds({});
            }}
            style={({ pressed }) => [
              styles.selectionToolbarButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.selectionToolbarButtonText,
                { color: theme.colors.text },
              ]}
            >
              Cancelar selección
            </Text>
          </Pressable>
          {selectedCount > 0 && (
            <>
              <Pressable
                onPress={openBulkCategorySelectionModal}
                style={({ pressed }) => [
                  styles.selectionToolbarButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectionToolbarButtonText,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                >
                  Cambiar categoría ({selectedCount})
                </Text>
              </Pressable>
              <Pressable
                onPress={openBulkSubcategorySelectionModal}
                style={({ pressed }) => [
                  styles.selectionToolbarButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectionToolbarButtonText,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                >
                  Cambiar subcategoría ({selectedCount})
                </Text>
              </Pressable>
            </>
          )}
        </>
      ) : (
        <Pressable
          onPress={() => setSelectionMode(true)}
          style={({ pressed }) => [
            styles.selectionToolbarButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.selectionToolbarButtonText,
              { color: theme.colors.text },
            ]}
          >
            Seleccionar varias
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      <View style={styles.tableMain}>
        {selectionToolbar}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={[
            styles.scrollView,
            { flex: 1, borderColor: theme.colors.border },
          ]}
        >
          <FlatList
            style={[
              styles.flatList,
              { flex: 1, borderColor: theme.colors.border },
            ]}
            keyExtractor={(item) => item.id}
            data={txns}
            ListHeaderComponent={renderHeader}
            renderItem={({ item }) => renderTxns(item)}
            stickyHeaderIndices={[0]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleLoadRecent}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tableMain: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
  colSelect: { width: 44 },
  colDate: { width: 99 },
  colDescription: { width: 112 },
  colAmount: { width: 112 },
  colCategory: { width: 112 },
  colSubcategory: { width: 112 },
  colBank: { width: 80 },
  colEdit: { width: 60 },
  headerCell: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    justifyContent: "center",
    padding: 8,
  },
  headerText: {
    fontWeight: "bold",
    textAlign: "right",
  },
  cell: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 8,
  },
  cellText: {
    textAlign: "right",
  },
  editCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingVertical: 16,
  },
  scrollView: {
    borderWidth: 1,
    borderRadius: 16,
  },
  flatList: {
    borderRadius: 16,
  },
  selectionToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  selectionToolbarButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectionToolbarButtonText: {
    fontSize: 14,
  },
});
