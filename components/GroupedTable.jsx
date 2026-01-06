import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import EllipsisMenu from "./EllipsisMenu";

// 2. Configuration
const LEFT_COL_WIDTH = "w-40";
// ROW_HEIGHT is only used for styling now, not calculation
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;

// 3. Static styles
const styles = StyleSheet.create({
  rowHeight: { height: ROW_HEIGHT },
  headerHeight: { height: HEADER_HEIGHT },
  // color: { backgroundColor: "#d27a7a" },
});

// 4. Format number helper
const formatNumber = (num) => {
  return parseFloat(num.toFixed(2)).toLocaleString("es-ES");
};

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

export default function GroupedTable() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [text, setText] = useState("");
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const [activeColumns, setActiveColumns] = useState(months);
  const [isLoading, setIsLoading] = useState(true);
  const [showYears, setShowYears] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const scrollingListRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const lastOffsetRef = useRef({ left: 0, right: 0 });

  const years = [2026, 2025, 2024, 2023, 2022, 2021];

  useEffect(() => {
    const fetchGroupedTxns = async () => {
      try {
        const data = await fetch(`${API_URL}/grouped_txns`).then((res) =>
          res.json()
        );
        // console.log("Grouped Txns:", data);
        setData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error fetching grouped txns:", error);
      }
    };
    fetchGroupedTxns();
    setIsLoading(false);
  }, []);

  const monthlyTotals = useMemo(() => {
    return activeColumns.map((month) =>
      filteredData.reduce((sum, item) => sum + item[month], 0)
    );
  }, [filteredData, activeColumns]);

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

  // --- IMPROVED SYNC LOGIC ---
  const handleScroll = useCallback((source, event) => {
    // Prevent recursive syncing
    if (isSyncingRef.current) {
      return;
    }

    // If the other list is the active scroller, ignore this event
    if (isScrollingRef.current && scrollingListRef.current !== source) {
      return;
    }

    // Lock this list as the active scroller
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      scrollingListRef.current = source;
    }

    // Get the offset
    const offset = event.nativeEvent.contentOffset.y;
    const lastOffset = lastOffsetRef.current[source];

    // Only sync if offset has changed significantly (more than 0.5px to avoid micro-adjustments)
    if (Math.abs(offset - lastOffset) < 0.5) {
      return;
    }

    // Update last offset
    lastOffsetRef.current[source] = offset;

    // Sync the OTHER list
    const targetRef = source === "left" ? rightRef : leftRef;
    const targetSource = source === "left" ? "right" : "left";

    // Only sync if target is not already at this offset (prevent feedback loop)
    if (Math.abs(offset - lastOffsetRef.current[targetSource]) > 0.5) {
      isSyncingRef.current = true;
      targetRef.current?.scrollToOffset({ offset, animated: false });
      lastOffsetRef.current[targetSource] = offset;
      // Use setTimeout to reset the flag after the scroll completes
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, []);

  const onLeftScroll = useCallback(
    (event) => {
      handleScroll("left", event);
    },
    [handleScroll]
  );

  const onRightScroll = useCallback(
    (event) => {
      handleScroll("right", event);
    },
    [handleScroll]
  );

  const handleScrollEnd = useCallback(() => {
    isScrollingRef.current = false;
    scrollingListRef.current = null;
    isSyncingRef.current = false;
  }, []);

  const renderHeaderCell = useCallback(
    (label, widthClass = "w-40", key) => (
      <View
        key={key}
        className={`${widthClass} border-r border-b border-slate-200 bg-white justify-center p-3`}
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

  const renderLeftColumnItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedCategories.has(item.categoria);

      return (
        <View>
          <TouchableOpacity
            className={`${LEFT_COL_WIDTH} border-r border-b border-slate-200 justify-center p-3 ${isExpanded ? "bg-slate-50" : ""}`}
            onPress={() => toggleCategory(item.categoria)}
            style={styles.rowHeight}
          >
            <Text
              className={`text-black ${isExpanded ? "font-semibold" : ""}`}
              numberOfLines={1}
            >
              {isExpanded ? "▼ " : "▶ "}
              {item.categoria}
            </Text>
          </TouchableOpacity>
          {isExpanded &&
            item.subcategorias.map((subItem, index) => (
              <View
                key={index}
                className={`${LEFT_COL_WIDTH} border-r border-b border-slate-200 justify-center p-3 pl-6`}
                style={styles.rowHeight}
              >
                <Text className="text-black text-sm" numberOfLines={1}>
                  {subItem?.subcategoria || "(Sin subcategoría)"}
                </Text>
              </View>
            ))}
        </View>
      );
    },
    [expandedCategories, toggleCategory]
  );

  const renderRightColumnsItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedCategories.has(item.categoria);
      const cellWidth = "w-32";

      return (
        <View>
          <View className="flex-row" style={styles.rowHeight}>
            {activeColumns.map((month) => (
              <View
                key={month}
                className={`${cellWidth} border-r border-b border-slate-200 justify-center p-3 ${isExpanded ? "bg-slate-50" : ""}`}
                style={styles.rowHeight}
              >
                <Text className="text-black text-right" numberOfLines={1}>
                  {formatNumber(item[month])}
                </Text>
              </View>
            ))}
          </View>
          {isExpanded &&
            item.subcategorias.map((subItem, index) => (
              <View className="flex-row" key={index} style={styles.rowHeight}>
                {activeColumns.map((month) => (
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
        </View>
      );
    },
    [expandedCategories, activeColumns]
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

  const renderLeftHeader = useCallback(() => {
    return (
      <TouchableOpacity
        className={`${LEFT_COL_WIDTH} border-r border-b border-slate-200 bg-white justify-center p-3`}
        onPress={() => handleSort("categoria")}
        style={styles.headerHeight}
      >
        <Text className="font-bold text-slate-900">
          Name{" "}
          {sortConfig.key === "categoria"
            ? sortConfig.direction === "asc"
              ? "↑"
              : "↓"
            : ""}
        </Text>
      </TouchableOpacity>
    );
  }, [handleSort, sortConfig.key, sortConfig.direction]);

  const renderRightHeader = useCallback(() => {
    const headerCellWidth = "w-32";
    return (
      <View className="flex-row">
        {activeColumns.map((m, index) =>
          renderHeaderCell(m, headerCellWidth, index)
        )}
      </View>
    );
  }, [renderHeaderCell, activeColumns]);

  const renderLeftFooter = useCallback(() => {
    return (
      <View
        className={`${LEFT_COL_WIDTH} border-r-2 border-b border-slate-300 border-r-slate-300 bg-white justify-center p-3`}
        style={styles.headerHeight}
      >
        <Text className="font-bold text-slate-900">Total</Text>
      </View>
    );
  }, []);

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

  const filterData = useCallback(
    (text) => {
      console.log("Filtering data with text:", text);
      const result = data.filter((item) =>
        item.categoria.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(result);
    },
    [data]
  );

  const handleColumns = (item) => {
    setActiveColumns((prev) => {
      const prevMonths = new Set(prev);
      if (prevMonths.has(item)) {
        prevMonths.delete(item);
      } else {
        prevMonths.add(item);
      }
      return months.filter((col) => prevMonths.has(col));
    });
  };

  return (
    <View className="flex-1 bg-white px-2">
      <Text className="text-2xl font-bold text-slate-900 mb-2 mt-2 text-center">
        Ingresos y gastos
      </Text>
      <View className="flex-row items-center gap-4 my-3 px-1">
        <EllipsisMenu
          handleColumns={handleColumns}
          activeColumns={activeColumns}
        />
        <TextInput
          className="border border-gray-300 rounded-lg py-3 flex-1 text-black"
          placeholder="Escribe para filtrar categorías..."
          onChangeText={(newText) => filterData(newText)}
          defaultValue={text}
          autoCapitalize="none"
        />
        <View className="flex items-center relative">
          <Pressable
            className="border border-gray-300 rounded-lg p-3 active:bg-gray-200"
            onPress={() => setShowYears(!showYears)}
          >
            <Text className="font-semibold">{selectedYear}</Text>
          </Pressable>
          {showYears && (
            <ScrollView
              className="absolute border border-gray-300 rounded-lg z-10 bg-white"
              style={{ top: "100%" }}
            >
              {years.map((item, index) => (
                <Pressable
                  key={index}
                  className={`p-3 active:bg-gray-200 ${selectedYear === item ? "bg-gray-200" : ""}`}
                  onPress={() => {
                    setSelectedYear(item);
                    setShowYears(!showYears);
                  }}
                >
                  <Text>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      <View className="flex-1 flex-row border border-slate-300 rounded-lg overflow-hidden">
        {/* Frozen Left Column */}
        <View className="z-10 bg-white shadow-lg">
          <FlatList
            ref={leftRef}
            data={filteredData}
            keyExtractor={(item) => item.categoria}
            renderItem={renderLeftColumnItem}
            ListHeaderComponent={renderLeftHeader}
            ListFooterComponent={renderLeftFooter}
            stickyHeaderIndices={[0]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onLeftScroll}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={10}
          />
        </View>
        {/* Scrollable Right Columns */}
        <View className="flex-1" style={{ overflow: "hidden" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View>
              <FlatList
                ref={rightRef}
                data={filteredData}
                keyExtractor={(item) => item.categoria}
                renderItem={renderRightColumnsItem}
                ListHeaderComponent={renderRightHeader}
                ListFooterComponent={renderRightFooter}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onRightScroll}
                onMomentumScrollEnd={handleScrollEnd}
                onScrollEndDrag={handleScrollEnd}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={10}
              />
            </View>
          </ScrollView>
        </View>
        {isLoading && <ActivityIndicator size="small" color="#0a84ff" />}
      </View>
    </View>
  );
}
