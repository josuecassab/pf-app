import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text } from "react-native";
import DataTable from "./DataTable";
import MyCustomModal from "./MyCustomModal";

export default function TxnTable({ selectedYear, selectedMonth }) {
  console.log(selectedYear, selectedMonth);
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const queryClient = useQueryClient();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({});
  const [selectedSubcategory, setSelectedSubcategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

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

  const handleCategoriaPress = (id) => {
    setSelectedCategory({ id: id, label: null, value: null });
    setCategoryModalVisible(true);
  };

  const handleSubcategoryPress = (id, category) => {
    setSelectedSubcategory({ id: id, label: null, value: null });
    const subCategories =
      categories.filter((item) => item.label === category)[0]?.sub_categorias ||
      [];
    setSubCategories(subCategories);
    setSubCategoryModalVisible(true);
  };

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>An error has occurred: {error.message}</Text>;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleLoadRecent = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ["txns", selectedYear, selectedMonth],
    });
    setRefreshing(false);
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

  return (
    <>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        className="border border-slate-300 rounded-2xl"
      >
        <DataTable
          data={txns}
          keyExtractor={(item) => item.id}
          columnsWidth={columnsWidth}
          isFetchingNextPage={isFetchingNextPage}
          refreshing={refreshing}
          onRefresh={handleLoadRecent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          stickyHeaderIndices={[0]}
          onCategoryPress={handleCategoriaPress}
          onSubcategoryPress={handleSubcategoryPress}
          onDeletePress={deleteTxn}
          categories={categories}
        />
      </ScrollView>
    </>
  );
}
