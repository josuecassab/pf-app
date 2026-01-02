import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Picker } from "@react-native-picker/picker";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
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
  const queryClient = useQueryClient();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  // const [selectedYear, setSelectedYear] = useState(String(2025));
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  // const [selectedMonth, setSelectedMonth] = useState(String(9));
  const [selectedCategory, setSelectedCategory] = useState({});
  const [selectedSubcategory, setSelectedSubcategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [show, setShow] = useState(false);
  // Initialize date to match selectedYear and selectedMonth (month is 0-indexed)
  const [date, setDate] = useState(new Date(2025, 8)); // September 2025
  const [tempYear, setTempYear] = useState(selectedYear); // Temporary year for picker
  const [tempMonth, setTempMonth] = useState(selectedMonth); // Temporary month for picker

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

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`${API_URL}/categories`).then((res) =>
        res.json()
      );
      setCategories(res);
    };
    fetchCategories();
  }, []);
  // const txns = data;
  const columnsWidth = {
    fecha: "w-[98px]",
    descripcion: "w-36",
    valor: "w-28",
    categoria: "w-28",
    sub_categoria: "w-28",
    editar: "w-[60px]",
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
    // console.log(data.pageParams);
    // console.log(data.pages);
    return data?.pages?.flatMap((page) => page) ?? [];
  }, [data]);

  const onValueChange = useCallback(() => {
    showPicker(false);
    const newDate = new Date(parseInt(tempYear), parseInt(tempMonth) - 1);
    setDate(newDate);
    // Update year and month to trigger refetch with new filters
    setSelectedYear(tempYear);
    setSelectedMonth(tempMonth);
  }, [tempYear, tempMonth, showPicker]);

  // Generate year options (from 2025 to current year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2025; year <= currentYear; year++) {
      years.push(String(year));
    }
    return years;
  }, []);

  // Generate month options
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
        {renderHeaderCell("Editar", columnsWidth["editar"])}
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
        <Text className="text-right">{value && value.toLowerCase()}</Text>
      </View>
    );
  };

  const handleCategoriaPress = (id) => {
    setSelectedCategory({ id: id, label: null, value: null });
    setCategoryModalVisible(true);
  };

  const renderCategoryCell = (id, category, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => handleCategoriaPress(id)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{category?.toLowerCase()}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const handleSubcategoryPress = (id, category) => {
    setSelectedSubcategory({ id: id, label: null, value: null });
    const subCategories =
      categories.filter((item) => item.label === category)[0]?.sub_categorias ||
      [];
    setSubCategories(subCategories);
    setSubCategoryModalVisible(true);
  };

  const renderSubCategoryCell = (id, category, subCategory, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => handleSubcategoryPress(id, category)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{subCategory?.toLowerCase()}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderEditCell = (id, widthClass) => {
    return (
      <Pressable
        className={
          "border-b border-r p-2 border-slate-300 items-center justify-center " +
          widthClass
        }
        onPress={() =>
          Alert.alert(
            "Eliminar",
            "Está seguro que desea eliminar la transaccion",
            [
              {
                text: "No",
              },
              {
                text: "Si",
                onPress: () => deleteTxn(id),
              },
            ]
          )
        }
      >
        {({ pressed }) => (
          <MaterialIcons
            name={pressed ? "delete" : "delete-outline"}
            size={24}
            color="black"
          />
        )}
      </Pressable>
    );
  };

  const renderTxns = (item) => {
    return (
      <View className="flex-row">
        {renderCell(item.fecha, columnsWidth["fecha"])}
        {renderDescripcionCell(item?.descripcion, columnsWidth["descripcion"])}
        {renderValorCell(item.valor, columnsWidth["valor"])}
        {renderCategoryCell(item.id, item.categoria, columnsWidth["categoria"])}
        {renderSubCategoryCell(
          item.id,
          item.categoria,
          item.sub_categoria,
          columnsWidth["sub_categoria"]
        )}
        {renderEditCell(item.id, columnsWidth["editar"])}
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
      const res = await fetch(`${API_URL}/update_txn_category/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedCategory),
      });
      const result = await res.json();
      console.log("Update result:", result);
      // Invalidate and refetch the transactions query
      queryClient.invalidateQueries({
        queryKey: ["txns", selectedYear, selectedMonth],
      });
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubcategory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/update_txn_subcategory/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedSubcategory),
      });
      const result = await res.json();
      console.log("Update result:", result);
      // Invalidate and refetch the transactions query
      queryClient.invalidateQueries({
        queryKey: ["txns", selectedYear, selectedMonth],
      });
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTxn = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/delete_txn/?id=${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await res.json();
      console.log("deleted result:", result);
      // Invalidate and refetch the transactions query to update the UI
      queryClient.invalidateQueries({
        queryKey: ["txns", selectedYear, selectedMonth],
      });
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPressIn = () => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleRefreshPressOut = () => {
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <SafeAreaView style={{ flex: 1 }} className="px-4 gap-2">
      <MyCustomModal
        labels={categories}
        value={selectedCategory.value}
        onChange={(item) => {
          setSelectedCategory({
            id: selectedCategory.id,
            label: item.label,
            value: item.value,
          });
        }}
        onAccept={() => {
          updateCategory();
          setCategoryModalVisible(!categoryModalVisible);
        }}
        visible={categoryModalVisible}
        SetModalFunc={() => setCategoryModalVisible(!categoryModalVisible)}
      />
      <MyCustomModal
        labels={subCategories}
        value={selectedSubcategory.value}
        onChange={(item) => {
          setSelectedSubcategory({
            id: selectedSubcategory.id,
            label: item.label,
            value: item.value,
          });
        }}
        onAccept={() => {
          updateSubcategory();
          setSubCategoryModalVisible(!subCategoryModalVisible);
        }}
        visible={subCategoryModalVisible}
        SetModalFunc={() =>
          setSubCategoryModalVisible(!subCategoryModalVisible)
        }
      />
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
        <Pressable
          className="rounded-2xl px-4 py-2 self-start border border-gray-400 bg-white active:bg-gray-200"
          onPressIn={handleRefreshPressIn}
          onPressOut={handleRefreshPressOut}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <MaterialIcons name="refresh" size={24} color="black" />
          </Animated.View>
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
