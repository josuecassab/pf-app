import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useCategoryGroups } from "../hooks/useCategoryGroups";

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
  const { schema } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const [text, setText] = useState("");
  const [activeColumns, setActiveColumns] = useState(months);
  const [activeRows, setActiveRows] = useState([]);
  const [showYears, setShowYears] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedGroupTab, setSelectedGroupTab] = useState("all");
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategories, setNewGroupCategories] = useState(() => new Set());

  const {
    data: categoryGroups = [],
    mergeGroup,
    deleteGroup,
  } = useCategoryGroups();

  const { isPending, error, data, refetch, isRefetching } = useQuery({
    queryKey: ["grouped_txns", schema, selectedYear],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/grouped_txns?year=${selectedYear}&schema=${schema}`,
      );
      return await response.json();
    },
    enabled: !!schema,
  });

  // When data loads or changes (e.g. year), set activeRows to all categories
  useEffect(() => {
    if (!data) return;
    setActiveRows(data.map((item) => item.categoria));
  }, [data]);

  const handleRows = useCallback((category) => {
    setActiveRows((prev) => {
      const set = new Set(prev);
      if (set.has(category)) {
        set.delete(category);
      } else {
        set.add(category);
      }
      return Array.from(set);
    });
  }, []);

  // filteredData: data filtered by activeRows, then by search text
  const filteredData = useMemo(() => {
    if (!data) return [];
    const byActive =
      activeRows.length === 0
        ? data
        : data.filter((item) => activeRows.includes(item.categoria));
    if (!text.trim()) return byActive;
    return byActive.filter((item) =>
      item.categoria.toLowerCase().includes(text.toLowerCase()),
    );
  }, [data, activeRows, text]);

  const tableData = useMemo(() => {
    if (selectedGroupTab === "all") return filteredData;
    const g = categoryGroups.find(
      (x) => x.grupo_categoria === selectedGroupTab,
    );
    if (!g?.categoria?.length) return filteredData;
    const allowed = new Set(g.categoria);
    return filteredData.filter((item) => allowed.has(item.categoria));
  }, [filteredData, selectedGroupTab, categoryGroups]);

  const rowCategoryOptions = useMemo(
    () => data?.map((d) => d.categoria) ?? [],
    [data],
  );

  const toggleNewGroupCategory = useCallback((categoria) => {
    setNewGroupCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoria)) next.delete(categoria);
      else next.add(categoria);
      return next;
    });
  }, []);

  const openCreateGroupModal = useCallback(() => {
    setNewGroupName("");
    setNewGroupCategories(new Set());
    setGroupModalVisible(true);
  }, []);

  const submitNewGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert("Nombre requerido", "Escribe un nombre para el grupo.");
      return;
    }
    if (newGroupCategories.size === 0) {
      Alert.alert(
        "Categorías requeridas",
        "Selecciona al menos una categoría para el grupo.",
      );
      return;
    }
    mergeGroup.mutate(
      {
        grupo_categoria: name,
        categoria: Array.from(newGroupCategories),
      },
      {
        onSuccess: () => {
          setGroupModalVisible(false);
          setNewGroupName("");
          setNewGroupCategories(new Set());
          setSelectedGroupTab(name);
        },
        onError: (e) =>
          Alert.alert("Error al guardar el grupo", e.message ?? String(e)),
      },
    );
  }, [newGroupName, newGroupCategories, mergeGroup]);

  const handleDeleteGroup = useCallback(
    (grupo_categoria) => {
      Alert.alert(
        "Eliminar grupo",
        `¿Eliminar el grupo «${grupo_categoria}»? Las categorías no se borran.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              deleteGroup.mutate(grupo_categoria, {
                onSuccess: () => {
                  if (selectedGroupTab === grupo_categoria) {
                    setSelectedGroupTab("all");
                  }
                },
                onError: (e) =>
                  Alert.alert("Error al eliminar", e.message ?? String(e)),
              });
            },
          },
        ],
      );
    },
    [deleteGroup, selectedGroupTab],
  );

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
            activeRows={activeRows}
            handleRows={handleRows}
            columnOptions={months}
            rowOptions={data?.map((d) => d.categoria) ?? []}
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
            data={tableData}
            activeColumns={activeColumns}
            onRefresh={refetch}
            refreshing={isRefetching}
            categoryGroups={categoryGroups}
            selectedGroupTab={selectedGroupTab}
            onSelectGroupTab={setSelectedGroupTab}
            onAddGroupPress={openCreateGroupModal}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        <Modal
          visible={groupModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setGroupModalVisible(false)}
        >
          <SafeAreaView
            style={[
              styles.modalRoot,
              { backgroundColor: theme.colors.background },
            ]}
            edges={["top", "bottom"]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Nuevo grupo de categorías
            </Text>
            <Text style={[styles.modalHint, { color: theme.colors.text }]}>
              Mantén pulsado un grupo en la tabla para eliminarlo.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Nombre del grupo"
              placeholderTextColor={theme.colors.placeholder}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoCapitalize="sentences"
            />
            <Text
              style={[styles.modalSectionLabel, { color: theme.colors.text }]}
            >
              Categorías en este año
            </Text>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {rowCategoryOptions.map((cat) => {
                const on = newGroupCategories.has(cat);
                return (
                  <Pressable
                    key={cat}
                    onPress={() => toggleNewGroupCategory(cat)}
                    style={({ pressed }) => [
                      styles.modalRow,
                      {
                        backgroundColor: on
                          ? theme.colors.inputBackground
                          : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                      pressed && styles.modalRowPressed,
                    ]}
                  >
                    <Text style={{ color: theme.colors.text }}>{cat}</Text>
                    <Text style={{ color: theme.colors.primary }}>
                      {on ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setGroupModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={{ color: theme.colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={submitNewGroup}
                disabled={mergeGroup.isPending}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                    opacity: mergeGroup.isPending ? 0.6 : 1,
                  },
                  pressed && !mergeGroup.isPending && styles.modalButtonPressed,
                ]}
              >
                <Text style={{ color: theme.colors.background }}>Guardar</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
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
  modalRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalSectionLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  modalScroll: {
    flex: 1,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalRowPressed: {
    opacity: 0.85,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonPrimary: {},
  modalButtonPressed: {
    opacity: 0.8,
  },
});
