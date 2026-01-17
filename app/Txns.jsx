import { Picker } from "@react-native-picker/picker";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../components/TxnTable";

const queryClient = new QueryClient();
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TABLE = "txns";

export default function Txns() {
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
    <SafeAreaView style={{ flex: 1 }} className="px-4 gap-2">
      <View>
        <View className="flex flex-row justify-between items-center">
          <Pressable
            onPress={() => showPicker(true)}
            className="rounded-2xl px-4 py-2 self-start border border-gray-400 bg-white active:bg-gray-200"
          >
            <Text className="text-lg text-slate-800 font-bold">
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
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-3xl p-4 h-1/3">
                <View className="flex-row justify-between items-center mb-10">
                  <Pressable onPress={() => showPicker(false)}>
                    <Text className="text-blue-500 text-lg">Cancel</Text>
                  </Pressable>
                  <Text className="text-lg font-bold">Seleccionar fecha</Text>
                  <Pressable onPress={onValueChange}>
                    <Text className="text-blue-500 text-lg">Done</Text>
                  </Pressable>
                </View>
                <View
                  className="flex-row justify-center items-center"
                  style={{ height: 200 }}
                >
                  <View className="flex-1">
                    {/* <Text className="text-center mb-2 text-slate-600 font-semibold">Año</Text> */}
                    <Picker
                      selectedValue={tempYear}
                      onValueChange={(itemValue) => setTempYear(itemValue)}
                      style={{ color: "#000000" }}
                      itemStyle={{ fontSize: 18, color: "#000000" }}
                    >
                      {yearOptions.map((year) => (
                        <Picker.Item key={year} label={year} value={year} />
                      ))}
                    </Picker>
                  </View>
                  <View className="flex-1">
                    {/* <Text className="text-center mb-2 text-slate-600 font-semibold">Mes</Text> */}
                    <Picker
                      selectedValue={tempMonth}
                      onValueChange={(itemValue) => setTempMonth(itemValue)}
                      style={{ color: "#000000" }}
                      itemStyle={{ fontSize: 18, color: "#000000" }}
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
            style={{ flex: 1 }}
            className="px-4 gap-2"
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
