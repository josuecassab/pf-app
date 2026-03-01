import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../components/TxnTable";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TABLE = "txns";

export default function Txns() {
  const { theme } = useTheme();
  const { schema } = useAuth();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1),
  );

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["txns", schema],
    queryFn: ({ pageParam }) =>
      fetch(
        `${API_URL}/latests_txns/?page=${pageParam.page}&limit=${pageParam.limit}&schema=${schema}`,
      ).then((res) => res.json()),
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
    // staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // refetchOnMount: false,
  });

  const {
    isPending: categoriesIsPending,
    error: categoriesError,
    data: categoriesData,
    isFetching: categoriesIsFetching,
  } = useCategories();

  // Flatten all pages into a single array of transactions
  const txns = useMemo(() => {
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  const showPicker = useCallback(
    (value) => {
      setShow(value);
      if (value) {
        setTempYear(selectedYear); // Reset temp year when opening picker
        setTempMonth(selectedMonth); // Reset temp month when opening picker
      }
    },
    [selectedYear, selectedMonth],
  );

  const onValueChange = useCallback(() => {
    showPicker(false);
    const newDate = new Date(parseInt(tempYear), parseInt(tempMonth) - 1);
    setDate(newDate);
    // Update year and month to trigger refetch with new filters
    setSelectedYear(tempYear);
    setSelectedMonth(tempMonth);
  }, [tempYear, tempMonth, showPicker]);
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View>
        <View style={styles.headerRow}>
          {/* <Pressable
            onPress={() => showPicker(true)}
            style={({ pressed }) => [
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              pressed && styles.dateButtonPressed,
            ]}
          >
            <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
              {date.toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </Pressable> */}
        </View>
        <TxnTable
          categories={categoriesData}
          style={styles.tableContainer}
          table={TABLE}
          txns={txns}
          error={error}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isPending={isPending}
          queryKey={["txns", schema]}
          refetch={refetch}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  dateButtonPressed: {
    opacity: 0.7,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    height: "33%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  modalButtonText: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  tableContainer: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
});
