import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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
import GroupedTable from "../../components/GroupedTable";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useCategories } from "../../hooks/useCategories";
import { useCategoryGroups } from "../../hooks/useCategoryGroups";

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

/** Category label on a group member from GET /groups/ (shape varies by API). */
function groupCategoryLabel(c) {
  if (c == null) return "";
  if (typeof c === "string") return c.trim();
  const nested = c.category ?? c.categoria;
  return String(
    c.name ??
      c.label ??
      c.nombre ??
      nested?.name ??
      nested?.label ??
      "",
  ).trim();
}

/** Category id on a group member from GET /groups/ (shape varies by API). */
function groupCategoryMemberId(c) {
  if (c == null) return null;
  const raw =
    c.id ??
    c.category_id ??
    c.categoryId ??
    c.category?.id ??
    c.categoria?.id;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function initialCategoryIdsForGroupModal(group) {
  const raw = group?.category_ids;
  if (Array.isArray(raw) && raw.length) {
    return new Set(
      raw.map((id) => {
        const n = Number(id);
        return Number.isFinite(n) ? n : id;
      }),
    );
  }
  const next = new Set();
  for (const c of group?.categories ?? []) {
    const id = groupCategoryMemberId(c);
    if (id != null) next.add(id);
  }
  return next;
}

export default function Summary() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const [text, setText] = useState("");
  const [showYears, setShowYears] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedGroupTab, setSelectedGroupTab] = useState("all");
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategories, setNewGroupCategories] = useState(() => new Set());

  const {
    data: categoryGroups = [],
    createGroup,
    updateGroup,
    deleteGroup,
  } = useCategoryGroups();
  const { data: categoriesData } = useCategories();

  const { isPending, error, data, refetch, isRefetching } = useQuery({
    queryKey: ["grouped_txns", tenantId, selectedYear],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/grouped_txns/?year=${selectedYear}`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) {
        const t = await response.text();
        throw new Error(t || response.statusText);
      }
      return await response.json();
    },
    enabled: !!tenantId,
  });

  /** Align with TxnTable / API: rows use categoria; GroupedTable reads category. */
  const baseRows = useMemo(() => {
    if (!data) return [];
    return data.map((row) => {
      const cat = row.categoria ?? row.category ?? "";
      return { ...row, categoria: cat, category: cat };
    });
  }, [data]);

  const filteredData = useMemo(() => {
    if (!baseRows.length) return [];
    if (!text.trim()) return baseRows;
    const q = text.toLowerCase();
    return baseRows.filter((item) =>
      String(item.categoria ?? "").toLowerCase().includes(q),
    );
  }, [baseRows, text]);

  const tableData = useMemo(() => {
    if (selectedGroupTab === "all") return filteredData;
    const g = categoryGroups.find(
      (x) => Number(x.id) === Number(selectedGroupTab),
    );
    const names = (g?.categories ?? [])
      .map(groupCategoryLabel)
      .filter(Boolean);
    if (!names.length) return filteredData;
    const allowedLower = new Set(names.map((n) => n.toLowerCase()));
    return filteredData.filter((item) =>
      allowedLower.has(String(item.categoria ?? "").toLowerCase()),
    );
  }, [filteredData, selectedGroupTab, categoryGroups]);

  const rowCategoryOptions = useMemo(() => {
    return (categoriesData ?? [])
      .map((c) => {
        const raw = c?.id ?? c?.value;
        if (raw == null || raw === "") return null;
        const n = Number(raw);
        const id = Number.isFinite(n) ? n : raw;
        return { id, label: c.label };
      })
      .filter(Boolean);
  }, [categoriesData]);

  const toggleNewGroupCategory = useCallback((categoryId) => {
    setNewGroupCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const closeGroupModal = useCallback(() => {
    setGroupModalVisible(false);
    setEditingGroupId(null);
    setNewGroupName("");
    setNewGroupCategories(new Set());
  }, []);

  const openCreateGroupModal = useCallback(() => {
    setEditingGroupId(null);
    setNewGroupName("");
    setNewGroupCategories(new Set());
    setGroupModalVisible(true);
  }, []);

  const openEditGroupModal = useCallback((group) => {
    const gid = group?.id;
    if (gid == null) return;
    const n = Number(gid);
    setEditingGroupId(Number.isFinite(n) ? n : gid);
    setNewGroupName(String(group?.name ?? "").trim());
    setNewGroupCategories(initialCategoryIdsForGroupModal(group));
    setGroupModalVisible(true);
  }, []);

  const submitGroupModal = useCallback(() => {
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
    const category_ids = Array.from(newGroupCategories).map((id) => {
      const n = Number(id);
      return Number.isFinite(n) ? n : id;
    });
    if (category_ids.length === 0) {
      Alert.alert(
        "Categorías no válidas",
        "No se pudieron resolver los ids de las categorías seleccionadas.",
      );
      return;
    }
    if (editingGroupId != null) {
      updateGroup.mutate(
        { id: editingGroupId, name, category_ids },
        {
          onSuccess: () => {
            closeGroupModal();
            setSelectedGroupTab(Number(editingGroupId));
          },
          onError: (e) =>
            Alert.alert("Error al guardar el grupo", e.message ?? String(e)),
        },
      );
      return;
    }
    createGroup.mutate(
      { name, category_ids },
      {
        onSuccess: (created) => {
          closeGroupModal();
          if (created != null && created.id != null) {
            setSelectedGroupTab(Number(created.id));
          }
        },
        onError: (e) =>
          Alert.alert("Error al guardar el grupo", e.message ?? String(e)),
      },
    );
  }, [
    newGroupName,
    newGroupCategories,
    editingGroupId,
    createGroup,
    updateGroup,
    closeGroupModal,
    setSelectedGroupTab,
  ]);

  const handleDeleteGroup = useCallback(
    (group) => {
      const { id, name: groupName } = group;
      Alert.alert(
        "Eliminar grupo",
        `¿Eliminar el grupo «${groupName}»? Las categorías no se borran.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              deleteGroup.mutate(id, {
                onSuccess: () => {
                  if (Number(selectedGroupTab) === Number(id)) {
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

  const handleGroupLongPress = useCallback(
    (group) => {
      Alert.alert(String(group?.name ?? "Grupo"), undefined, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Editar",
          onPress: () => openEditGroupModal(group),
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => handleDeleteGroup(group),
        },
      ]);
    },
    [openEditGroupModal, handleDeleteGroup],
  );

  const filterData = useCallback((searchText) => {
    setText(searchText);
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
            activeColumns={months}
            onRefresh={refetch}
            refreshing={isRefetching}
            categoryGroups={categoryGroups}
            selectedGroupTab={selectedGroupTab}
            onSelectGroupTab={setSelectedGroupTab}
            onAddGroupPress={openCreateGroupModal}
            onGroupLongPress={handleGroupLongPress}
          />
        )}

        <Modal
          visible={groupModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeGroupModal}
        >
          <SafeAreaView
            style={[
              styles.modalRoot,
              { backgroundColor: theme.colors.background },
            ]}
            edges={["top", "bottom"]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingGroupId != null
                ? "Editar grupo de categorías"
                : "Nuevo grupo de categorías"}
            </Text>
            <Text style={[styles.modalHint, { color: theme.colors.text }]}>
              Mantén pulsado un grupo en las pestañas para editarlo o eliminarlo.
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
              Categorías
            </Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {rowCategoryOptions.map((cat) => {
                const on = newGroupCategories.has(cat.id);
                return (
                  <Pressable
                    key={String(cat.id)}
                    onPress={() => toggleNewGroupCategory(cat.id)}
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
                    <Text style={{ color: theme.colors.text }}>{cat.label}</Text>
                    <Text style={{ color: theme.colors.primary }}>
                      {on ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={closeGroupModal}
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
                onPress={submitGroupModal}
                disabled={createGroup.isPending || updateGroup.isPending}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                    opacity:
                      createGroup.isPending || updateGroup.isPending ? 0.6 : 1,
                  },
                  pressed &&
                    !createGroup.isPending &&
                    !updateGroup.isPending &&
                    styles.modalButtonPressed,
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
