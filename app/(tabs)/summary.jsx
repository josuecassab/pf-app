import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupedTable from "../../components/GroupedTable";
import SummaryMonthlyBarChart, {
  SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT,
} from "../../components/SummaryMonthlyBarChart";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useCategories } from "../../hooks/useCategories";
import { useCategoryGroups } from "../../hooks/useCategoryGroups";
import { useSubcategories } from "../../hooks/useSubcategories";

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

const calendarMonths = months.filter((m) => m !== "total");

const years = [2026, 2025, 2024, 2023, 2022, 2021];

function formatSummaryAmount(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "—";
  return parseFloat(n.toFixed(2)).toLocaleString("es-ES");
}

function filterRowsByGroup(rows, selectedGroupTab, categoryGroups) {
  const list = rows ?? [];
  if (selectedGroupTab === "all" || selectedGroupTab == null) return list;
  const g = categoryGroups.find(
    (x) => Number(x.id) === Number(selectedGroupTab),
  );
  const categoryIds = (g?.categories ?? []).map((item) => item.id);
  if (!categoryIds.length) return list;
  const allowed = new Set(categoryIds);
  return list.filter((item) => allowed.has(item.category_id));
}

const CHART_REF_LINE_STORAGE_KEY = "@summary_chart_negative_reference_by_group";
const CHART_REF_LINE_LEGACY_STORAGE_KEY = "@summary_chart_negative_reference";
const DEFAULT_GROUP_TAB_STORAGE_KEY = "@summary_default_group_tab";

function parseStoredGroupTab(raw) {
  if (raw == null) return null;
  if (raw === "all") return "all";
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseReferenceLineInput(text) {
  const cleaned = String(text ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(cleaned);
}

function refLineGroupKey(groupTab) {
  return String(groupTab);
}

function parseStoredReferenceLines(raw) {
  if (raw == null) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed)) {
      return {};
    }
    const next = {};
    for (const [key, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) next[String(key)] = n;
    }
    return next;
  } catch {
    return {};
  }
}

function referenceLineForGroup(storedByGroup, groupTab) {
  const stored = storedByGroup[refLineGroupKey(groupTab)];
  if (Number.isFinite(stored) && stored > 0) return stored;
  return SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT;
}

/** Category label on a group member from GET /groups/ (shape varies by API). */
function groupCategoryLabel(c) {
  if (c == null) return "";
  if (typeof c === "string") return c.trim();
  const nested = c.category ?? c.categoria;
  return String(
    c.name ?? c.label ?? c.nombre ?? nested?.name ?? nested?.label ?? "",
  ).trim();
}

