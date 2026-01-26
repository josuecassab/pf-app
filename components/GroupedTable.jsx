import { useQuery } from "@tanstack/react-query";
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
import { useTheme } from "../contexts/ThemeContext";
import EllipsisMenu from "./EllipsisMenu";

// 2. Configuration
const LEFT_COL_WIDTH = 160; // w-40 = 160px
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
  const { theme } = useTheme();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [text, setText] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const [activeColumns, setActiveColumns] = useState(months);
  const [showYears, setShowYears] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const scrollingListRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const lastOffsetRef = useRef({ left: 0, right: 0 });

  const years = [2026, 2025, 2024, 2023, 2022, 2021];

  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [selectedYear],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/grouped_txns?year=${selectedYear}`
      );
      return await response.json();
    },
  });

  useEffect(() => {
    if (data) {
      setFilteredData(data);
    }
  }, [data]);

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
    (label, width = 160, key) => (
      <View
        key={key}
        style={[
          groupedTableStyles.headerCell,
          {
            width,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          styles.headerHeight,
        ]}
      >
        <Text
          style={[groupedTableStyles.headerText, { color: theme.colors.text }]}
        >
          {label}
        </Text>
      </View>
    ),
    [theme]
  );

  const renderFooterCell = useCallback(
    (label, width = 160, key) => (
      <View
        key={key}
        style={[
          groupedTableStyles.footerCell,
          {
            width,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          styles.headerHeight,
        ]}
      >
        <Text
          style={[groupedTableStyles.headerText, { color: theme.colors.text }]}
        >
          {label}
        </Text>
      </View>
    ),
    [theme]
  );

  const renderLeftColumnItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedCategories.has(item.categoria);

      return (
        <View>
          <TouchableOpacity
            style={[
              groupedTableStyles.leftCell,
              {
                width: LEFT_COL_WIDTH,
                borderColor: theme.colors.border,
                backgroundColor: isExpanded
                  ? theme.colors.card
                  : theme.colors.background,
              },
              styles.rowHeight,
            ]}
            onPress={() => toggleCategory(item.categoria)}
          >
            <Text
              style={[
                groupedTableStyles.leftCellText,
                { color: theme.colors.text },
                isExpanded && groupedTableStyles.leftCellTextExpanded,
              ]}
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
                style={[
                  groupedTableStyles.leftSubCell,
                  {
                    width: LEFT_COL_WIDTH,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                  styles.rowHeight,
                ]}
              >
                <Text
                  style={[
                    groupedTableStyles.leftSubCellText,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {subItem?.sub_categoria || "(Sin subcategoría)"}
                </Text>
              </View>
            ))}
        </View>
      );
    },
    [expandedCategories, toggleCategory, theme]
  );

  const renderRightColumnsItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedCategories.has(item.categoria);
      const cellWidth = "w-32";

      const cellWidthNum = 128; // w-32 = 128px
      return (
        <View>
          <View style={[groupedTableStyles.row, styles.rowHeight]}>
            {activeColumns.map((month) => (
              <View
                key={month}
                style={[
                  groupedTableStyles.rightCell,
                  {
                    width: cellWidthNum,
                    borderColor: theme.colors.border,
                    backgroundColor: isExpanded
                      ? theme.colors.card
                      : theme.colors.background,
                  },
                  styles.rowHeight,
                ]}
              >
                <Text
                  style={[
                    groupedTableStyles.rightCellText,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {formatNumber(item[month])}
                </Text>
              </View>
            ))}
          </View>
          {isExpanded &&
            item.subcategorias.map((subItem, index) => (
              <View
                key={index}
                style={[groupedTableStyles.row, styles.rowHeight]}
              >
                {activeColumns.map((month) => (
                  <View
                    key={month}
                    style={[
                      groupedTableStyles.rightCell,
                      {
                        width: cellWidthNum,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                      },
                      styles.rowHeight,
                    ]}
                  >
                    <Text
                      style={[
                        groupedTableStyles.rightCellText,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {formatNumber(subItem[month])}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
        </View>
      );
    },
    [expandedCategories, activeColumns, theme]
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
        style={[
          groupedTableStyles.leftHeader,
          {
            width: LEFT_COL_WIDTH,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          styles.headerHeight,
        ]}
        onPress={() => handleSort("categoria")}
      >
        <Text
          style={[groupedTableStyles.leftHeaderText, { color: theme.colors.text }]}
        >
          Name{" "}
          {sortConfig.key === "categoria"
            ? sortConfig.direction === "asc"
              ? "↑"
              : "↓"
            : ""}
        </Text>
      </TouchableOpacity>
    );
  }, [handleSort, sortConfig.key, sortConfig.direction, theme]);

  const renderRightHeader = useCallback(() => {
    const headerCellWidth = 128; // w-32 = 128px
    return (
      <View style={groupedTableStyles.row}>
        {activeColumns.map((m, index) =>
          renderHeaderCell(m, headerCellWidth, index)
        )}
      </View>
    );
  }, [renderHeaderCell, activeColumns]);

  const renderLeftFooter = useCallback(() => {
    return (
      <View
        style={[
          groupedTableStyles.leftFooter,
          {
            width: LEFT_COL_WIDTH,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          styles.headerHeight,
        ]}
      >
        <Text
          style={[groupedTableStyles.leftFooterText, { color: theme.colors.text }]}
        >
          Total
        </Text>
      </View>
    );
  }, [theme]);

  const renderRightFooter = useCallback(() => {
    const headerCellWidth = 128; // w-32 = 128px
    return (
      <View style={groupedTableStyles.row}>
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
    <View
      style={[
        groupedTableStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text style={[groupedTableStyles.title, { color: theme.colors.text }]}>
        Ingresos y gastos
      </Text>
      <View style={groupedTableStyles.controlsRow}>
        <EllipsisMenu
          handleColumns={handleColumns}
          activeColumns={activeColumns}
        />
        <TextInput
          style={[
            groupedTableStyles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Escribe para filtrar categorías..."
          placeholderTextColor={theme.colors.placeholder}
          onChangeText={(newText) => filterData(newText)}
          defaultValue={text}
          autoCapitalize="none"
        />
        <View style={groupedTableStyles.yearSelector}>
          <Pressable
            style={({ pressed }) => [
              groupedTableStyles.yearButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              pressed && groupedTableStyles.yearButtonPressed,
            ]}
            onPress={() => setShowYears(!showYears)}
          >
            <Text
              style={[
                groupedTableStyles.yearButtonText,
                { color: theme.colors.text },
              ]}
            >
              {selectedYear}
            </Text>
          </Pressable>
          {showYears && (
            <ScrollView
              style={[
                groupedTableStyles.yearDropdown,
                {
                  top: "100%",
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {years.map((item, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    groupedTableStyles.yearOption,
                    {
                      backgroundColor:
                        selectedYear === item
                          ? theme.colors.inputBackground
                          : "transparent",
                    },
                    pressed && groupedTableStyles.yearOptionPressed,
                  ]}
                  onPress={() => {
                    setSelectedYear(item);
                    setShowYears(!showYears);
                  }}
                >
                  <Text style={{ color: theme.colors.text }}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      <View
        style={[
          groupedTableStyles.tableContainer,
          { borderColor: theme.colors.border },
        ]}
      >
        {/* Frozen Left Column */}
        <View
          style={[
            groupedTableStyles.leftColumn,
            { backgroundColor: theme.colors.surface },
          ]}
        >
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
        <View style={groupedTableStyles.rightColumn}>
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
        {isPending && (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}
        {error && (
          <Text style={{ color: theme.colors.error }}>
            {"An error has occurred: " + error.message}
          </Text>
        )}
      </View>
    </View>
  );
}

const groupedTableStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 8,
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    paddingHorizontal: 16,
  },
  yearSelector: {
    flex: 0,
    alignItems: "center",
    position: "relative",
  },
  yearButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  yearButtonPressed: {
    opacity: 0.7,
  },
  yearButtonText: {
    fontWeight: "600",
  },
  yearDropdown: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 10,
  },
  yearOption: {
    padding: 12,
  },
  yearOptionPressed: {
    opacity: 0.7,
  },
  tableContainer: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  leftColumn: {
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rightColumn: {
    flex: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  headerText: {
    fontWeight: "bold",
    textAlign: "right",
  },
  footerCell: {
    borderWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  leftCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  leftCellText: {},
  leftCellTextExpanded: {
    fontWeight: "600",
  },
  leftSubCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
    paddingLeft: 24,
  },
  leftSubCellText: {
    fontSize: 14,
  },
  rightCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  rightCellText: {
    textAlign: "right",
  },
  leftHeader: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  leftHeaderText: {
    fontWeight: "bold",
  },
  leftFooter: {
    borderRightWidth: 2,
    borderBottomWidth: 1,
    justifyContent: "center",
    padding: 12,
  },
  leftFooterText: {
    fontWeight: "bold",
  },
});
