import { Picker } from "@react-native-picker/picker";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import TxnTable from "../components/TxnTable";

const queryClient = new QueryClient();
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TABLE = "txns";

export default function Txns() {
  const { theme } = useTheme();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [tempYear, setTempYear] = useState(selectedYear);
  const [tempMonth, setTempMonth] = useState(selectedMonth);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["txns", selectedYear, selectedMonth],
    queryFn: ({ pageParam }) =>
      fetch(
        `${API_URL}/latests_txns/?year=${pageParam.year}&month=${pageParam.month}`
      ).then((res) => res.json()),
    initialPageParam: { year: selectedYear, month: selectedMonth },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // Calculate previous month from the last page param
      let prevMonth = parseInt(lastPageParam.month) - 1;
      let prevYear = parseInt(lastPageParam.year);

      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }

      if (prevYear < 2020) {
        return undefined;
      }

      return { year: String(prevYear), month: String(prevMonth) };
    },
    // staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // refetchOnMount: false,
  });

  // Flatten all pages into a single array of transactions
  const txns = useMemo(() => {
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2025; year <= currentYear; year++) {
      years.push(String(year));
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => {
    const months = [
      { value: "1", label: "Enero" },
      { value: "2", label: "Febrero" },
      { value: "3", label: "Marzo" },
      { value: "4", label: "Abril" },
      { value: "5", label: "Mayo" },
      { value: "6", label: "Junio" },
      { value: "7", label: "Julio" },
      { value: "8", label: "Agosto" },
      { value: "9", label: "Septiembre" },
      { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" },
      { value: "12", label: "Diciembre" },
    ];
    return months;
  }, []);

  const showPicker = useCallback(
    (value) => {
      setShow(value);
      if (value) {
        setTempYear(selectedYear); // Reset temp year when opening picker
        setTempMonth(selectedMonth); // Reset temp month when opening picker
      }
    },
    [selectedYear, selectedMonth]
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
          <Pressable
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
            <Text
              style={[styles.dateButtonText, { color: theme.colors.text }]}
            >
              {date.toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </Pressable>
        </View>
        {show && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={show}
            onRequestClose={() => showPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.modalBackground },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => showPicker(false)}>
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Text
                    style={[styles.modalTitle, { color: theme.colors.text }]}
                  >
                    Seleccionar fecha
                  </Text>
                  <Pressable onPress={onValueChange}>
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Done
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Picker
                      selectedValue={tempYear}
                      onValueChange={(itemValue) => setTempYear(itemValue)}
                      style={{ color: theme.colors.text }}
                      itemStyle={{ fontSize: 18, color: theme.colors.text }}
                    >
                      {yearOptions.map((year) => (
                        <Picker.Item key={year} label={year} value={year} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.pickerColumn}>
                    <Picker
                      selectedValue={tempMonth}
                      onValueChange={(itemValue) => setTempMonth(itemValue)}
                      style={{ color: theme.colors.text }}
                      itemStyle={{ fontSize: 18, color: theme.colors.text }}
                    >
                      {monthOptions.map((month) => (
                        <Picker.Item
                          key={month.value}
                          label={month.label}
                          value={month.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )}
        <QueryClientProvider client={queryClient}>
          <TxnTable
            style={styles.tableContainer}
            table={TABLE}
            txns={txns}
            error={error}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isPending={isPending}
            queryKey={["txns", selectedYear, selectedMonth]}
            refetch={refetch}
          />
        </QueryClientProvider>
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
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  pickerColumn: {
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
});