/** Category id on a group member from GET /groups/ (shape varies by API). */
function groupCategoryMemberId(c) {
  if (c == null) return null;
  const raw =
    c.id ?? c.category_id ?? c.categoryId ?? c.category?.id ?? c.categoria?.id;
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
  const [defaultGroupTab, setDefaultGroupTab] = useState(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategories, setNewGroupCategories] = useState(() => new Set());
  const [referenceLinesByGroup, setReferenceLinesByGroup] = useState({});
  const [refLineModalVisible, setRefLineModalVisible] = useState(false);
  const [refLineDraft, setRefLineDraft] = useState("");
  const [summaryViewIndex, setSummaryViewIndex] = useState(0);

  useEffect(() => {
    const loadReferenceLines = async () => {
      try {
        let storedByGroup = parseStoredReferenceLines(
          await AsyncStorage.getItem(CHART_REF_LINE_STORAGE_KEY),
        );
        const legacy = await AsyncStorage.getItem(
          CHART_REF_LINE_LEGACY_STORAGE_KEY,
        );
        if (legacy != null) {
          const legacyValue = Number(legacy);
          if (
            Number.isFinite(legacyValue) &&
            legacyValue > 0 &&
            storedByGroup.all == null
          ) {
            storedByGroup = { ...storedByGroup, all: legacyValue };
            await AsyncStorage.setItem(
              CHART_REF_LINE_STORAGE_KEY,
              JSON.stringify(storedByGroup),
            );
          }
          await AsyncStorage.removeItem(CHART_REF_LINE_LEGACY_STORAGE_KEY);
        }
        setReferenceLinesByGroup(storedByGroup);
      } catch (e) {
        console.error("Error loading chart reference lines:", e);
      }
    };
    loadReferenceLines();
  }, []);

  useEffect(() => {
    const loadDefaultGroupTab = async () => {
      try {
        const raw = await AsyncStorage.getItem(DEFAULT_GROUP_TAB_STORAGE_KEY);
        const value = parseStoredGroupTab(raw);
        if (value != null) {
          setDefaultGroupTab(value);
          setSelectedGroupTab(value);
        }
      } catch (e) {
        console.error("Error loading default summary group:", e);
      }
    };
    loadDefaultGroupTab();
  }, []);

  const {
    data: categoryGroups = [],
    error: categoryGroupsError,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useCategoryGroups();
  const { data: categoriesData } = useCategories();
  const { data: subcategoriesData } = useSubcategories();
  const supportsReferenceLine = selectedGroupTab !== "all";

  const activeReferenceLine = useMemo(
    () => referenceLineForGroup(referenceLinesByGroup, selectedGroupTab),
    [referenceLinesByGroup, selectedGroupTab],
  );

  const refLineGroupLabel = useMemo(() => {
    if (selectedGroupTab === "all") return "Todas las categorías";
    const g = categoryGroups.find(
      (x) => Number(x.id) === Number(selectedGroupTab),
    );
    return g?.name ? String(g.name) : "Grupo";
  }, [selectedGroupTab, categoryGroups]);

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

  const chartData = useMemo(
    () => filterRowsByGroup(data, selectedGroupTab, categoryGroups),
    [data, selectedGroupTab, categoryGroups],
  );

  const tableData = useMemo(() => {
    let rows = chartData;
    if (!text.trim()) return rows;
    const q = text.toLowerCase();
    return rows.filter((item) =>
      String(item.category_id ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [chartData, text]);

  const chartStats = useMemo(() => {
    let ytd = 0;
    for (const month of calendarMonths) {
      ytd += chartData.reduce((sum, row) => sum + (Number(row[month]) || 0), 0);
    }
    const avg = calendarMonths.length > 0 ? ytd / calendarMonths.length : 0;
    return { ytd, avg };
  }, [chartData]);

  const selectedGroupEmpty = useMemo(() => {
    if (selectedGroupTab === "all") return false;
    const g = categoryGroups.find(
      (x) => Number(x.id) === Number(selectedGroupTab),
    );
    if (!g) return false;
    const ids = g.category_ids;
    if (Array.isArray(ids) && ids.length > 0) return false;
    const names = (g.categories ?? []).map(groupCategoryLabel).filter(Boolean);
    return names.length === 0;
  }, [selectedGroupTab, categoryGroups]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    for (const c of categoriesData ?? []) {
      map.set(c.value, c.label);
    }
    return map;
  }, [categoriesData]);

  const subcategoriesById = useMemo(() => {
    const map = new Map();
    for (const c of subcategoriesData ?? []) {
      map.set(c.value, c.label);
    }
    return map;
  }, [subcategoriesData]);

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

  const setGroupAsDefault = useCallback(async (group) => {
    const gid = group?.id;
    if (gid == null) return;
    const n = Number(gid);
    const value = Number.isFinite(n) ? n : gid;
    setDefaultGroupTab(value);
    setSelectedGroupTab(value);
    try {
      await AsyncStorage.setItem(DEFAULT_GROUP_TAB_STORAGE_KEY, String(value));
    } catch (e) {
      Alert.alert(
        "Error al guardar",
        e.message ?? "No se pudo guardar el grupo predeterminado.",
      );
    }
  }, []);

  const clearDefaultGroupTab = useCallback(async () => {
    setDefaultGroupTab(null);
    try {
      await AsyncStorage.removeItem(DEFAULT_GROUP_TAB_STORAGE_KEY);
    } catch (e) {
      console.error("Error clearing default summary group:", e);
    }
  }, []);

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
                  if (Number(defaultGroupTab) === Number(id)) {
                    clearDefaultGroupTab();
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
    [deleteGroup, selectedGroupTab, defaultGroupTab, clearDefaultGroupTab],
  );

  const handleGroupLongPress = useCallback(
    (group) => {
      const isDefault = Number(defaultGroupTab) === Number(group?.id);
      Alert.alert(String(group?.name ?? "Grupo"), undefined, [
        { text: "Cancelar", style: "cancel" },
        isDefault
          ? {
              text: "Quitar como predeterminado",
              onPress: clearDefaultGroupTab,
            }
          : {
              text: "Fijar como predeterminado",
              onPress: () => setGroupAsDefault(group),
            },
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
    [
      openEditGroupModal,
      handleDeleteGroup,
      defaultGroupTab,
      setGroupAsDefault,
      clearDefaultGroupTab,
    ],
  );

  const filterData = useCallback((searchText) => {
    setText(searchText);
  }, []);

  useEffect(() => {
    if (!supportsReferenceLine && refLineModalVisible) {
      setRefLineModalVisible(false);
      setRefLineDraft("");
    }
  }, [supportsReferenceLine, refLineModalVisible]);

  const openRefLineModal = useCallback(() => {
    if (!supportsReferenceLine) return;
    setRefLineDraft(String(activeReferenceLine));
    setRefLineModalVisible(true);
  }, [activeReferenceLine, supportsReferenceLine]);

  const closeRefLineModal = useCallback(() => {
    setRefLineModalVisible(false);
    setRefLineDraft("");
  }, []);

  const saveRefLine = useCallback(async () => {
    const parsed = parseReferenceLineInput(refLineDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert(
        "Valor no válido",
        "Introduce un importe mayor que cero (por ejemplo 5000000).",
      );
      return;
    }
    const groupKey = refLineGroupKey(selectedGroupTab);
    const next = { ...referenceLinesByGroup, [groupKey]: parsed };
    setReferenceLinesByGroup(next);
    try {
      await AsyncStorage.setItem(
        CHART_REF_LINE_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch (e) {
      Alert.alert(
        "Error al guardar",
        e.message ?? "No se pudo guardar la línea de referencia.",
      );
      return;
    }
    closeRefLineModal();
  }, [
    refLineDraft,
    closeRefLineModal,
    selectedGroupTab,
    referenceLinesByGroup,
  ]);

  const resetRefLine = useCallback(async () => {
    const groupKey = refLineGroupKey(selectedGroupTab);
    const next = { ...referenceLinesByGroup };
    delete next[groupKey];
    setReferenceLinesByGroup(next);
    setRefLineDraft(String(SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT));
    try {
      await AsyncStorage.setItem(
        CHART_REF_LINE_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch (e) {
      console.error("Error resetting chart reference line:", e);
    }
  }, [selectedGroupTab, referenceLinesByGroup]);

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>
            Resumen
          </Text>
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
              accessibilityRole="button"
              accessibilityLabel={`Año ${selectedYear}`}
            >
              <Text
                style={[styles.yearButtonText, { color: theme.colors.text }]}
              >
                {selectedYear}
              </Text>
              <AntDesign
                name={showYears ? "up" : "down"}
                size={12}
                color={theme.colors.textSecondary}
              />
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
        {categoryGroupsError && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            No se pudieron cargar los grupos: {categoryGroupsError.message}
          </Text>
        )}
        {!isPending && !error && (
          <View style={styles.mainContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.groupTabBarScroll}
              contentContainerStyle={styles.groupTabBarContent}
            >
              <Pressable
                onPress={() => setSelectedGroupTab("all")}
                style={({ pressed }) => [
                  styles.groupTabPill,
                  {
                    backgroundColor:
                      selectedGroupTab === "all"
                        ? theme.colors.inputBackground
                        : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  pressed && styles.groupTabPillPressed,
                ]}
              >
                <Text
                  style={[
                    styles.groupTabPillText,
                    {
                      color: theme.colors.text,
                      fontWeight: selectedGroupTab === "all" ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  Todas
                </Text>
              </Pressable>
              {categoryGroups.map((g) => (
                <Pressable
                  key={String(g.id)}
                  onPress={() => setSelectedGroupTab(Number(g.id))}
                  onLongPress={() => handleGroupLongPress(g)}
                  style={({ pressed }) => [
                    styles.groupTabPill,
                    {
                      backgroundColor:
                        Number(selectedGroupTab) === Number(g.id)
                          ? theme.colors.inputBackground
                          : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                    pressed && styles.groupTabPillPressed,
                  ]}
                >
                  <View style={styles.groupTabPillContent}>
                    {Number(defaultGroupTab) === Number(g.id) ? (
                      <AntDesign
                        name="star"
                        size={11}
                        color={theme.colors.primary}
                        style={styles.groupTabDefaultStar}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.groupTabPillText,
                        {
                          color: theme.colors.text,
                          fontWeight:
                            Number(selectedGroupTab) === Number(g.id)
                              ? "700"
                              : "500",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={openCreateGroupModal}
                accessibilityRole="button"
                accessibilityLabel="Crear grupo de categorías"
                style={({ pressed }) => [
                  styles.groupTabAdd,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  pressed && styles.groupTabPillPressed,
                ]}
              >
                <AntDesign name="plus" size={20} color={theme.colors.primary} />
              </Pressable>
            </ScrollView>
            <View style={styles.viewModeBar}>
              <SegmentedControl
                style={styles.viewModeControl}
                values={["Gráfico", "Tabla"]}
                selectedIndex={summaryViewIndex}
                appearance={theme.isDark ? "dark" : "light"}
                onChange={(event) => {
                  setSummaryViewIndex(event.nativeEvent.selectedSegmentIndex);
                }}
                tintColor={theme.colors.primary}
                activeFontStyle={{ color: "#ffffff" }}
              />
            </View>
            <View style={styles.contentArea}>
              {summaryViewIndex === 0 ? (
                <ScrollView
                  style={styles.chartScroll}
                  contentContainerStyle={styles.chartScrollContent}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefetching}
                      onRefresh={refetch}
                      tintColor={theme.colors.primary}
                    />
                  }
                >
                  <View style={styles.dashboardSection}>
                    <View style={styles.chartSectionHeader}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Tendencia mensual
                      </Text>
                      {supportsReferenceLine ? (
                        <Pressable
                          onPress={openRefLineModal}
                          accessibilityRole="button"
                          accessibilityLabel="Ajustar línea de referencia del gráfico"
                          style={({ pressed }) => [
                            styles.chartSettingsButton,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                            },
                            pressed && styles.chartSettingsButtonPressed,
                          ]}
                        >
                          <AntDesign
                            name="setting"
                            size={20}
                            color={theme.colors.primary}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                    <SummaryMonthlyBarChart
                      embedded
                      title=""
                      data={chartData}
                      showReferenceLine={supportsReferenceLine}
                      negativeReferenceLine={activeReferenceLine}
                    />
                    <View style={styles.statsRow}>
                      <View
                        style={[
                          styles.statCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          Total año
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            { color: theme.colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {formatSummaryAmount(chartStats.ytd)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          Promedio mensual
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            { color: theme.colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {formatSummaryAmount(chartStats.avg)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.detailSection}>
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="Filtrar categorías..."
                    placeholderTextColor={theme.colors.placeholder}
                    onChangeText={filterData}
                    value={text}
                    autoCapitalize="none"
                  />
                  {selectedGroupEmpty ? (
                    <Text
                      style={[
                        styles.emptyGroupHint,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Este grupo no tiene categorías asignadas. Mantén pulsado
                      un grupo para editarlo.
                    </Text>
                  ) : null}
                  <GroupedTable
                    data={tableData}
                    activeColumns={months}
                    onRefresh={refetch}
                    refreshing={isRefetching}
                    categoriesById={categoriesById}
                    subcategoriesById={subcategoriesById}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        <Modal
          visible={refLineModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeRefLineModal}
        >
          <SafeAreaView
            style={[
              styles.modalRoot,
              { backgroundColor: theme.colors.background },
            ]}
            edges={["top", "bottom"]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Línea de referencia
            </Text>
            <Text
              style={[styles.modalSectionLabel, { color: theme.colors.text }]}
            >
              {refLineGroupLabel}
            </Text>
            <Text style={[styles.modalHint, { color: theme.colors.text }]}>
              Umbral de gasto para este grupo en el gráfico cuando todos los
              meses son negativos. Cada grupo puede tener su propio valor; se
              guarda en este dispositivo.
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
              placeholder="Importe (ej. 5000000)"
              placeholderTextColor={theme.colors.placeholder}
              value={refLineDraft}
              onChangeText={setRefLineDraft}
              keyboardType="numeric"
              autoCapitalize="none"
            />
            <Pressable
              onPress={resetRefLine}
              style={({ pressed }) => [
                styles.refLineReset,
                pressed && styles.modalButtonPressed,
              ]}
            >
              <Text style={{ color: theme.colors.primary }}>
                Restablecer valor predeterminado (
                {SUMMARY_CHART_NEGATIVE_REFERENCE_DEFAULT.toLocaleString(
                  "es-ES",
                )}
                )
              </Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable
                onPress={closeRefLineModal}
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
                onPress={saveRefLine}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={{ color: theme.colors.background }}>Guardar</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={groupModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeGroupModal}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
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
                Mantén pulsado un grupo en las pestañas para editarlo o
                eliminarlo.
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
                      <Text style={{ color: theme.colors.text }}>
                        {cat.label}
                      </Text>
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
                        createGroup.isPending || updateGroup.isPending
                          ? 0.6
                          : 1,
                    },
                    pressed &&
                      !createGroup.isPending &&
                      !updateGroup.isPending &&
                      styles.modalButtonPressed,
                  ]}
                >
                  <Text style={{ color: theme.colors.background }}>
                    Guardar
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </TouchableWithoutFeedback>
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
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
    zIndex: 1001,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  dashboardSection: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 12,
  },
  chartSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewModeBar: {
    paddingHorizontal: 4,
    marginBottom: 10,
    alignItems: "stretch",
  },
  viewModeControl: {
    height: 36,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  chartScroll: {
    flex: 1,
  },
  chartScrollContent: {
    paddingBottom: 24,
  },
  detailSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 4,
  },
  emptyGroupHint: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  chartSettingsButton: {
    borderWidth: 1,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  chartSettingsButtonPressed: {
    opacity: 0.75,
  },
  refLineReset: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
  },
  groupTabBarScroll: {
    flexGrow: 0,
    marginBottom: 10,
    maxHeight: 44,
  },
  groupTabBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  groupTabPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  groupTabPillPressed: {
    opacity: 0.75,
  },
  groupTabPillText: {
    fontSize: 14,
    maxWidth: 160,
  },
  groupTabPillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupTabDefaultStar: {
    marginRight: 1,
  },
  groupTabAdd: {
    borderWidth: 1,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
  },
  yearSelector: {
    alignItems: "flex-end",
    position: "relative",
  },
  yearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
