import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import DropdownModal from "./DropdownModal";
import MyCustomModal from "./MyCustomModal";

const BANK_LIST = [
  { label: "Bancolombia", value: "bancolombia" },
  { label: "Nubank", value: "nubank" },
];

/** Sentinel for header filters: rows with null/empty categoría, subcategoría o banco. */
const TXN_FILTER_NULL_VALUE = "__txn_filter_null__";
const TXN_FILTER_NULL_OPTION = {
  label: "null",
  value: TXN_FILTER_NULL_VALUE,
};

const txnFieldIsEmpty = (v) => v == null || String(v).trim() === "";

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
  style,
}) {
  const { theme } = useTheme();
  const { schema } = useAuth();
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
  const [filterBank, setFilterBank] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterValue, setFilterValue] = useState(null);
  const [filterDescripcion, setFilterDescripcion] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState({});
  const [fechaModal, setFechaModal] = useState(null);
  const allSubcategories = useMemo(
    () =>
      (categories || [])
        .flatMap((c) => c.sub_categorias || [])
        .filter(Boolean) ?? [],
    [categories],
  );

  const categoryModalLabels = useMemo(
    () => [TXN_FILTER_NULL_OPTION, ...(categories || [])],
    [categories],
  );

  const subcategoryModalLabels = useMemo(
    () => [TXN_FILTER_NULL_OPTION, ...subCategories],
    [subCategories],
  );

  /** Options for header filters: only values that appear in loaded transactions. */
  const tableTxnFilterCategories = useMemo(() => {
    const cats = categories || [];
    const seen = new Map();
    for (const t of txns || []) {
      const name = t.categoria;
      if (name == null || String(name).trim() === "") continue;
      const key = String(name).toLowerCase();
      if (seen.has(key)) continue;
      const def =
        cats.find((c) => c.label === name) ??
        cats.find((c) => c.label?.toLowerCase() === String(name).toLowerCase());
      seen.set(
        key,
        def ? { ...def } : { label: String(name), value: String(name) },
      );
    }
    const rows = txns || [];
    const hasNull = rows.some((t) => txnFieldIsEmpty(t.categoria));
    const sorted = Array.from(seen.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "es"),
    );
    return hasNull ? [TXN_FILTER_NULL_OPTION, ...sorted] : sorted;
  }, [txns, categories]);

  const tableTxnFilterSubcategories = useMemo(() => {
    const subs = allSubcategories;
    const seen = new Map();
    for (const t of txns || []) {
      const sub = t.sub_categoria;
      if (sub == null || String(sub).trim() === "") continue;
      const key = String(sub).toLowerCase();
      if (seen.has(key)) continue;
      const match = subs.find(
        (s) =>
          String(s.label ?? "").toLowerCase() === key ||
          String(s.value ?? "").toLowerCase() === key,
      );
      seen.set(key, match ?? { label: String(sub), value: String(sub) });
    }
    const rows = txns || [];
    const hasNull = rows.some((t) => txnFieldIsEmpty(t.sub_categoria));
    const sorted = Array.from(seen.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "es"),
    );
    return hasNull ? [TXN_FILTER_NULL_OPTION, ...sorted] : sorted;
  }, [txns, allSubcategories]);

  const tableTxnFilterBanks = useMemo(() => {
    const seen = new Map();
    for (const t of txns || []) {
      const b = t.banco;
      if (b == null || String(b).trim() === "") continue;
      const key = String(b).toLowerCase();
      if (seen.has(key)) continue;
      const match = BANK_LIST.find(
        (x) =>
          String(x.label ?? "").toLowerCase() === key ||
          String(x.value ?? "").toLowerCase() === key,
      );
      seen.set(key, match ?? { label: String(b), value: String(b) });
    }
    const rows = txns || [];
    const hasNull = rows.some((t) => txnFieldIsEmpty(t.banco));
    const sorted = Array.from(seen.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "es"),
    );
    return hasNull ? [TXN_FILTER_NULL_OPTION, ...sorted] : sorted;
  }, [txns]);

  const resolveCategoryDef = (categoriaName) => {
    if (categoriaName == null || categoriaName === "" || !categories?.length) {
      return null;
    }
    return (
      categories.find((c) => c.label === categoriaName) ??
      categories.find(
        (c) => c.label?.toLowerCase() === String(categoriaName).toLowerCase(),
      )
    );
  };

  const handleCategoriaPress = (id) => {
    setSelectedCategory({ id: id, label: null, value: null });
    setCategoryModalVisible(true);
  };

  const handleSubcategoryPress = (id, category) => {
    setSelectedSubcategory({ id: id, label: null, value: null });
    const subCategories = resolveCategoryDef(category)?.sub_categorias || [];
    setSubCategories(subCategories);
    setSubCategoryModalVisible(true);
  };

  const toggleTxnSelected = (sid) => {
    setSelectedTxnIds((prev) => {
      const next = { ...prev };
      if (next[sid]) delete next[sid];
      else next[sid] = true;
      return next;
    });
  };

  const openBulkCategoryModal = () => {
    const ids = Object.keys(selectedTxnIds)
      .filter((id) => selectedTxnIds[id])
      .map((k) => {
        const n = Number(k);
        return !Number.isNaN(n) && String(n) === k ? n : k;
      });
    if (ids.length === 0) return;
    setSelectedCategory({ ids, label: null, value: null });
    setCategoryModalVisible(true);
  };

  const openBulkSubcategoryModal = () => {
    const ids = Object.keys(selectedTxnIds)
      .filter((id) => selectedTxnIds[id])
      .map((k) => {
        const n = Number(k);
        return !Number.isNaN(n) && String(n) === k ? n : k;
      });
    if (ids.length === 0) return;

    const idSet = new Set(ids.map((x) => String(x)));
    const selectedTxns = txns.filter((t) => idSet.has(String(t.id)));

    const seenCat = new Set();
    const categoryNames = [];
    for (const t of selectedTxns) {
      const name = t.categoria;
      if (name == null || name === "") continue;
      const lk = String(name).toLowerCase();
      if (!seenCat.has(lk)) {
        seenCat.add(lk);
        categoryNames.push(name);
      }
    }

    if (categoryNames.length === 0) {
      Alert.alert(
        "Subcategoría",
        "Las transacciones seleccionadas no tienen categoría asignada.",
      );
      return;
    }

    const seenSubKeys = new Set();
    const mergedSubs = [];
    for (const name of categoryNames) {
      const def = resolveCategoryDef(name);
      for (const sub of def?.sub_categorias || []) {
        const sk = sub.value ?? sub.label;
        if (sk == null) continue;
        const k = String(sk);
        if (!seenSubKeys.has(k)) {
          seenSubKeys.add(k);
          mergedSubs.push(sub);
        }
      }
    }

    if (mergedSubs.length === 0) {
      Alert.alert(
        "Subcategoría",
        "No hay subcategorías definidas para las categorías de esta selección.",
      );
      return;
    }

    setSubCategories(mergedSubs);
    setSelectedSubcategory({ ids, label: null, value: null });
    setSubCategoryModalVisible(true);
  };

  if (isPending)
    return (
      <View
        style={[
          styles.root,
          style,
          { padding: 16, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );

  if (error)
    return (
      <View style={[styles.root, style, { padding: 16, justifyContent: "center" }]}>
        <Text style={{ color: theme.colors.error }}>
          An error has occurred: {error.message}
        </Text>
      </View>
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
      const ids =
        Array.isArray(selectedCategory.ids) && selectedCategory.ids.length > 0
          ? selectedCategory.ids
          : selectedCategory.id != null
            ? [selectedCategory.id]
            : [];
      const { label, value: categoryValue } = selectedCategory;
      if (ids.length === 0) return;
      const clearingCategory = categoryValue === TXN_FILTER_NULL_VALUE;
      if (
        !clearingCategory &&
        (categoryValue === undefined || categoryValue === null)
      )
        return;
      const apiValue = clearingCategory ? null : categoryValue;
      const res = await fetch(
        `${API_URL}/update_txn_category/?table=${table}&schema=${schema}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids, value: apiValue }),
        },
      );
      const result = await res.json();
      console.log("Update result:", result);
      if (!res.ok) return;

      const idSet = new Set(ids.map((x) => String(x)));
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) =>
                  idSet.has(String(txn.id))
                    ? {
                        ...txn,
                        categoria: clearingCategory
                          ? null
                          : (label ?? txn.categoria),
                      }
                    : txn,
                )
              : page,
          ),
        };
      });

      if (
        Array.isArray(selectedCategory.ids) &&
        selectedCategory.ids.length > 0
      ) {
        setSelectedTxnIds({});
        setSelectionMode(false);
      }
    } catch (error) {
      console.error("Failed to update transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseTxnFecha = (fecha) => {
    if (!fecha) return new Date();
    const str = String(fecha).trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const updateTxnDate = async (id, date) => {
    const fecha = date.toLocaleDateString("en-CA");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_date/?table=${table}&schema=${schema}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, fecha }),
        },
      );
      const result = await res.json();
      console.log("Update fecha result:", result);
      if (!res.ok) return;
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) => (txn.id === id ? { ...txn, fecha } : txn))
              : page,
          ),
        };
      });
    } catch (error) {
      console.error("Failed to update transaction date:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubcategory = async () => {
    setLoading(true);
    try {
      const ids =
        Array.isArray(selectedSubcategory.ids) &&
        selectedSubcategory.ids.length > 0
          ? selectedSubcategory.ids
          : selectedSubcategory.id != null
            ? [selectedSubcategory.id]
            : [];
      const { label, value: subcategoryValue } = selectedSubcategory;
      if (ids.length === 0) return;
      const clearingSubcategory = subcategoryValue === TXN_FILTER_NULL_VALUE;
      if (
        !clearingSubcategory &&
        (subcategoryValue === undefined || subcategoryValue === null)
      )
        return;
      const apiValue = clearingSubcategory ? null : subcategoryValue;

      const res = await fetch(
        `${API_URL}/update_txn_subcategory/?table=${table}&schema=${schema}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids, value: apiValue }),
        },
      );
      const result = await res.json();
      console.log("Update result:", result);
      if (!res.ok) return;

      const idSet = new Set(ids.map((x) => String(x)));
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) =>
                  idSet.has(String(txn.id))
                    ? {
                        ...txn,
                        sub_categoria: clearingSubcategory
                          ? null
                          : (label ?? txn.sub_categoria),
                      }
                    : txn,
                )
              : page,
          ),
        };
      });

      if (
        Array.isArray(selectedSubcategory.ids) &&
        selectedSubcategory.ids.length > 0
      ) {
        setSelectedTxnIds({});
        setSelectionMode(false);
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
      const res = await fetch(
        `${API_URL}/delete_txn/?id=${id}&schema=${schema}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const result = await res.json();
      console.log("deleted result:", result);
      // Invalidate and refetch the transactions query to update the UI
      queryClient.invalidateQueries({
        queryKey,
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
    Banco: styles.colBanco,
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
            headerColumnStyle[label],
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

  const showEditColumn = txns.some((item) => item?.conciliado !== undefined);

  const renderSelectAllHeaderCell = () => {
    const allFilteredSelected =
      filteredTxns.length > 0 &&
      filteredTxns.every((t) => selectedTxnIds[String(t.id)]);
    const someFilteredSelected = filteredTxns.some(
      (t) => selectedTxnIds[String(t.id)],
    );
    const iconName =
      filteredTxns.length === 0
        ? "check-box-outline-blank"
        : allFilteredSelected
          ? "check-box"
          : someFilteredSelected
            ? "indeterminate-check-box"
            : "check-box-outline-blank";

    const toggleSelectAllFiltered = () => {
      if (allFilteredSelected) {
        setSelectedTxnIds((prev) => {
          const next = { ...prev };
          for (const t of filteredTxns) {
            delete next[String(t.id)];
          }
          return next;
        });
      } else {
        setSelectedTxnIds((prev) => {
          const next = { ...prev };
          for (const t of filteredTxns) {
            next[String(t.id)] = true;
          }
          return next;
        });
      }
    };

    return (
      <Pressable style={styles.colSelect} onPress={toggleSelectAllFiltered}>
        {({ pressed }) => (
          <View
            style={[
              styles.headerCell,
              styles.colSelect,
              {
                flex: 1,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={22}
              color={theme.colors.text}
            />
          </View>
        )}
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.row}>
      {selectionMode && renderSelectAllHeaderCell()}
      {renderHeaderCell("Fecha")}
      {renderHeaderCell("Descripcion")}
      {renderHeaderCell("Valor")}
      {renderHeaderCell("Categoria")}
      {renderHeaderCell("Subcategoria")}
      {renderHeaderCell("Banco")}
      {showEditColumn && renderHeaderCell("Editar")}
    </View>
  );

  const renderFechaCell = (id, value) => (
    <TouchableHighlight
      style={[
        styles.cell,
        styles.colFecha,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
      onPress={() => setFechaModal({ id, date: parseTxnFecha(value) })}
      underlayColor={theme.colors.inputBackground}
    >
      <View>
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {value}
        </Text>
      </View>
    </TouchableHighlight>
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

  const renderCategoryCell = (id, category) => {
    const inner = (
      <View>
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {category?.toLowerCase()}
        </Text>
      </View>
    );
    const cellStyle = [
      styles.cell,
      styles.colCategoria,
      {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      },
    ];
    if (selectionMode) {
      return <View style={cellStyle}>{inner}</View>;
    }
    return (
      <TouchableHighlight
        style={cellStyle}
        onPress={() => handleCategoriaPress(id)}
        underlayColor={theme.colors.inputBackground}
      >
        {inner}
      </TouchableHighlight>
    );
  };

  const renderSubCategoryCell = (id, category, subCategory) => {
    const inner = (
      <View>
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {subCategory?.toLowerCase()}
        </Text>
      </View>
    );
    const cellStyle = [
      styles.cell,
      styles.colSubCategoria,
      {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      },
    ];
    if (selectionMode) {
      return <View style={cellStyle}>{inner}</View>;
    }
    return (
      <TouchableHighlight
        style={cellStyle}
        onPress={() => handleSubcategoryPress(id, category)}
        underlayColor={theme.colors.inputBackground}
      >
        {inner}
      </TouchableHighlight>
    );
  };

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

  const renderEditCell = (id, reconciled) => {
    const sharedStyle = [
      styles.cell,
      styles.editCell,
      styles.colEditar,
      {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      },
    ];

    if (reconciled) {
      return (
        <View style={sharedStyle}>
          <MaterialIcons
            name="check-circle"
            size={24}
            color={theme.colors.text}
          />
        </View>
      );
    }

    return (
      <Pressable
        style={sharedStyle}
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
  };

  const renderSelectRowCell = (id) => {
    const sid = String(id);
    const checked = !!selectedTxnIds[sid];
    return (
      <Pressable
        style={[
          styles.cell,
          styles.colSelect,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
        onPress={() => toggleTxnSelected(sid)}
      >
        <MaterialIcons
          name={checked ? "check-box" : "check-box-outline-blank"}
          size={22}
          color={theme.colors.text}
        />
      </Pressable>
    );
  };

  const renderTxns = (item) => (
    <View style={styles.row}>
      {selectionMode && renderSelectRowCell(item.id)}
      {renderFechaCell(item.id, item.fecha)}
      {renderDescripcionCell(item?.descripcion)}
      {renderValorCell(item.valor)}
      {renderCategoryCell(item.id, item.categoria)}
      {renderSubCategoryCell(item.id, item.categoria, item.sub_categoria)}
      {renderBancoCell(item.banco)}
      {showEditColumn && renderEditCell(item.id, item.conciliado)}
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
      if (filterCategory.value === TXN_FILTER_NULL_VALUE) {
        list = list.filter((item) => txnFieldIsEmpty(item.categoria));
      } else {
        list = list.filter(
          (item) =>
            item.categoria?.toLowerCase() ===
            filterCategory.label?.toLowerCase(),
        );
      }
    }
    if (filterSubcategory) {
      if (filterSubcategory.value === TXN_FILTER_NULL_VALUE) {
        list = list.filter((item) => txnFieldIsEmpty(item.sub_categoria));
      } else {
        list = list.filter(
          (item) =>
            item.sub_categoria?.toLowerCase() ===
            filterSubcategory.label?.toLowerCase(),
        );
      }
    }
    if (filterBank) {
      if (filterBank.value === TXN_FILTER_NULL_VALUE) {
        list = list.filter((item) => txnFieldIsEmpty(item.banco));
      } else {
        list = list.filter(
          (item) =>
            item.banco?.toLowerCase() === filterBank.label?.toLowerCase(),
        );
      }
    }
    const descQ = filterDescripcion?.trim();
    if (descQ) {
      const q = descQ.toLowerCase();
      list = list.filter((item) =>
        String(item.descripcion ?? "")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filterValue != null && filterValue !== "") {
      const target = Number(filterValue);
      list = list.filter((item) => Number(item.valor) === target);
    }
    return list;
  })();

  const showFilterChips =
    filterCategory ||
    filterDate ||
    filterSubcategory ||
    filterBank ||
    filterValue != null ||
    (filterDescripcion && filterDescripcion.trim() !== "");

  const selectedCount = Object.keys(selectedTxnIds).filter(
    (id) => selectedTxnIds[id],
  ).length;

  const selectionToolbar = (
    <View style={styles.selectionToolbar}>
      {selectionMode ? (
        <>
          <Pressable
            onPress={() => {
              setSelectionMode(false);
              setSelectedTxnIds({});
            }}
            style={({ pressed }) => [
              styles.selectionToolbarButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.selectionToolbarButtonText,
                { color: theme.colors.text },
              ]}
            >
              Cancelar selección
            </Text>
          </Pressable>
          {selectedCount > 0 && (
            <>
              <Pressable
                onPress={openBulkCategoryModal}
                style={({ pressed }) => [
                  styles.selectionToolbarButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectionToolbarButtonText,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                >
                  Cambiar categoría ({selectedCount})
                </Text>
              </Pressable>
              <Pressable
                onPress={openBulkSubcategoryModal}
                style={({ pressed }) => [
                  styles.selectionToolbarButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectionToolbarButtonText,
                    { color: theme.colors.primary, fontWeight: "600" },
                  ]}
                >
                  Cambiar subcategoría ({selectedCount})
                </Text>
              </Pressable>
            </>
          )}
        </>
      ) : (
        <Pressable
          onPress={() => setSelectionMode(true)}
          style={({ pressed }) => [
            styles.selectionToolbarButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.selectionToolbarButtonText,
              { color: theme.colors.text },
            ]}
          >
            Seleccionar varias
          </Text>
        </Pressable>
      )}
    </View>
  );

  const filterChipsRow = !showFilterChips ? null : (
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
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Fecha: {String(filterDate.month).padStart(2, "0")}/{filterDate.year}
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
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
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
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
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
      {filterBank && (
        <Pressable
          onPress={() => setFilterBank(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Banco: {filterBank.label}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterValue != null && filterValue !== "" && (
        <Pressable
          onPress={() => setFilterValue(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>
            Valor: {formatSpanishNumber(Number(filterValue))}
          </Text>
          <MaterialIcons
            name="close"
            size={18}
            color={theme.colors.text}
            style={styles.filterChipIcon}
          />
        </Pressable>
      )}
      {filterDescripcion && filterDescripcion.trim() !== "" && (
        <Pressable
          onPress={() => setFilterDescripcion("")}
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
            numberOfLines={1}
          >
            Descripción: {filterDescripcion.trim()}
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
  );

  return (
    <View style={[styles.root, style]}>
      <Modal
        visible={fechaModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFechaModal(null)}
      >
        <Pressable
          style={[
            styles.dateModalOverlay,
            { backgroundColor: theme.colors.modalOverlay },
          ]}
          onPress={() => setFechaModal(null)}
        >
          <Pressable
            style={[
              styles.dateModalSheet,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.dateModalTitle, { color: theme.colors.text }]}>
              Fecha
            </Text>
            {fechaModal != null && (
              <View style={styles.dateModalPickerWrap}>
                <DateTimePicker
                  value={fechaModal.date}
                  mode="date"
                  // display={Platform.OS === "ios" ? "spinner" : "calendar"}
                  display="default"
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setFechaModal((prev) =>
                        prev ? { ...prev, date: selectedDate } : null,
                      );
                    }
                  }}
                  textColor={theme.colors.text}
                  themeVariant={theme.isDark ? "dark" : "light"}
                  accentColor={theme.colors.primary}
                />
              </View>
            )}
            <View
              style={[
                styles.dateModalActions,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <Pressable
                onPress={() => setFechaModal(null)}
                style={({ pressed }) => [
                  styles.dateModalButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ color: theme.colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!fechaModal) return;
                  const { id, date } = fechaModal;
                  setFechaModal(null);
                  await updateTxnDate(id, date);
                }}
                style={({ pressed }) => [
                  styles.dateModalButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  style={{ color: theme.colors.primary, fontWeight: "600" }}
                >
                  Guardar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <MyCustomModal
        labels={categoryModalLabels}
        value={selectedCategory.value}
        onChange={(item) => {
          setSelectedCategory((prev) => ({
            ...prev,
            label: item.label,
            value: item.value,
          }));
        }}
        onAccept={async () => {
          await updateCategory();
          setCategoryModalVisible(!categoryModalVisible);
        }}
        visible={categoryModalVisible}
        SetModalFunc={() => setCategoryModalVisible(!categoryModalVisible)}
      />
      <MyCustomModal
        labels={subcategoryModalLabels}
        value={selectedSubcategory.value}
        onChange={(item) => {
          setSelectedSubcategory((prev) => ({
            ...prev,
            label: item.label,
            value: item.value,
          }));
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
          {
            Categoria: tableTxnFilterCategories,
            Subcategoria: tableTxnFilterSubcategories,
            Banco: tableTxnFilterBanks,
          }[headerDropdownLabel]
        }
        placeholder={
          {
            Categoria: "Seleccionar categoría",
            Subcategoria: "Seleccionar subcategoría",
            Banco: "Seleccionar banco",
          }[headerDropdownLabel]
        }
        searchPlaceholder={
          {
            Categoria: "Buscar categoría...",
            Subcategoria: "Buscar subcategoría...",
            Banco: "Buscar banco...",
          }[headerDropdownLabel]
        }
        value={
          {
            Categoria: filterCategory?.value,
            Subcategoria: filterSubcategory?.value,
            Banco: filterBank?.value,
          }[headerDropdownLabel]
        }
        pickerValue={filterDate}
        type={
          headerDropdownLabel === "Valor"
            ? "currency"
            : headerDropdownLabel === "Descripcion"
              ? "text"
              : headerDropdownLabel !== "Fecha"
                ? "dropdown"
                : "picker"
        }
        currencyValue={filterValue}
        onCurrencyValueChange={setFilterValue}
        textValue={filterDescripcion}
        onTextValueChange={setFilterDescripcion}
        textPlaceholder="Filtrar por texto en descripción"
        doneLabel="Listo"
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
          } else if (headerDropdownLabel === "Banco") {
            setFilterBank({
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
      />
      <View style={styles.tableMain}>
        {selectionToolbar}
        {filterChipsRow}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={[
            styles.scrollView,
            { flex: 1, borderColor: theme.colors.border },
          ]}
        >
          <FlatList
            style={[
              styles.flatList,
              { flex: 1, borderColor: theme.colors.border },
            ]}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tableMain: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
  colSelect: { width: 44 },
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
  selectionToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  selectionToolbarButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectionToolbarButtonText: {
    fontSize: 14,
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
  dateModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  dateModalSheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  dateModalPickerWrap: {
    width: "100%",
    alignItems: "center",
  },
  dateModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});
