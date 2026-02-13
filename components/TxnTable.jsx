import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import DropdownModal from "./DropdownModal";
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
  categories,
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
  const [subCategories, setSubCategories] = useState([]);
  const [headerDropdownVisible, setHeaderDropdownVisible] = useState(false);
  const [headerDropdownLabel, setHeaderDropdownLabel] = useState("");
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterSubcategory, setFilterSubcategory] = useState(null);
  const [filterDate, setFilterDate] = useState(null);

  const allSubcategories = useMemo(
    () =>
      (categories || [])
        .flatMap((c) => c.sub_categorias || [])
        .filter(Boolean) ?? [],
    [categories],
  );

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
      if (!res.ok) return;
      // Update the infinite query cache with the new category for this txn
      const { id, label } = selectedCategory;
      if (id != null && label != null) {
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) =>
              Array.isArray(page)
                ? page.map((txn) =>
                    txn.id === id ? { ...txn, categoria: label } : txn,
                  )
                : page,
            ),
          };
        });
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
      if (!res.ok) return;
      // Update the infinite query cache with the new subcategory for this txn
      const { id, label } = selectedSubcategory;
      if (id != null && label != null) {
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) =>
              Array.isArray(page)
                ? page.map((txn) =>
                    txn.id === id ? { ...txn, sub_categoria: label } : txn,
                  )
                : page,
            ),
          };
        });
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

  // Table rendering functions — column widths come from StyleSheet only
  const headerColumnStyle = {
    Fecha: styles.colFecha,
    Descripcion: styles.colDescripcion,
    Valor: styles.colValor,
    Categoria: styles.colCategoria,
    Subcategoria: styles.colSubCategoria,
    Editar: styles.colEditar,
  };

  const renderHeaderCell = (label) => (
    <Pressable
      style={[headerColumnStyle[label]]}
      onPress={() => {
        setHeaderDropdownLabel(label);
        setHeaderDropdownVisible(true);
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.headerCell,
            styles[`col${label}`],
            {
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.row}>
      {renderHeaderCell("Fecha")}
      {renderHeaderCell("Descripcion")}
      {renderHeaderCell("Valor")}
      {renderHeaderCell("Categoria")}
      {renderHeaderCell("Subcategoria")}
      {renderHeaderCell("Banco")}
      {renderHeaderCell("Editar")}
    </View>
  );

  const renderCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colFecha,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );

  const renderValorCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          styles.cell,
          styles.colValor,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderDescripcionCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colDescripcion,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderCategoryCell = (id, category) => (
    <TouchableHighlight
      style={[
        styles.cell,
        styles.colCategoria,
        {
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

  const renderSubCategoryCell = (id, category, subCategory) => (
    <TouchableHighlight
      style={[
        styles.cell,
        styles.colSubCategoria,
        {
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

  const renderBancoCell = (value) => (
    <View
      style={[
        styles.cell,
        styles.colBanco,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text
        style={[styles.cellText, { color: theme.colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderEditCell = (id) => (
    <Pressable
      style={[
        styles.cell,
        styles.editCell,
        styles.colEditar,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
      onPress={() =>
        Alert.alert(
          "Eliminar",
          "Está seguro que desea eliminar la transaccion",
          [{ text: "No" }, { text: "Si", onPress: () => deleteTxn(id) }],
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

  const renderTxns = (item) => (
    <View style={styles.row}>
      {renderCell(item.fecha)}
      {renderDescripcionCell(item?.descripcion)}
      {renderValorCell(item.valor)}
      {renderCategoryCell(item.id, item.categoria)}
      {renderSubCategoryCell(item.id, item.categoria, item.sub_categoria)}
      {renderBancoCell(item.banco)}
      {renderEditCell(item.id)}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  };

  const filteredTxns = (() => {
    let list = txns;
    if (filterDate?.year && filterDate?.month) {
      const prefix = `${filterDate.year}-${String(filterDate.month).padStart(2, "0")}`;
      list = list.filter(
        (item) => item.fecha && String(item.fecha).startsWith(prefix),
      );
    }
    if (filterCategory) {
      list = list.filter(
        (item) =>
          item.categoria?.toLowerCase() === filterCategory.label?.toLowerCase(),
      );
    }
    if (filterSubcategory) {
      list = list.filter(
        (item) =>
          item.sub_categoria?.toLowerCase() ===
          filterSubcategory.label?.toLowerCase(),
      );
    }
    return list;
  })();

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
      <DropdownModal
        visible={headerDropdownVisible}
        onClose={() => setHeaderDropdownVisible(false)}
        title={headerDropdownLabel}
        cancelLabel="Cerrar"
        data={
          headerDropdownLabel === "Categoria"
            ? categories
            : headerDropdownLabel === "Subcategoria"
              ? allSubcategories
              : undefined
        }
        placeholder={
          headerDropdownLabel === "Subcategoria"
            ? "Seleccionar subcategoría"
            : "Seleccionar categoría"
        }
        searchPlaceholder={
          headerDropdownLabel === "Subcategoria"
            ? "Buscar subcategoría..."
            : "Buscar categoría..."
        }
        value={
          headerDropdownLabel === "Subcategoria"
            ? (filterSubcategory?.value ?? null)
            : (filterCategory?.value ?? null)
        }
        pickerValue={filterDate}
        onChange={(item) => {
          if (headerDropdownLabel === "Categoria") {
            setFilterCategory({
              label: item.label,
              value: item.value,
              sub_categorias: item.sub_categorias,
            });
          } else if (headerDropdownLabel === "Subcategoria") {
            setFilterSubcategory({
              label: item.label,
              value: item.value,
            });
          } else if (
            headerDropdownLabel === "Fecha" &&
            item?.year &&
            item?.month
          ) {
            setFilterDate({ year: item.year, month: item.month });
          }
          setHeaderDropdownVisible(false);
        }}
        type={
          headerDropdownLabel === "Categoria" ||
          headerDropdownLabel === "Subcategoria"
            ? "dropdown"
            : "picker"
        }
      />
      {(filterCategory || filterDate || filterSubcategory) && (
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
              <Text
                style={[styles.filterChipText, { color: theme.colors.text }]}
              >
                Fecha: {String(filterDate.month).padStart(2, "0")}/
                {filterDate.year}
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
              <Text
                style={[styles.filterChipText, { color: theme.colors.text }]}
              >
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
              <Text
                style={[styles.filterChipText, { color: theme.colors.text }]}
              >
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
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={[styles.scrollView, { borderColor: theme.colors.border }]}
      >
        <FlatList
          style={[styles.flatList, { borderColor: theme.colors.border }]}
          keyExtractor={(item) => item.id}
          data={filteredTxns}
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
  colFecha: { width: 99 },
  colDescripcion: { width: 112 },
  colValor: { width: 112 },
  colCategoria: { width: 112 },
  colSubCategoria: { width: 112 },
  colBanco: { width: 80 },
  colEditar: { width: 60 },
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
