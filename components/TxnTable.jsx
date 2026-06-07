import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
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
import { stringifyQueryKeyForParams } from "../lib/queryKeyParams";
import { getTxnFilterModalPathname } from "../lib/txnFilterModalRoutes";
import { applyTxnFilters } from "../lib/txnTableFilters";

function paramOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

export default function TxnTable({
  categoriesById = {},
  subcategoriesById = {},
  banksById = {},
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
  tableName,
  onDisplayTxnsChange,
  selectionMode = false,
  selectedTxnIds = {},
  onToggleTxnSelected,
  onToggleSelectAllVisible,
}) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const routeParams = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const headerFiltersOwned =
    typeof tableName === "string" && tableName.length > 0;

  const [filterCategory, setFilterCategory] = useState(null);
  const [filterSubcategory, setFilterSubcategory] = useState(null);
  const [filterBank, setFilterBank] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterValue, setFilterValue] = useState(null);
  const [filterDescription, setFilterDescription] = useState("");

  useEffect(() => {
    if (!headerFiltersOwned) return;
    const raw = paramOne(routeParams.txnFilterApplyJson);
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (String(parsed.table ?? "") !== String(tableName)) return;

    const {
      headerDropdownLabel,
      item,
      filterValue: fv,
      filterDescription: fd,
    } = parsed;
    if (headerDropdownLabel === "Categoria") {
      setFilterCategory(
        item
          ? {
              label: item.label,
              value: item.value,
              sub_categorias: item.sub_categorias,
            }
          : null,
      );
    } else if (headerDropdownLabel === "Subcategoria") {
      setFilterSubcategory(
        item ? { label: item.label, value: item.value } : null,
      );
    } else if (
      headerDropdownLabel === "Banco" ||
      headerDropdownLabel === "Cuenta"
    ) {
      setFilterBank(item ? { label: item.label, value: item.value } : null);
    } else if (headerDropdownLabel === "Fecha" && item?.year && item?.month) {
      setFilterDate({ year: item.year, month: item.month });
    } else if (headerDropdownLabel === "Monto") {
      setFilterValue(fv != null && fv !== "" ? fv : null);
    } else if (headerDropdownLabel === "Descripción") {
      setFilterDescription(typeof fd === "string" ? fd : "");
    }
    router.setParams({ txnFilterApplyJson: undefined });
  }, [tableName, routeParams.txnFilterApplyJson]);

  const handleCategoryPress = useCallback(
    (id) => {
      router.push({
        pathname: "/txn-modals/select-category",
        params: {
          table: String(tableName),
          queryKeyJson: stringifyQueryKeyForParams(queryKey),
          ids: JSON.stringify([id]),
        },
      });
    },
    [tableName, queryKey],
  );

  const handleSubCategoryPress = useCallback(
    (id, categoryId) => {
      router.push({
        pathname: "/txn-modals/select-subcategory",
        params: {
          table: String(tableName),
          queryKeyJson: stringifyQueryKeyForParams(queryKey),
          ids: JSON.stringify([id]),
          ...(categoryId != null ? { category_id: String(categoryId) } : {}),
        },
      });
    },
    [tableName, queryKey],
  );

  const openHeaderFilter = useCallback(
    (label) => {
      if (!headerFiltersOwned) return;
      const modalPath = getTxnFilterModalPathname(label);
      if (!modalPath) return;

      const omittedFromReturnSnapshot = new Set(["txnFilterApplyJson"]);
      const snapshot = {};
      for (const [k, v] of Object.entries(routeParams)) {
        if (omittedFromReturnSnapshot.has(k)) continue;
        snapshot[k] = Array.isArray(v) ? v[0] : v;
      }
      const params = {
        returnPathname: pathname,
        returnParamsJson: JSON.stringify(snapshot),
        table: String(tableName),
      };
      if (filterCategory) {
        params.filterCategoryJson = JSON.stringify(filterCategory);
      }
      if (filterSubcategory) {
        params.filterSubcategoryJson = JSON.stringify(filterSubcategory);
      }
      if (filterBank) {
        params.filterBankJson = JSON.stringify(filterBank);
      }
      if (filterDate?.year != null && filterDate?.month != null) {
        params.filterDateJson = JSON.stringify(filterDate);
      }
      if (filterValue != null && filterValue !== "") {
        params.filterValue = String(filterValue);
      }
      if (filterDescription && filterDescription.trim() !== "") {
        params.filterDescription = filterDescription;
      }
      router.push({
        pathname: modalPath,
        params,
      });
    },
    [
      tableName,
      pathname,
      routeParams,
      filterCategory,
      filterSubcategory,
      filterBank,
      filterDate,
      filterValue,
      filterDescription,
    ],
  );

  const filterPayload = useMemo(
    () => ({
      filterCategory,
      filterSubcategory,
      filterBank,
      filterDate,
      filterValue,
      filterDescription,
    }),
    [
      filterCategory,
      filterSubcategory,
      filterBank,
      filterDate,
      filterValue,
      filterDescription,
    ],
  );

  const displayTxns = useMemo(() => {
    if (headerFiltersOwned) {
      return applyTxnFilters(txns, filterPayload);
    }
    return txns;
  }, [headerFiltersOwned, txns, filterPayload]);

  useLayoutEffect(() => {
    onDisplayTxnsChange?.(displayTxns);
  }, [displayTxns, onDisplayTxnsChange]);

  const sourceTxns = headerFiltersOwned ? txns : (allTxns ?? txns);

  const handleHeaderFilterPress = headerFiltersOwned
    ? openHeaderFilter
    : onHeaderFilterPress;

  const showFilterChips =
    headerFiltersOwned &&
    (filterCategory ||
      filterDate ||
      filterSubcategory ||
      filterBank ||
      filterValue != null ||
      (filterDescription && filterDescription.trim() !== ""));

  const filterChipsRow = !showFilterChips ? null : (
    <View style={styles.filterChipsRow}>
      {filterDate?.year && filterDate?.month && (
        <Pressable
          onPress={() => setFilterDate(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            date: {String(filterDate.month).padStart(2, "0")}/{filterDate.year}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterCategory && (
        <Pressable
          onPress={() => setFilterCategory(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Categoría: {filterCategory.label}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterSubcategory && (
        <Pressable
          onPress={() => setFilterSubcategory(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Subcategoría: {filterSubcategory.label}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterBank && (
        <Pressable
          onPress={() => setFilterBank(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Banco: {filterBank.label}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterValue != null && filterValue !== "" && (
        <Pressable
          onPress={() => setFilterValue(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Valor: {formatSpanishNumber(Number(filterValue))}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterDescription && filterDescription.trim() !== "" && (
        <Pressable
          onPress={() => setFilterDescription("")}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[styles.filterChipText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            Descripción: {filterDescription.trim()}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
    </View>
  );

  if (isPending)
    return (
      <View style={[styles.root, style, { flex: 1 }]}>
        {filterChipsRow}
        <View
          style={{
            flex: 1,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );

  if (error)
    return (
      <View style={[styles.root, style, { flex: 1 }]}>
        {filterChipsRow}
        <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
          <Text style={{ color: theme.colors.error }}>
            An error has occurred: {error.message}
          </Text>
        </View>
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
    Editar: styles.colEdit,
  };

  const renderHeaderCell = (label) => (
    <Pressable
      style={[headerColumnStyle[label]]}
      onPress={() => {
        if (label === "Editar") return;
        handleHeaderFilterPress?.(label);
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

  const hasReconciledField = sourceTxns.some(
    (item) => item?.reconciled !== undefined,
  );
  // Txns tab passes row-selection handlers: hide Editar until selectionMode.
  // Reconcile tables omit those handlers and keep Editar whenever data has reconciled.
  const showEditColumn =
    hasReconciledField && (!onToggleTxnSelected || selectionMode);

  const renderSelectAllHeaderCell = () => {
    const allVisibleSelected =
      displayTxns.length > 0 &&
      displayTxns.every((t) => selectedTxnIds[String(t.id)]);
    const someVisibleSelected = displayTxns.some(
      (t) => selectedTxnIds[String(t.id)],
    );
    const iconName =
      displayTxns.length === 0
        ? "check-box-outline-blank"
        : allVisibleSelected
          ? "check-box"
          : someVisibleSelected
            ? "indeterminate-check-box"
            : "check-box-outline-blank";

    return (
      <Pressable
        style={styles.colSelect}
        onPress={() => onToggleSelectAllVisible?.()}
      >
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

  const renderCategoryCell = (id, categoryId) => (
    <Pressable
      onPress={() => handleCategoryPress(id)}
      style={({ pressed }) => [
        styles.cell,
        styles.colCategory,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed
            ? theme.colors.inputBackground
            : theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {categoriesById.get(categoryId)?.toLowerCase()}
      </Text>
    </Pressable>
  );

  const renderSubCategoryCell = (id, subCategoryId, categoryId) => (
    <Pressable
      onPress={() => handleSubCategoryPress(id, categoryId)}
      style={({ pressed }) => [
        styles.cell,
        styles.colSubcategory,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed
            ? theme.colors.inputBackground
            : theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {subcategoriesById.get(subCategoryId)?.toLowerCase()}
      </Text>
    </Pressable>
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
        {banksById.get(value)?.toLowerCase()}
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
          name="radio-button-unchecked"
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
        onPress={() => onToggleTxnSelected?.(id)}
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
      {renderCategoryCell(item.id, item.category_id)}
      {renderSubCategoryCell(item.id, item.subcategory_id, item.category_id)}
      {renderBankCell(item.bank_id)}
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

  return (
    <View style={[styles.root, style]}>
      {filterChipsRow}
      <View style={styles.tableMain}>
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
            data={displayTxns}
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
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    marginRight: 6,
  },
  filterChipIcon: {
    marginLeft: 2,
  },
});
