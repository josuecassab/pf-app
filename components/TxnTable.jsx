import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";

const labels = [
  { label: "Item 1", value: "1" },
  { label: "Item 2", value: "2" },
  { label: "Item 3", value: "3" },
  { label: "Item 4", value: "4" },
  { label: "Item 5", value: "5" },
  { label: "Item 6", value: "6" },
  { label: "Item 7", value: "7" },
  { label: "Item 8", value: "8" },
];

export default function TxnTable() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  console.log("API_URL:", API_URL); // Debug log
  const [value, setValue] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  // const [selectedYear, setSelectedYear] = useState(
  //   String(new Date().getFullYear())
  // );
  const [selectedYear, setSelectedYear] = useState(String(2025));
  // const [selectedMonth, setSelectedMonth] = useState(
  //   String(new Date().getMonth() + 1)
  // );
  const [selectedMonth, setSelectedMonth] = useState(String(9));

  // const txns = data;
  const columnsWidth = {
    fecha: "w-32",
    descripcion: "w-36",
    valor: "w-28",
    categoria: "w-28",
    sub_categoria: "w-28",
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
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
      
      // Optional: Set a limit (e.g., don't go before year 2020)
      if (prevYear < 2020) {
        return undefined;
      }
      
      return { year: String(prevYear), month: String(prevMonth) };
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Flatten all pages into a single array of transactions
  const txns = useMemo(() => {
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  const renderHeaderCell = (label, widthClass = "w-40") => (
    <View
      className={`${widthClass} border-b border-r justify-center p-2 border-slate-300 bg-white`}
    >
      <Text className="font-bold text-slate-800 text-right">{label}</Text>
    </View>
  );

  const renderHeader = () => {
    return (
      <View className="flex-row">
        {renderHeaderCell("Fecha", columnsWidth["fecha"])}
        {renderHeaderCell("Descripcion", columnsWidth["descripcion"])}
        {renderHeaderCell("Valor", columnsWidth["valor"])}
        {renderHeaderCell("Categoria", columnsWidth["categoria"])}
        {renderHeaderCell("Sub categoria", columnsWidth["sub_categoria"])}
      </View>
    );
  };

  const renderCell = (value, widthClass) => (
    <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
      <Text className="text-right">{value}</Text>
    </View>
  );

  const formatSpanishNumber = (num) => {
    const isNegative = num < 0;
    const absoluteNum = Math.abs(num);

    // Split into integer and decimal parts
    const parts = absoluteNum.toString().split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousands separators (dots for Spanish)
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Build the final number
    let result = formattedInteger;
    if (decimalPart) {
      result += "," + decimalPart;
    }

    return isNegative ? "-" + result : result;
  };

  const renderValorCell = (value, widthClass) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
        <Text className="text-right">{formattedValue}</Text>
      </View>
    );
  };

  const renderDescripcionCell = (value, widthClass) => {
    return (
      <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
        <Text className="text-right">{value.toLowerCase()}</Text>
      </View>
    );
  };

  const renderCategoriaCell = (value, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => setModalVisible(true)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{value.toLowerCase()}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderTxns = (item) => {
    return (
      <View className="flex-row">
        {renderCell(item.fecha, columnsWidth["fecha"])}
        {renderDescripcionCell(item.descripcion, columnsWidth["descripcion"])}
        {renderValorCell(item.valor, columnsWidth["valor"])}
        {renderCategoriaCell(item.categoria, columnsWidth["categoria"])}
        {renderCell(item.sub_categoria, columnsWidth["sub_categoria"])}
      </View>
    );
  };

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>An error has occurred: {error.message}</Text>;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="px-4">
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(!modalVisible);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 m-4 shadow-lg w-80">
            <Text className="text-xl font-bold mb-4 text-slate-800">
              Category Details
            </Text>
            <Text className="text-slate-600 mb-6">
              Select a new category for this transaction.
            </Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={labels}
              search
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select item"
              searchPlaceholder="Search..."
              value={value}
              onChange={(item) => {
                setValue(item.value);
              }}
              // renderLeftIcon={() => (
              //   <AntDesign
              //     style={styles.icon}
              //     color="black"
              //     name="Safety"
              //     size={20}
              //   />
              // )}
            />
            <Pressable
              className="bg-blue-500 rounded-lg p-3"
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Text className="text-white text-center font-semibold">
                Acceptar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View className="border border-slate-300 rounded-2xl">
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <FlatList
            className="rounded-2xl border-slate-300"
            keyExtractor={(item) => item.id}
            data={txns}
            ListHeaderComponent={renderHeader}
            renderItem={({ item }) => renderTxns(item)}
            stickyHeaderIndices={[0]}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          ></FlatList>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    borderBottomColor: "gray",
    borderBottomWidth: 0.5,
  },
  icon: {
    marginRight: 5,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
