import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../../../components/TxnTable";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { formatSpanishNumber } from "../../../lib/formatSpanishNumber";
import { getTxnFilterModalPathname } from "../../../lib/txnFilterModalRoutes";
import { applyTxnFilters } from "../../../lib/txnTableFilters";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TABLE = "txns";

function paramOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

export default function Txns() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const pathname = usePathname();
  const routeParams = useLocalSearchParams();
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterSubcategory, setFilterSubcategory] = useState(null);
  const [filterBank, setFilterBank] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterValue, setFilterValue] = useState(null);
  const [filterDescription, setFilterDescription] = useState("");

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["txns", tenantId],
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

  const filteredTxns = useMemo(
    () =>
      applyTxnFilters(txns, {
        filterCategory,
        filterSubcategory,
        filterBank,
        filterDate,
        filterValue,
        filterDescription,
      }),
    [
      txns,
      filterCategory,
      filterSubcategory,
      filterBank,
      filterDate,
      filterValue,
      filterDescription,
    ],
  );

  useEffect(() => {
    const raw = paramOne(routeParams.txnFilterApplyJson);
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (String(parsed.table ?? "") !== String(TABLE)) return;

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
  }, [routeParams.txnFilterApplyJson]);

  const openHeaderFilter = useCallback(
    (label) => {
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
        table: String(TABLE),
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

  const showFilterChips =
    filterCategory ||
    filterDate ||
    filterSubcategory ||
    filterBank ||
    filterValue != null ||
    (filterDescription && filterDescription.trim() !== "");

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

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={{ flex: 1 }}>
        {filterChipsRow}
        <TxnTable
          style={styles.tableContainer}
          table={TABLE}
          txns={filteredTxns}
          allTxns={txns}
          error={error}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isPending={isPending}
          queryKey={["txns", tenantId]}
          refetch={refetch}
          onHeaderFilterPress={openHeaderFilter}
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
    gap: 8,
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
