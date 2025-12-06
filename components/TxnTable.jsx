import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MyCustomModal from "./MyCustomModal";

export default function TxnTable() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  console.log("API_URL:", API_URL); // Debug log
  const [value, setValue] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  // const [selectedYear, setSelectedYear] = useState(
  //   String(new Date().getFullYear())
  // );
  const [selectedYear, setSelectedYear] = useState(String(2025));
  // const [selectedMonth, setSelectedMonth] = useState(
  //   String(new Date().getMonth() + 1)
  // );
  const [selectedMonth, setSelectedMonth] = useState(String(9));
  const [selectedTxn, setSelectedTxn] = useState({ id: null, category: null });
  const [loading, setLoading] = useState(false);
  const [rawCategories, setRawCategories] = useState({});
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  useEffect(() => {
    console.log("use effect");
    const fetchCategories = async () => {
      const res = await fetch(`${API_URL}/categories`);
      const rawCategories = await res.json();
      console.log(rawCategories);
      setRawCategories(rawCategories);
      setCategories(
        Object.keys(rawCategories).map((item) => ({
          label: item,
          value: item,
        }))
      );
    };
    fetchCategories();
  }, []);
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

  const handleCategoriaPress = (id) => {
    setSelectedTxn({ id: id, category: null });
    setCategoryModalVisible(true);
  };

  const handleSubCategoryPress = (id, category, subCategory) => {
    setSelectedTxn({ id: id, category: category, subCategory: null });
    // Transform subCategories to the format expected by Dropdown
    const subCats = rawCategories[category] || [];
    setSubCategories(
      subCats.map((item) => ({
        label: item,
        value: item,
      }))
    );
    setSubCategoryModalVisible(true);
  };

  const renderCategoriaCell = (id, category, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => handleCategoriaPress(id)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{category.toLowerCase()}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderSubCategoryCell = (id, category, subCategory, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => handleSubCategoryPress(id, category, subCategory)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{subCategory?.toLowerCase()}</Text>
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
        {renderCategoriaCell(
          item.id,
          item.categoria,
          columnsWidth["categoria"]
        )}
        {renderSubCategoryCell(
          item.id,
          item.categoria,
          item.sub_categoria,
          columnsWidth["sub_categoria"]
        )}
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

  const updateCategory = async () => {
    setLoading(true);
    try {
      const txnsToSubmit = selectedTxn;

      const res = await fetch(`${API_URL}/update_txn_category/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txnsToSubmit),
      });
      const result = await res.json();
      console.log("Update result:", result);
      txns.find((txn) => txn.id === selectedTxn.id).categoria =
        selectedTxn.category;
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="px-4">
      <MyCustomModal
        labels={categories}
        value={selectedTxn.category}
        onChange={(item) => {
          setSelectedTxn({ id: selectedTxn.id, category: item.value });
        }}
        onAccept={() => {
          console.log(selectedTxn);
          updateCategory();
          setCategoryModalVisible(!categoryModalVisible);
        }}
        visible={categoryModalVisible}
        SetModalFunc={() => setCategoryModalVisible(!categoryModalVisible)}
      />
      <MyCustomModal
        labels={subCategories}
        value={selectedTxn.subCategory}
        onChange={(item) => {
          setSelectedTxn({ id: selectedTxn.id, subCategory: item.value });
        }}
        onAccept={() => {
          console.log(selectedTxn);
          updateCategory();
          setSubCategoryModalVisible(!subCategoryModalVisible);
        }}
        visible={subCategoryModalVisible}
        SetModalFunc={() =>
          setSubCategoryModalVisible(!subCategoryModalVisible)
        }
      />
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
