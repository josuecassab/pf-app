import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import data from "./sample_grouped_txns.json";

// 1. Sample Data
const DATA = data;

// 2. Configuration
const LEFT_COL_WIDTH = "w-40";
const ROW_HEIGHT = 40; // Fixed height is helpful for perfect alignment, but flex works too
const HEADER_HEIGHT = 40;

// 3. Static styles - created once, not on every render
const styles = StyleSheet.create({
  rowHeight: { height: ROW_HEIGHT },
  headerHeight: { height: HEADER_HEIGHT },
});

// 4. Format number helper - memoize formatted values
const formatNumber = (num) => {
  return parseFloat(num.toFixed(2)).toLocaleString("es-ES");
};

export default function DataTable() {
  // Refs for syncing vertical scroll
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [text, setText] = useState("");
  const [filteredData, setFilteredData] = useState(DATA);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  // Use ref instead of state to prevent re-renders on every scroll
  const scrollingListRef = useRef(null);
  const isScrollingRef = useRef(false);

  // Compute monthly totals only when filteredData changes
  const monthlyTotals = useMemo(() => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    return months.map((month) =>
      filteredData.reduce((sum, item) => sum + item[month], 0)
    );
  }, [filteredData]);

  const toggleCategory = useCallback((categoria) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  }, []);

  const handleScroll = useCallback((source, event) => {
    // Ignore if we're already being controlled by the other list
    if (isScrollingRef.current && scrollingListRef.current !== source) {
      return;
    }

    // Set that we're scrolling from this source
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      scrollingListRef.current = source;
    }

    // Sync the other list
    const targetRef = source === "left" ? rightRef : leftRef;
    const offset = event.nativeEvent.contentOffset.y;
    targetRef.current?.scrollToOffset({ offset, animated: false });
  }, []);

  const handleScrollEnd = useCallback(() => {
    isScrollingRef.current = false;
    scrollingListRef.current = null;
  }, []);

  const renderHeaderCell = useCallback(
    (label, widthClass = "w-40") => (
      <View
        className={`${widthClass} border border-slate-200 bg-white justify-center p-3`}
        style={styles.headerHeight}
      >
        <Text className="font-bold text-slate-800 text-right">{label}</Text>
      </View>
    ),
    []
  );

  const renderFooterCell = useCallback(
    (label, widthClass = "w-40", key) => (
      <View
        key={key}
        className={`${widthClass} border border-slate-200 bg-white justify-center p-3`}
        style={styles.headerHeight}
      >
        <Text className="font-bold text-slate-800 text-right">{label}</Text>
      </View>
    ),
    []
  );

  // --- LEFT COLUMN (PINNED) ---
  const renderLeftItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedCategories.has(item.categoria);

      return (
        <>
          <View
            className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-200 border-r-slate-300 justify-center p-3 ${isExpanded ? "bg-slate-50" : ""}`}
            style={styles.rowHeight}
          >
            <TouchableOpacity onPress={() => toggleCategory(item.categoria)}>
              <Text
                className={`text-black ${isExpanded ? "font-semibold" : ""}`}
                numberOfLines={1}
              >
                {isExpanded ? "▼ " : "▶ "}
                {item.categoria}
              </Text>
            </TouchableOpacity>
          </View>
          {isExpanded &&
            item.subcategorias.map((subItem, index) => (
              <View
                key={index}
                className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-200 border-r-slate-300 justify-center p-3 pl-6`}
                style={styles.rowHeight}
              >
                <Text className="text-black text-sm" numberOfLines={1}>
                  {subItem?.subcategoria || "(Sin subcategoría)"}
                </Text>
              </View>
            ))}
        </>
      );
    },
    [expandedCategories, toggleCategory]
  );

  const handleSort = useCallback(
    (key) => {
      let direction = "asc";

      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }

      const sortedData = [...filteredData].sort((a, b) => {
        if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
        if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
        return 0;
      });

      setSortConfig({ key, direction });
      setFilteredData(sortedData);
    },
    [filteredData, sortConfig.key, sortConfig.direction]
  );

  const renderLeftHeader = useCallback(
    () => (
      <View
        className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-300 border-r-slate-300 bg-white justify-center p-3`}
        style={styles.headerHeight}
      >
        <TouchableOpacity onPress={() => handleSort("categoria")}>
          <Text className="font-bold text-slate-900">
            Name{" "}
            {sortConfig.key === "categoria"
              ? sortConfig.direction === "asc"
                ? "↑"
                : "↓"
              : ""}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleSort, sortConfig.key, sortConfig.direction]
  );

  const renderLeftFooter = useCallback(
    () => (
      <View
        className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-300 border-r-slate-300 bg-white justify-center p-3`}
        style={styles.headerHeight}
      >
        <Text className="font-bold text-slate-900">Total</Text>
      </View>
    ),
    []
  );

  // --- RIGHT COLUMNS (SCROLLABLE) ---
  const renderRightItem = useCallback(
    ({ item }) => {
      const cellWidth = "w-32";
      const isExpanded = expandedCategories.has(item.categoria);
      const months = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];

      if (!isExpanded) {
        // Show only the category row
        return (
          <View className="flex-row">
            {months.map((month) => (
              <View
                key={month}
                className={`${cellWidth} border-r border-b border-slate-200 justify-center p-3`}
                style={styles.rowHeight}
              >
                <Text className="text-black text-right" numberOfLines={1}>
                  {formatNumber(item[month])}
                </Text>
              </View>
            ))}
          </View>
        );
      } else {
        // Show category row + subcategory rows
        return (
          <>
            {/* Category total row */}
            <View className="flex-row">
              {months.map((month) => (
                <View
                  key={month}
                  className={`${cellWidth} border-r border-b border-slate-200 justify-center p-3 bg-slate-50`}
                  style={styles.rowHeight}
                >
                  <Text
                    className="text-black text-right font-semibold"
                    numberOfLines={1}
                  >
                    {formatNumber(item[month])}
                  </Text>
                </View>
              ))}
            </View>
            {/* Subcategory rows */}
            {item.subcategorias.map((subItem, subIndex) => (
              <View key={subIndex} className="flex-row">
                {months.map((month) => (
                  <View
                    key={month}
                    className={`${cellWidth} border-r border-b border-slate-200 justify-center p-3`}
                    style={styles.rowHeight}
                  >
                    <Text className="text-black text-right" numberOfLines={1}>
                      {formatNumber(subItem[month])}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        );
      }
    },
    [expandedCategories]
  );

  const renderRightHeader = useCallback(() => {
    const headerCellWidth = "w-32";
    return (
      <View className="flex-row">
        {renderHeaderCell("Enero", headerCellWidth)}
        {renderHeaderCell("Febrero", headerCellWidth)}
        {renderHeaderCell("Marzo", headerCellWidth)}
        {renderHeaderCell("Abril", headerCellWidth)}
        {renderHeaderCell("Mayo", headerCellWidth)}
        {renderHeaderCell("Junio", headerCellWidth)}
        {renderHeaderCell("Julio", headerCellWidth)}
        {renderHeaderCell("Agosto", headerCellWidth)}
        {renderHeaderCell("Septiembre", headerCellWidth)}
        {renderHeaderCell("Octubre", headerCellWidth)}
        {renderHeaderCell("Noviembre", headerCellWidth)}
        {renderHeaderCell("Diciembre", headerCellWidth)}
      </View>
    );
  }, [renderHeaderCell]);

  const renderRightFooter = useCallback(() => {
    const headerCellWidth = "w-32";

    return (
      <View className="flex-row">
        {monthlyTotals.map((total, index) =>
          renderFooterCell(formatNumber(total), headerCellWidth, index)
        )}
      </View>
    );
  }, [monthlyTotals, renderFooterCell]);

  const filterData = useCallback((text) => {
    console.log("Filtering data with text:", text);

    const result = DATA.filter((item) =>
      item.categoria.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredData(result);
  }, []);

  // Optimize FlatList virtualization with getItemLayout
  const getItemLayout = useCallback(
    (data, index) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View className="flex-1 bg-white px-2">
      <Text className="text-2xl font-bold text-slate-900 mb-2 mt-2 text-center">
        Ingresos y gastos
      </Text>
      <View>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4"
          placeholder="Escribe para filtrar categorías..."
          onChangeText={(newText) => filterData(newText)}
          defaultValue={text}
        />
      </View>

      <View className="flex-1 flex-row border border-slate-300 rounded-lg overflow-hidden">
        <View className="z-10 bg-white shadow-lg">
          <FlatList
            ref={leftRef}
            data={filteredData}
            keyExtractor={(item) => item.categoria}
            renderItem={renderLeftItem}
            ListHeaderComponent={renderLeftHeader}
            ListFooterComponent={renderLeftFooter}
            stickyHeaderIndices={[0]} // Freezes Vertical Header
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => handleScroll("left", e)}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={10}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <FlatList
            ref={rightRef}
            data={filteredData}
            keyExtractor={(item) => item.categoria}
            renderItem={renderRightItem}
            ListHeaderComponent={renderRightHeader}
            ListFooterComponent={renderRightFooter}
            stickyHeaderIndices={[0]} // Freezes Vertical Header
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={(e) => handleScroll("right", e)}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={10}
          />
        </ScrollView>
      </View>
    </View>
  );
}
