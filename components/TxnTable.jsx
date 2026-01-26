import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import MyCustomModal from "./MyCustomModal";

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

export default function TxnTable({
  table,
  txns,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isPending,
  queryKey,
  refetch,
}) {
  const { theme } = useTheme();
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
        res.json(),
      );
      setCategories(res);
    };
    fetchCategories();
  }, []);

  const columnsWidth = {
    fecha: 98,
    descripcion: 112,
    valor: 112,
    categoria: 112,
    sub_categoria: 112,
    editar: 60,
  };

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

  if (isPending)
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );

  if (error)
    return (
      <Text style={{ color: theme.colors.error, padding: 16 }}>
        An error has occurred: {error.message}
      </Text>
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

  const updateCategory = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_category/?table=${table}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedCategory),
        },
      );
      const result = await res.json();
      console.log("Update result:", result);
      // Reset and refetch the infinite query to clear all cached pages
      await queryClient.resetQueries({
        queryKey,
      });
      if (refetch) {
        await refetch();
      }
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubcategory = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_subcategory/?table=${table}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedSubcategory),
        },
      );
      const result = await res.json();
      console.log("Update result:", result);
      // Reset and refetch the infinite query to clear all cached pages
      await queryClient.resetQueries({
        queryKey: queryKey,
      });
      if (refetch) {
        await refetch();
      }
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

  // Table rendering functions
  const renderHeaderCell = (label, width = 160) => (
    <View
      style={[
        styles.headerCell,
        {
          width,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.headerText, { color: theme.colors.text }]}>
        {label}
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (!columnsWidth) return null;
    return (
      <View style={styles.row}>
        {renderHeaderCell("Fecha", columnsWidth["fecha"])}
        {renderHeaderCell("Descripcion", columnsWidth["descripcion"])}
        {renderHeaderCell("Valor", columnsWidth["valor"])}
        {renderHeaderCell("Categoria", columnsWidth["categoria"])}
        {renderHeaderCell("Sub categoria", columnsWidth["sub_categoria"])}
        {renderHeaderCell("Editar", columnsWidth["editar"])}
      </View>
    );
  };

  const renderCell = (value, width) => (
    <View
      style={[
        styles.cell,
        { width, borderColor: theme.colors.border },
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );

  const renderValorCell = (value, width) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          styles.cell,
          { width, borderColor: theme.colors.border },
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderDescripcionCell = (value, width) => {
    return (
      <View
        style={[
          styles.cell,
          { width, borderColor: theme.colors.border },
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {value && value.toLowerCase()}
        </Text>
      </View>
    );
  };

  const renderCategoryCell = (id, category, width) => {
    return (
      <TouchableHighlight
        style={[
          styles.cell,
          {
            width,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
        onPress={() => handleCategoriaPress(id)}
        underlayColor={theme.colors.inputBackground}
      >
        <View>
          <Text style={[styles.cellText, { color: theme.colors.text }]}>
            {category?.toLowerCase()}
          </Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderSubCategoryCell = (id, category, subCategory, width) => {
    return (
      <TouchableHighlight
        style={[
          styles.cell,
          {
            width,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
        onPress={() => handleSubcategoryPress(id, category)}
        underlayColor={theme.colors.inputBackground}
      >
        <View>
          <Text style={[styles.cellText, { color: theme.colors.text }]}>
            {subCategory?.toLowerCase()}
          </Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderEditCell = (id, width) => {
    return (
      <Pressable
        style={[
          styles.cell,
          styles.editCell,
          {
            width,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
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
            ],
          )
        }
      >
        {({ pressed }) => (
          <MaterialIcons
            name={pressed ? "delete" : "delete-outline"}
            size={24}
            color={theme.colors.text}
          />
        )}
      </Pressable>
    );
  };

  const renderTxns = (item) => {
    if (!columnsWidth) return null;
    return (
      <View style={styles.row}>
        {renderCell(item.fecha, columnsWidth["fecha"])}
        {renderDescripcionCell(item?.descripcion, columnsWidth["descripcion"])}
        {renderValorCell(item.valor, columnsWidth["valor"])}
        {renderCategoryCell(item.id, item.categoria, columnsWidth["categoria"])}
        {renderSubCategoryCell(
          item.id,
          item.categoria,
          item.sub_categoria,
          columnsWidth["sub_categoria"],
        )}
        {renderEditCell(item.id, columnsWidth["editar"])}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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
        onAccept={async () => {
          await updateCategory();
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
        onAccept={async () => {
          await updateSubcategory();
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
        style={[
          styles.scrollView,
          { borderColor: theme.colors.border },
        ]}
      >
        <FlatList
          style={[styles.flatList, { borderColor: theme.colors.border }]}
          keyExtractor={(item) => item.id}
          data={txns}
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
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
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
});
