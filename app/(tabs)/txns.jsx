import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTableWithSelectionToolbar from "../../components/TxnTableWithSelectionToolbar";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useBanks } from "../../hooks/useBanks";
import { useCategories } from "../../hooks/useCategories";
import { useSubcategories } from "../../hooks/useSubcategories";
import { useTxns } from "../../hooks/useTxns";

const TABLE = "txns";

export default function Txns() {
  const { theme } = useTheme();
  const { tenantId } = useAuth();
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

  const queryKey = useMemo(() => ["txns", tenantId], [tenantId]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useTxns();

  const txns = useMemo(() => {
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
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
          categoriesById={categoriesById}
          subcategoriesById={subcategoriesById}
          banksById={banksById}
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
