import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EllipsisMenu from "../components/EllipsisMenu";
import GroupedTable from "../components/GroupedTable";
import { useTheme } from "../contexts/ThemeContext";

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
  "total",
];

const years = [2026, 2025, 2024, 2023, 2022, 2021];

export default function Summary() {
  const { theme } = useTheme();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const [text, setText] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [activeColumns, setActiveColumns] = useState(months);
  const [showYears, setShowYears] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { isPending, error, data, refetch, isRefetching } = useQuery({
    queryKey: [selectedYear],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/grouped_txns?year=${selectedYear}`,
      );
      return await response.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    const result = text
      ? data.filter((item) =>
          item.categoria.toLowerCase().includes(text.toLowerCase()),
        )
      : data;
    setFilteredData(result);
  }, [data, text]);

  const filterData = useCallback((searchText) => {
    setText(searchText);
  }, []);

  const handleColumns = useCallback((item) => {
    setActiveColumns((prev) => {
      const prevMonths = new Set(prev);
      if (prevMonths.has(item)) {
        prevMonths.delete(item);
      } else {
        prevMonths.add(item);
      }
      return months.filter((col) => prevMonths.has(col));
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Ingresos y gastos
        </Text>
        <View style={styles.controlsRow}>
          <EllipsisMenu
            handleColumns={handleColumns}
            activeColumns={activeColumns}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Escribe para filtrar categorías..."
            placeholderTextColor={theme.colors.placeholder}
            onChangeText={filterData}
            value={text}
            autoCapitalize="none"
          />
          <View style={styles.yearSelector}>
            <Pressable
              style={({ pressed }) => [
                styles.yearButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                pressed && styles.yearButtonPressed,
              ]}
              onPress={() => setShowYears(!showYears)}
            >
              <Text
                style={[styles.yearButtonText, { color: theme.colors.text }]}
              >
                {selectedYear}
              </Text>
            </Pressable>
            {showYears && (
              <ScrollView
                style={[
                  styles.yearDropdown,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {years.map((item, index) => (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.yearOption,
                      {
                        backgroundColor:
                          selectedYear === item
                            ? theme.colors.inputBackground
                            : "transparent",
                      },
                      pressed && styles.yearOptionPressed,
                    ]}
                    onPress={() => {
                      setSelectedYear(item);
                      setShowYears(false);
                    }}
                  >
                    <Text style={{ color: theme.colors.text }}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
        {isPending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
        {error && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            An error has occurred: {error.message}
          </Text>
        )}
        {!isPending && !error && (
          <GroupedTable
            data={filteredData}
            activeColumns={activeColumns}
            onRefresh={refetch}
            refreshing={isRefetching}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: "space-between",
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
    // flex: 0,
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
    top: "100%",
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
  },
  yearOption: {
    padding: 12,
  },
  yearOptionPressed: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    padding: 16,
    textAlign: "center",
  },
});
