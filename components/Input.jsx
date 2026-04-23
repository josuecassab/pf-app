import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useBanks } from "../hooks/useBanks";
import { useCategories } from "../hooks/useCategories";
import SwipeableCategoryItem from "./SwipeableCategoryItem";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const EMPTY_BANK_LIST = [];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferSeparatorsFromIntl(languageTag) {
  const opts = {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  const nf = new Intl.NumberFormat(languageTag, opts);
  if (typeof nf.formatToParts === "function") {
    const parts = nf.formatToParts(1234567.89);
    return {
      decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
      group: parts.find((p) => p.type === "group")?.value ?? ",",
    };
  }
  const formatted = nf.format(1234567.89);
  const decMatch = formatted.match(/(\D)(\d{2})$/u);
  const decimal = decMatch?.[1] ?? ".";
  const intWithGroups = decMatch ? formatted.slice(0, -3) : formatted;
  const groupMatch = intWithGroups.match(/\D/u);
  const group = groupMatch?.[0] ?? (decimal === "," ? "." : ",");
  return { decimal, group };
}

/** Locale used for separators (no expo-localization native module required). */
function resolveNumberFormatLocaleTag() {
  try {
    return Intl.NumberFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

function getAmountFormattingConfig() {
  return inferSeparatorsFromIntl(resolveNumberFormatLocaleTag());
}

function parseLocalizedAmount(display, decimal, group) {
  if (display == null || String(display).trim() === "") return NaN;
  const noGroup = String(display).replace(
    new RegExp(escapeRegExp(group), "g"),
    "",
  );
  const normalized = noGroup.replace(
    new RegExp(escapeRegExp(decimal), "g"),
    ".",
  );
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Western 3-digit groups using the OS grouping character (matches iOS/Android number prefs). */
function formatIntDigitsWithGroupSeparators(intDigitString, groupSep) {
  const digits = intDigitString.replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  const core = String(n);
  if (core.length <= 3) return core;
  const parts = [];
  let rest = core;
  while (rest.length > 3) {
    parts.unshift(rest.slice(-3));
    rest = rest.slice(0, -3);
  }
  if (rest) parts.unshift(rest);
  return parts.join(groupSep);
}

function formatFullAmount(num, decimal, group) {
  if (!Number.isFinite(num)) return "";
  const s = Math.abs(num).toFixed(2);
  const [intStr, fracStr] = s.split(".");
  const intFmt = formatIntDigitsWithGroupSeparators(intStr, group);
  return intFmt + decimal + fracStr;
}

export default function Input() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [txtType, setTxnType] = useState(1);
  const [txtData, setTxnData] = useState({});
  const [value, setValue] = useState("");
  const [categories, setCategories] = useState([]);
  const [visibleInputCat, setVisibleInputCat] = useState(false);
  const [inputCategory, setInputCategory] = useState("");
  const [inputSubcategory, setInputSubcategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [addingSubcategoryForId, setAddingSubcategoryForId] = useState(null);
  const [updatingCategory, setUpdatingCategory] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [visibleInputBank, setVisibleInputBank] = useState(false);
  const [inputBank, setInputBank] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [updatingBank, setUpdatingBank] = useState(null);
  const { session, schema } = useAuth();

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // NativeTabs (expo-router) does not provide @react-navigation/bottom-tabs context.
  const tabBarHeight =
    Platform.OS === "ios" ? 49 + insets.bottom : 56 + insets.bottom;

  const amountSeparators = useMemo(() => getAmountFormattingConfig(), []);

  const { isPending, error, data, isFetching } = useCategories();
  const { data: banksData } = useBanks();
  const bankList = Array.isArray(banksData) ? banksData : EMPTY_BANK_LIST;

  console.log(value);

  useEffect(() => {
    if (data) {
      setCategories(data);
    }
  }, [data]);

  useEffect(() => {
    if (!bankList.length) {
      setSelectedBank(null);
      return;
    }
    setSelectedBank((prev) => {
      if (prev && bankList.some((b) => b.value === prev.value)) return prev;
      return bankList[0];
    });
  }, [bankList]);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    console.log(currentDate);
    setShow(false);
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const handleAmountChangeText = useCallback(
    (text) => {
      const { decimal, group } = amountSeparators;
      const cleaned = text.replace(new RegExp(escapeRegExp(group), "g"), "");
      const parts = cleaned.split(decimal);
      const intDigits = (parts[0] ?? "").replace(/\D/g, "");
      const fracPart = (parts[1] ?? "").replace(/\D/g, "").slice(0, 2);
      const hasDecimal = parts.length > 1;

      let intDisplay = "";
      if (intDigits === "") {
        intDisplay = hasDecimal ? "0" : "";
      } else {
        intDisplay = formatIntDigitsWithGroupSeparators(intDigits, group);
      }

      let next = intDisplay;
      if (hasDecimal) {
        next += decimal + fracPart;
      }
      setValue(next);
    },
    [amountSeparators],
  );

  const handleAmountBlur = useCallback(() => {
    setValue((prev) => {
      const n = parseLocalizedAmount(
        prev,
        amountSeparators.decimal,
        amountSeparators.group,
      );
      if (Number.isNaN(n)) return prev;
      return formatFullAmount(
        n,
        amountSeparators.decimal,
        amountSeparators.group,
      );
    });
  }, [amountSeparators]);

  const submitTxn = async () => {
    setIsSending(true);
    const txn = {};
    // Format date in local timezone as YYYY-MM-DD (using 'en-CA' locale for ISO format)
    txn.fecha = date.toLocaleDateString("en-CA");
    const parsedAmount = parseLocalizedAmount(
      value,
      amountSeparators.decimal,
      amountSeparators.group,
    );
    if (Number.isNaN(parsedAmount)) {
      Alert.alert(
        "Error de validación",
        "Por favor ingrese un valor numérico válido",
      );
      setIsSending(false);
      return;
    }
    txn.valor = txtType === 0 ? parsedAmount : -1 * parsedAmount;
    console.log(txn.valor);
    if (selectedCategory?.value) {
      txn.id_categoria = selectedCategory.value;
    } else {
      Alert.alert("Error de validación", "Porfavor seleccione una categoria");
      setIsSending(false);
      return;
    }
    txn.id_subcategoria = selectedSubcategory?.value
      ? selectedSubcategory.value
      : null;
    if (selectedBank?.label) {
      txn.banco = selectedBank.label;
    } else {
      Alert.alert("Error de validación", "Por favor seleccione un banco");
      setIsSending(false);
      return;
    }

    console.log(txn);
    try {
      const res = await fetch(`${API_URL}/insert_txn/?schema=${schema}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txn),
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        Alert.alert(
          "Error enviando la transacción",
          data.message || JSON.stringify(data),
        );
        return;
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      Alert.alert("Error enviando la transacción", error.message);
    } finally {
      setIsSending(false);
      setSelectedSubcategory(null);
    }
  };

  const addBank = async () => {
    const label = inputBank.trim();
    if (label === "") return;
    try {
      const res = await fetch(
        `${API_URL}/insert_bank/?schema=${schema}&name=${encodeURIComponent(label)}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error agregando el banco",
          data.message || JSON.stringify(data),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
      setInputBank("");
      setVisibleInputBank(false);
      if (data?.value != null) {
        setSelectedBank({
          label: data.label ?? data.name ?? label,
          value: data.value,
        });
      }
    } catch (error) {
      console.error("Error adding bank:", error);
      Alert.alert("Error agregando el banco", error.message);
    }
  };

  const deleteBank = async (bankValue) => {
    try {
      const res = await fetch(
        `${API_URL}/delete_bank/?id=${bankValue}&schema=${schema}`,
        {
          method: "DELETE",
        },
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error eliminando el banco",
          result.message || JSON.stringify(result),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
    } catch (error) {
      console.error("Error deleting bank:", error);
      Alert.alert("Error eliminando el banco", error.message);
    }
  };

  const updateBank = async (value, newLabel) => {
    setUpdatingBank(value);
    try {
      const res = await fetch(
        `${API_URL}/update_bank/?value=${value}&name=${encodeURIComponent(newLabel)}&schema=${schema}`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error actualizando el banco",
          result.message || JSON.stringify(result),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
    } catch (error) {
      console.error("Error actualizando el banco:", error);
    } finally {
      setUpdatingBank(null);
    }
  };

  const addCategory = async () => {
    if (inputCategory.trim() === "") return;
    try {
      console.log("Adding category:", inputCategory);
      const res = await fetch(
        `${API_URL}/categories/insert_category/?schema=${schema}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ label: inputCategory }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        console.log("Error response data:", res);
        Alert.alert(
          "Error agregando la categoría",
          data.message || JSON.stringify(data),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setInputCategory("");
      setVisibleInputCat(false);
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error agregando la categoría", error.message);
    }
  };

  const addSubcategory = async (category) => {
    if (inputSubcategory.trim() === "") return;
    try {
      const res = await fetch(
        `${API_URL}/categories/insert_subcategory/?schema=${schema}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sub_categoria: inputSubcategory,
            id_categoria: category,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        console.log("Error response data:", res);
        Alert.alert(
          "Error agregando la subcategoría",
          data.message || JSON.stringify(data),
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setInputSubcategory("");
      setAddingSubcategoryForId(null);
    } catch (error) {
      console.error("Error adding subcategory:", error);
      Alert.alert("Error agregando la subcategoría", error.message);
    }
  };

  const deleteCategory = async (categoryValue) => {
    try {
      const res = await fetch(
        `${API_URL}/categories/delete_category/?id=${categoryValue}&schema=${schema}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        Alert.alert(
          "Error eliminando la categoría",
          data.message || JSON.stringify(data),
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      console.error("Error deleting category:", error);
      Alert.alert("Error eliminando la categoría", error.message);
    }
  };

  const deleteSubcategory = async (categoryValue) => {
    try {
      const res = await fetch(
        `${API_URL}/categories/delete_subcategory/?id=${categoryValue}&schema=${schema}`,
        {
          method: "DELETE",
        },
      );

      const result = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error eliminando la subcategoría",
          result.message || JSON.stringify(result),
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      Alert.alert("Error eliminando la subcategoría", error.message);
    }
  };

  const updateCategory = async (value, newLabel, parentId) => {
    console.log(value, newLabel);
    setUpdatingCategory(value);
    try {
      const res = await fetch(
        `${API_URL}/categories/update_category/?value=${value}&label=${newLabel}&schema=${schema}`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error actualizando categoría",
          result.message || JSON.stringify(result),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      console.error("Error actualizando categoría:", error);
    } finally {
      setUpdatingCategory(null);
    }
  };

  const updateSubcategory = async (value, newLabel, parentId) => {
    console.log(value, newLabel);
    setUpdatingCategory(value);
    try {
      const res = await fetch(
        `${API_URL}/categories/update_subcategory/?value=${value}&label=${newLabel}&schema=${schema}`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error actualizando Subcategoría",
          result.message || JSON.stringify(result),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      console.error("Error actualizando Subcategoría:", error);
    } finally {
      setUpdatingCategory(null);
    }
  };

  const expandCategories = (cat) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cat.value)) {
        newSet.delete(cat.value);
      } else {
        newSet.add(cat.value);
      }
      return newSet;
    });
  };

  const searchCategory = useCallback(
    (text) => {
      console.log("Filtering data with text:", text);
      const filteredCategories = data.filter((cat) =>
        cat.label.toLowerCase().includes(text.toLowerCase()),
      );
      setCategories(filteredCategories);
    },
    [data],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View
          style={[
            {
              backgroundColor: theme.colors.background,
              flex: 1,
              justifyContent: "space-around",
            },
          ]}
        >
          {/* <Text style={[styles.titleText, { color: theme.colors.text }]}>
              Agregar
            </Text> */}
          <View style={styles.containerStyle}>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              Fecha
            </Text>
            <View style={{ transform: [{ scale: 1.1 }] }}>
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                onChange={onChange}
                textColor={theme.colors.text}
                themeVariant={theme.isDark ? "dark" : "light"}
                display="default"
                accentColor={theme.colors.primary}
                style={{
                  borderRadius: 30,
                  height: 40,
                }}
              />
            </View>
          </View>
          <View style={styles.containerStyle}>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              Valor
            </Text>
            <TextInput
              style={[
                styles.currencyInput,
                {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  fontSize: 16,
                  textAlign: "center",
                  borderRadius: 30,
                  paddingHorizontal: 10,
                },
              ]}
              value={value}
              onChangeText={handleAmountChangeText}
              onBlur={handleAmountBlur}
              keyboardType="decimal-pad"
              placeholder="ingresa el valor"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>
          <View style={styles.containerStyle}>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              Tipo
            </Text>
            <SegmentedControl
              style={{ width: 160, height: 40 }}
              values={["Ingreso", "Egreso"]}
              selectedIndex={txtType}
              appearance={theme.isDark ? "dark" : "light"}
              onChange={(event) => {
                console.log(event);
                setTxnType(event.nativeEvent.selectedSegmentIndex);
              }}
              tintColor={theme.colors.primary}
              activeFontStyle={{ color: "#ffffff" }}
            />
          </View>

          <View style={[styles.containerStyle, { gap: 16 }]}>
            <View style={styles.categoryHeader}>
              <Text
                style={[styles.categoryLabel, { color: theme.colors.text }]}
              >
                Categoria
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.editButtonPressed,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Feather name="edit" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <Dropdown
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderBottomColor: theme.colors.border,
                  width: "60%",
                },
              ]}
              placeholderStyle={[
                styles.placeholderStyle,
                { color: theme.colors.placeholder },
              ]}
              selectedTextStyle={[
                styles.selectedTextStyle,
                { color: theme.colors.text },
              ]}
              inputSearchStyle={[
                styles.inputSearchStyle,
                { color: theme.colors.text },
              ]}
              iconStyle={styles.iconStyle}
              containerStyle={{
                backgroundColor: theme.colors.inputBackground,
                borderRadius: 30,
                borderColor: theme.colors.border,
              }}
              itemContainerStyle={{
                backgroundColor: theme.colors.inputBackground,
                borderRadius: 30,
              }}
              itemTextStyle={{
                color: theme.colors.text,
                fontSize: 14,
              }}
              activeColor={theme.colors.primary + "20"}
              data={categories}
              search
              maxHeight={220}
              labelField="label"
              valueField="value"
              placeholder="Seleccionar categoria"
              searchPlaceholder="Buscar..."
              value={selectedCategory?.value}
              onChange={(item) => {
                setSelectedCategory({
                  label: item.label,
                  value: item.value,
                  sub_categorias: item.sub_categorias,
                });
                console.log(selectedCategory);
              }}
            />
            <Dropdown
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderBottomColor: theme.colors.border,
                  width: "60%",
                },
              ]}
              placeholderStyle={[
                styles.placeholderStyle,
                { color: theme.colors.placeholder },
              ]}
              selectedTextStyle={[
                styles.selectedTextStyle,
                { color: theme.colors.text },
              ]}
              inputSearchStyle={[
                styles.inputSearchStyle,
                { color: theme.colors.text },
              ]}
              containerStyle={{
                backgroundColor: theme.colors.inputBackground,
                borderRadius: 30,
                borderColor: theme.colors.border,
              }}
              itemTextStyle={{
                color: theme.colors.text,
                fontSize: 14,
              }}
              iconStyle={styles.iconStyle}
              data={selectedCategory?.sub_categorias || []}
              search
              maxHeight={220}
              labelField="label"
              valueField="value"
              placeholder="Seleccionar subcategoria"
              searchPlaceholder="Buscar..."
              value={selectedSubcategory?.value}
              onChange={(item) => {
                setSelectedSubcategory({
                  label: item.label,
                  value: item.value,
                });
              }}
              dropdownPosition="bottom"
            />
            <Modal
              transparent={false}
              animationType="slide"
              visible={showCategoryModal}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <SafeAreaProvider>
                  <SafeAreaView
                    style={[
                      { flex: 1 },
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Pressable
                        onPress={() => {
                          setShowCategoryModal(false);
                          setAddingSubcategoryForId(null);
                          setInputSubcategory("");
                        }}
                        style={styles.iconButton}
                      >
                        {({ pressed }) => (
                          <AntDesign
                            name="close"
                            size={24}
                            color={
                              pressed
                                ? theme.colors.textSecondary
                                : theme.colors.text
                            }
                          />
                        )}
                      </Pressable>
                      <Text
                        style={[
                          styles.modalTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        Categorias
                      </Text>
                      <Pressable
                        onPress={() => setVisibleInputCat(!visibleInputCat)}
                        style={styles.iconButton}
                      >
                        {({ pressed }) => (
                          <AntDesign
                            name={visibleInputCat ? "close" : "plus"}
                            size={24}
                            color={
                              pressed
                                ? theme.colors.textSecondary
                                : theme.colors.text
                            }
                          />
                        )}
                      </Pressable>
                    </View>
                    <View style={styles.searchContainer}>
                      <Feather
                        name="search"
                        size={18}
                        color={theme.colors.placeholder}
                        style={styles.searchIcon}
                      />
                      <TextInput
                        style={[
                          styles.searchInput,
                          {
                            backgroundColor: theme.colors.inputBackground,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                          },
                        ]}
                        placeholder="Buscar categoría..."
                        placeholderTextColor={theme.colors.placeholder}
                        defaultValue=""
                        onChangeText={(text) => {
                          searchCategory(text);
                        }}
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                      />
                    </View>
                    {visibleInputCat && (
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[
                            styles.categoryInput,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              color: theme.colors.text,
                            },
                          ]}
                          placeholder="Nueva Categoria"
                          placeholderTextColor={theme.colors.placeholder}
                          value={inputCategory}
                          onChangeText={(text) => {
                            setInputCategory(text);
                          }}
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.addButton,
                            { backgroundColor: theme.colors.primary },
                            pressed && styles.addButtonPressed,
                          ]}
                          onPress={() => addCategory()}
                        >
                          <Text style={styles.addButtonText}>Agregar</Text>
                        </Pressable>
                      </View>
                    )}
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <GHScrollView>
                        {categories.map((cat) => (
                          <View key={cat.value}>
                            <SwipeableCategoryItem
                              cat={cat}
                              parent={true}
                              onPress={() => expandCategories(cat)}
                              onDelete={deleteCategory}
                              onEdit={updateCategory}
                              isLoading={updatingCategory === cat.value}
                            />
                            {expandedCategories.has(cat.value) && (
                              <>
                                {cat.sub_categorias.map((sub) => (
                                  <View
                                    key={sub.value}
                                    style={styles.subCategoryContainer}
                                  >
                                    <SwipeableCategoryItem
                                      parentId={cat.value}
                                      cat={sub}
                                      onDelete={deleteSubcategory}
                                      onEdit={updateSubcategory}
                                    />
                                  </View>
                                ))}
                                {addingSubcategoryForId === cat.value ? (
                                  <View
                                    key={`${cat.value}-input`}
                                    style={styles.subCategoryInputRow}
                                  >
                                    <TextInput
                                      style={[
                                        styles.subCategoryInput,
                                        {
                                          backgroundColor: theme.colors.surface,
                                          borderColor: theme.colors.border,
                                          color: theme.colors.text,
                                        },
                                      ]}
                                      placeholder="Nueva subcategoría"
                                      placeholderTextColor={
                                        theme.colors.placeholder
                                      }
                                      value={inputSubcategory}
                                      onChangeText={setInputSubcategory}
                                      autoFocus
                                    />
                                    <Pressable
                                      onPress={() => {
                                        setAddingSubcategoryForId(null);
                                        setInputSubcategory("");
                                      }}
                                      style={[
                                        styles.subCategoryAddButton,
                                        {
                                          backgroundColor:
                                            theme.colors.inputBackground,
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={{
                                          color: theme.colors.text,
                                          fontSize: 14,
                                        }}
                                      >
                                        Cancelar
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => addSubcategory(cat.value)}
                                      style={({ pressed }) => [
                                        styles.subCategoryAddButton,
                                        {
                                          backgroundColor: theme.colors.primary,
                                        },
                                        pressed &&
                                          styles.subCategoryAddButtonPressed,
                                      ]}
                                    >
                                      <Text
                                        style={{
                                          color: "#ffffff",
                                          fontWeight: "600",
                                          fontSize: 14,
                                        }}
                                      >
                                        Agregar
                                      </Text>
                                    </Pressable>
                                  </View>
                                ) : (
                                  <Pressable
                                    onPress={() =>
                                      setAddingSubcategoryForId(cat.value)
                                    }
                                    style={[
                                      styles.addSubcategoryButton,
                                      {
                                        borderColor: theme.colors.border,
                                      },
                                    ]}
                                  >
                                    <Feather
                                      name="plus"
                                      size={16}
                                      color={theme.colors.primary}
                                    />
                                    <Text
                                      style={[
                                        styles.addSubcategoryButtonText,
                                        { color: theme.colors.primary },
                                      ]}
                                    >
                                      Agregar subcategoría
                                    </Text>
                                  </Pressable>
                                )}
                              </>
                            )}
                          </View>
                        ))}
                      </GHScrollView>
                    </GestureHandlerRootView>
                  </SafeAreaView>
                </SafeAreaProvider>
              </KeyboardAvoidingView>
            </Modal>
          </View>
          <View style={[styles.containerStyle, { gap: 16 }]}>
            <View style={styles.categoryHeader}>
              <Text
                style={[styles.categoryLabel, { color: theme.colors.text }]}
              >
                Banco
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.editButtonPressed,
                ]}
                onPress={() => setShowBankModal(true)}
              >
                <Feather name="edit" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <Dropdown
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderBottomColor: theme.colors.border,
                  width: "60%",
                },
              ]}
              placeholderStyle={[
                styles.placeholderStyle,
                { color: theme.colors.placeholder },
              ]}
              selectedTextStyle={[
                styles.selectedTextStyle,
                { color: theme.colors.text, textAlign: "center" },
              ]}
              inputSearchStyle={[
                styles.inputSearchStyle,
                { color: theme.colors.text },
              ]}
              iconStyle={styles.iconStyle}
              containerStyle={{
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                borderRadius: 30,
              }}
              itemContainerStyle={{
                backgroundColor: theme.colors.inputBackground,
                borderRadius: 30,
              }}
              itemTextStyle={{
                color: theme.colors.text,
                fontSize: 14,
                textAlign: "center",
              }}
              activeColor={theme.colors.primary + "20"}
              data={bankList}
              labelField="label"
              valueField="value"
              placeholder="Seleccionar banco"
              searchPlaceholder="Buscar..."
              value={selectedBank?.value}
              onChange={(item) => {
                setSelectedBank(item);
              }}
            />
            <Modal
              transparent={false}
              animationType="slide"
              visible={showBankModal}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <SafeAreaProvider>
                  <SafeAreaView
                    style={[
                      { flex: 1 },
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Pressable
                        onPress={() => {
                          setShowBankModal(false);
                          setVisibleInputBank(false);
                          setInputBank("");
                        }}
                        style={styles.iconButton}
                      >
                        {({ pressed }) => (
                          <AntDesign
                            name="close"
                            size={24}
                            color={
                              pressed
                                ? theme.colors.textSecondary
                                : theme.colors.text
                            }
                          />
                        )}
                      </Pressable>
                      <Text
                        style={[
                          styles.modalTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        Bancos
                      </Text>
                      <Pressable
                        onPress={() => setVisibleInputBank(!visibleInputBank)}
                        style={styles.iconButton}
                      >
                        {({ pressed }) => (
                          <AntDesign
                            name={visibleInputBank ? "close" : "plus"}
                            size={24}
                            color={
                              pressed
                                ? theme.colors.textSecondary
                                : theme.colors.text
                            }
                          />
                        )}
                      </Pressable>
                    </View>
                    {visibleInputBank && (
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[
                            styles.categoryInput,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              color: theme.colors.text,
                            },
                          ]}
                          placeholder="Nuevo banco"
                          placeholderTextColor={theme.colors.placeholder}
                          value={inputBank}
                          onChangeText={setInputBank}
                        />
                        <Pressable
                          style={({ pressed }) => [
                            styles.addButton,
                            { backgroundColor: theme.colors.primary },
                            pressed && styles.addButtonPressed,
                          ]}
                          onPress={() => addBank()}
                        >
                          <Text style={styles.addButtonText}>Agregar</Text>
                        </Pressable>
                      </View>
                    )}
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <GHScrollView>
                        {bankList.map((b) => (
                          <SwipeableCategoryItem
                            key={b.value}
                            cat={b}
                            onDelete={deleteBank}
                            onEdit={(value, newLabel) =>
                              updateBank(value, newLabel)
                            }
                            isLoading={updatingBank === b.value}
                            emptyNameMessage="El nombre del banco no puede estar vacío."
                            renameConfirmMessage="¿Está seguro que desea cambiar el nombre del banco?"
                          />
                        ))}
                      </GHScrollView>
                    </GestureHandlerRootView>
                  </SafeAreaView>
                </SafeAreaProvider>
              </KeyboardAvoidingView>
            </Modal>
          </View>
          <View style={styles.containerStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                pressed && styles.submitButtonPressed,
              ]}
              onPress={submitTxn}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar transacción</Text>
              )}
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  dropdownContainerStyle: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  containerStyle: {
    padding: 8,
    gap: 8,
    // borderWidth: 0.5,
    borderColor: "gray",
    alignItems: "center",
    justifyContent: "space-around",
  },
  dropdown: {
    height: 40,
    width: "75%",
    borderRadius: 40,
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: 5,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 20,
  },
  labelText: {
    fontWeight: "600",
  },

  currencyInput: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: 150,
    textAlign: "center",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  categoryLabel: {
    fontWeight: "600",
    fontSize: 16,
  },
  editButton: {
    position: "absolute",
    right: 100,
    borderRadius: 8,
    padding: 8,
  },
  editButtonPressed: {
    opacity: 0.5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryInput: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#000000",
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#0a84ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  subCategoryContainer: {
    width: "100%",
  },
  subCategoryInputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 16,
  },
  subCategoryInput: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#000000",
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  subCategoryAddButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  subCategoryAddButtonPressed: {
    opacity: 0.8,
  },
  addSubcategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addSubcategoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    position: "absolute",
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  submitButton: {
    width: "50%",
    borderRadius: 30,
    padding: 12,
    alignItems: "center",
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
