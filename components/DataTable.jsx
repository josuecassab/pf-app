import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TouchableHighlight, View } from "react-native";

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

export default function DataTable({
  data,
  keyExtractor,
  columnsWidth,
  isFetchingNextPage = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.5,
  stickyHeaderIndices = [0],
  refreshControlTintColor = "#3b82f6",
  refreshControlColors = ["#3b82f6"],
  flatListClassName = "rounded-2xl border-slate-300",
  // Handlers
  onCategoryPress,
  onSubcategoryPress,
  onDeletePress,
  // Data for handlers
  categories = [],
}) {
  const renderHeaderCell = (label, widthClass = "w-40") => (
    <View
      className={`${widthClass} border-b border-r justify-center p-2 border-slate-300 bg-white`}
    >
      <Text className="font-bold text-slate-800 text-right">{label}</Text>
    </View>
  );

  const renderHeader = () => {
    if (!columnsWidth) return null;
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

  const renderCategoryCell = (id, category, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => onCategoryPress?.(id)}
        underlayColor="#e2e8f0"
      >
        <View>
          <Text className="text-right">{category?.toLowerCase()}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const renderSubCategoryCell = (id, category, subCategory, widthClass) => {
    return (
      <TouchableHighlight
        className={"border-b border-r p-2 border-slate-300 " + widthClass}
        onPress={() => onSubcategoryPress?.(id, category)}
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
                onPress: () => onDeletePress?.(id),
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
    if (!columnsWidth) return null;
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

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  };

  return (

      <FlatList
        className={flatListClassName}
        keyExtractor={keyExtractor}
        data={data}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => renderTxns(item)}
        stickyHeaderIndices={stickyHeaderIndices}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={refreshControlTintColor}
            colors={refreshControlColors}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListFooterComponent={renderFooter}
      />

  );
}
