import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useQueryClient } from "@tanstack/react-query";
import * as Localization from "expo-localization";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useBanks } from "../../hooks/useBanks";
import { useCategories } from "../../hooks/useCategories";
import { usePersistedBankSelection } from "../../hooks/usePersistedBankSelection";
import { useSubcategories } from "../../hooks/useSubcategories";
import { authJsonHeaders } from "../../lib/apiHeaders";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
/** Stable empty list for Dropdown `data` — inline `[]` breaks react-native-element-dropdown (new ref each render → max update depth). */
const EMPTY_DROPDOWN_DATA = [];
const EMPTY_BANK_LIST = EMPTY_DROPDOWN_DATA;
const EMPTY_SUBCATEGORIES_LIST = EMPTY_DROPDOWN_DATA;
const CURRENCIES = ["COP", "USD"];

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

/** Locale used for separators when falling back to Intl-based inference. */
function resolveNumberFormatLocaleTag() {
  try {
    return Intl.NumberFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/**
 * expo-localization reads decimal/grouping separators straight from the OS
 * locale (NSLocale on iOS), which correctly reflects the device's Region /
 * Number Format setting. Intl.NumberFormat's default locale does not always
 * track that setting, so it's only used as a fallback (e.g. on web).
 */
function getAmountFormattingConfig() {
  try {
    const [locale] = Localization.getLocales();
    if (locale?.decimalSeparator && locale?.digitGroupingSeparator) {
      return {
        decimal: locale.decimalSeparator,
        group: locale.digitGroupingSeparator,
      };
    }
  } catch {
    // fall through to Intl-based inference
  }
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

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function SearchableSelect({
  open,
  onOpen,
  onClose,
  data,
  labelField,
  valueField,
  value,
  placeholder,
  searchPlaceholder,
  disable = false,
  theme,
  onChange,
}) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timeoutId = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timeoutId);
  }, [open]);

  const selected = data.find((item) => item[valueField] === value);
  const filtered = useMemo(() => {
    if (!query) return data;
    const key = normalizeSearchText(query);
    return data.filter((item) =>
      normalizeSearchText(item[labelField]).includes(key),
    );
  }, [data, query, labelField]);

  if (disable || !open) {
    return (
      <Pressable
        disabled={disable}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.selectField,
          { backgroundColor: theme.colors.inputBackground },
          disable && styles.selectFieldDisabled,
          pressed && !disable && { opacity: 0.85 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            selected ? styles.selectedTextStyle : styles.placeholderStyle,
            {
              color: selected
                ? theme.colors.text
                : theme.colors.placeholder,
              flex: 1,
            },
          ]}
        >
          {selected ? selected[labelField] : placeholder}
        </Text>
        <Feather
          name="chevron-down"
          size={18}
          color={theme.colors.placeholder}
        />
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.selectOpen,
        { backgroundColor: theme.colors.inputBackground },
      ]}
    >
      <View
        style={[
          styles.selectSearchRow,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Feather name="search" size={16} color={theme.colors.placeholder} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.colors.placeholder}
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.selectSearchInput, { color: theme.colors.text }]}
        />
        <Pressable
          accessibilityLabel="Cerrar búsqueda"
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.55 }]}
        >
          <Feather name="x" size={18} color={theme.colors.placeholder} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        style={styles.selectResults}
      >
        {filtered.length === 0 ? (
          <Text
            style={[
              styles.selectEmpty,
              { color: theme.colors.placeholder },
            ]}
          >
            Sin resultados
          </Text>
        ) : (
          filtered.map((item) => {
            const isActive = item[valueField] === value;
            return (
              <Pressable
                key={String(item[valueField])}
                onPress={() => {
                  onChange(item);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.selectItem,
                  isActive && { backgroundColor: `${theme.colors.primary}20` },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.selectItemText, { color: theme.colors.text }]}
                >
                  {item[labelField]}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [date, setDate] = useState(new Date());
  const [txtType, setTxnType] = useState(1);
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const txnsQueryKey = useMemo(() => ["txns", tenantId], [tenantId]);
  const { theme } = useTheme();
  const amountSeparators = useMemo(() => getAmountFormattingConfig(), []);
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories();
  const { data: banksData, isLoading: isLoadingBanks } = useBanks();
  const { data: subcategoriesData, isLoading: isLoadingSubcategories } =
    useSubcategories();
  const bankList = Array.isArray(banksData) ? banksData : EMPTY_BANK_LIST;
  const subcategoryList = Array.isArray(subcategoriesData)
    ? subcategoriesData
    : EMPTY_SUBCATEGORIES_LIST;
  const { selectedBank, selectBank } = usePersistedBankSelection(
    bankList,
    tenantId,
  );
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [openSelect, setOpenSelect] = useState(null);
  const scrollViewRef = useRef(null);
  const scrollOffsetY = useRef(0);
  const categoryAnchorRef = useRef(null);
  const subcategoryAnchorRef = useRef(null);
  const bankAnchorRef = useRef(null);

  const handleFormScroll = useCallback((event) => {
    scrollOffsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollAnchorToTop = useCallback((anchorRef) => {
    const scrollView = scrollViewRef.current;
    const anchor = anchorRef.current;
    if (!scrollView || !anchor) return;

    scrollView.measureInWindow((_sx, scrollViewY) => {
      anchor.measureInWindow((_ax, anchorY) => {
        const delta = anchorY - scrollViewY - 8;
        if (Math.abs(delta) < 2) return;
        scrollView.scrollTo({
          y: Math.max(0, scrollOffsetY.current + delta),
          animated: true,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (openSelect == null) return;
    const anchorRef =
      openSelect === "category"
        ? categoryAnchorRef
        : openSelect === "subcategory"
          ? subcategoryAnchorRef
          : bankAnchorRef;
    const frame = requestAnimationFrame(() => scrollAnchorToTop(anchorRef));
    return () => cancelAnimationFrame(frame);
  }, [openSelect, scrollAnchorToTop]);

  const subcategoriesMap = useMemo(() => {
    const subcategoriesMap = {};
    for (const subcategory of subcategoryList) {
      let val = subcategoriesMap[subcategory.category_id] ?? [];
      val.push(subcategory);
      subcategoriesMap[subcategory.category_id] = val;
    }
    return subcategoriesMap;
  }, [subcategoryList]);

  const onChange = (_event, selectedDate) => {
    if (selectedDate) setDate(selectedDate);
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
    if (!tenantId) {
      Alert.alert(
        "Sesión",
        "Inicia sesión de nuevo para agregar transacciones.",
      );
      return;
    }
    setIsSending(true);
    const txn = {};
    // Format date in local timezone as YYYY-MM-DD (using 'en-CA' locale for ISO format)
    txn.date = date.toLocaleDateString("en-CA");
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
    txn.amount = txtType === 0 ? parsedAmount : -1 * parsedAmount;
    txn.currency = selectedCurrency;
    if (selectedCategory?.value) {
      txn.category_id = selectedCategory.value;
    } else {
      Alert.alert("Error de validación", "Porfavor seleccione una categoria");
      setIsSending(false);
      return;
    }
    txn.subcategory_id = selectedSubcategory?.value
      ? selectedSubcategory.value
      : null;
    const selectedBankId = selectedBank?.id ?? selectedBank?.value;
    if (selectedBankId != null && selectedBankId !== "") {
      txn.bank_id = selectedBankId;
    } else {
      Alert.alert("Error de validación", "Por favor seleccione un banco");
      setIsSending(false);
      return;
    }

    console.log(txn);
    try {
      const res = await fetch(`${API_URL}/insert_txn/`, {
        method: "POST",
        headers: authJsonHeaders(getAuthHeaders),
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

      if (data?.id != null) {
        queryClient.setQueryData(txnsQueryKey, (oldData) => {
          const newTxn = {
            id: data.id,
            date: data.date,
            description: data.description ?? null,
            amount: data.amount,
            currency: data.currency ?? selectedCurrency,
            category_id: data.category_id,
            subcategory_id: data.subcategory_id ?? null,
            bank_id: data.bank_id,
            reconciled: data.reconciled ?? false,
          };
          if (!oldData?.pages) {
            return {
              pageParams: [{ page: 0, limit: 100 }],
              pages: [[newTxn]],
            };
          }
          const pages = [...oldData.pages];
          const first = pages[0];
          if (Array.isArray(first)) {
            const exists = first.some((t) => String(t.id) === String(newTxn.id));
            pages[0] = exists ? first : [newTxn, ...first];
          } else {
            pages[0] = [newTxn];
          }
          return { ...oldData, pages };
        });
      }

      setValue("");
    } catch (error) {
      console.error("Error submitting transaction:", error);
      Alert.alert("Error enviando la transacción", error.message);
    } finally {
      setIsSending(false);
      setSelectedSubcategory(null);
    }
  };

  const amountColor =
    value === ""
      ? theme.colors.text
      : txtType === 0
        ? theme.colors.success
        : theme.colors.error;

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            openSelect != null && styles.scrollContentSelectOpen,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          onScroll={handleFormScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.amountSection}>
            <View style={styles.currencyInputWrapper}>
              <TextInput
                style={[
                  styles.currencyInput,
                  {
                    color: amountColor,
                    paddingRight: value ? 40 : 16,
                  },
                ]}
                value={value}
                onChangeText={handleAmountChangeText}
                onBlur={handleAmountBlur}
                keyboardType="decimal-pad"
                placeholder={`0${amountSeparators.decimal}00`}
                placeholderTextColor={theme.colors.placeholder}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              />
              {value !== "" ? (
                <Pressable
                  accessibilityLabel="Limpiar valor"
                  onPress={() => setValue("")}
                  style={({ pressed }) => [
                    styles.currencyClearButton,
                    pressed && { opacity: 0.55 },
                  ]}
                  hitSlop={10}
                >
                  <Feather
                    name="x"
                    size={20}
                    color={theme.colors.placeholder}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.toggleRow}>
              <Text
                style={[
                  styles.fieldLabel,
                  styles.toggleLabel,
                  { color: theme.colors.text },
                ]}
              >
                Moneda
              </Text>
              <View style={styles.segmentWrap}>
                <SegmentedControl
                  style={styles.fullSegment}
                  values={CURRENCIES}
                  selectedIndex={Math.max(
                    0,
                    CURRENCIES.indexOf(selectedCurrency),
                  )}
                  appearance={theme.isDark ? "dark" : "light"}
                  onChange={(event) => {
                    const index = event.nativeEvent.selectedSegmentIndex;
                    setSelectedCurrency(CURRENCIES[index] ?? CURRENCIES[0]);
                  }}
                  tintColor={theme.colors.primary}
                  activeFontStyle={{ color: "#ffffff" }}
                />
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.toggleRow}>
              <Text
                style={[
                  styles.fieldLabel,
                  styles.toggleLabel,
                  { color: theme.colors.text },
                ]}
              >
                Tipo
              </Text>
              <View style={styles.segmentWrap}>
                <SegmentedControl
                  style={styles.fullSegment}
                  values={["Ingreso", "Egreso"]}
                  selectedIndex={txtType}
                  appearance={theme.isDark ? "dark" : "light"}
                  onChange={(event) => {
                    setTxnType(event.nativeEvent.selectedSegmentIndex);
                  }}
                  tintColor={
                    txtType === 0 ? theme.colors.success : theme.colors.error
                  }
                  activeFontStyle={{ color: "#ffffff" }}
                />
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.dateRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Fecha
              </Text>
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                onChange={onChange}
                textColor={theme.colors.text}
                themeVariant={theme.isDark ? "dark" : "light"}
                display="default"
                accentColor={theme.colors.primary}
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Categoría
              </Text>
              <Pressable
                accessibilityLabel="Editar categorías"
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.editButtonPressed,
                ]}
                onPress={() => router.push("/manage-categories")}
                hitSlop={8}
              >
                <Feather
                  name="edit-2"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
            <View ref={categoryAnchorRef} collapsable={false}>
              <SearchableSelect
                open={openSelect === "category"}
                onOpen={() => setOpenSelect("category")}
                onClose={() => setOpenSelect(null)}
                data={categoriesData ?? EMPTY_DROPDOWN_DATA}
                labelField="label"
                valueField="value"
                value={selectedCategory?.value}
                placeholder={
                  isLoadingCategories ? "Cargando..." : "Seleccionar categoría"
                }
                searchPlaceholder="Buscar..."
                theme={theme}
                onChange={(item) => {
                  setSelectedCategory({
                    label: item.label,
                    value: item.value,
                  });
                  setSelectedSubcategory(null);
                }}
              />
            </View>
            <View ref={subcategoryAnchorRef} collapsable={false}>
              <SearchableSelect
                open={openSelect === "subcategory"}
                onOpen={() => setOpenSelect("subcategory")}
                onClose={() => setOpenSelect(null)}
                data={
                  subcategoriesMap[selectedCategory?.value] ??
                  EMPTY_DROPDOWN_DATA
                }
                labelField="label"
                valueField="value"
                value={selectedSubcategory?.value}
                placeholder={
                  isLoadingSubcategories
                    ? "Cargando..."
                    : selectedCategory
                      ? "Seleccionar subcategoría"
                      : "Primero elige categoría"
                }
                searchPlaceholder="Buscar..."
                disable={!selectedCategory}
                theme={theme}
                onChange={(item) => {
                  setSelectedSubcategory({
                    label: item.label,
                    value: item.value,
                  });
                }}
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Banco
              </Text>
              <Pressable
                accessibilityLabel="Editar bancos"
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.editButtonPressed,
                ]}
                onPress={() => router.push("/manage-banks")}
                hitSlop={8}
              >
                <Feather
                  name="edit-2"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
            <View ref={bankAnchorRef} collapsable={false}>
              <SearchableSelect
                open={openSelect === "bank"}
                onOpen={() => setOpenSelect("bank")}
                onClose={() => setOpenSelect(null)}
                data={bankList}
                labelField="name"
                valueField="id"
                value={selectedBank?.id ?? selectedBank?.value}
                placeholder={
                  isLoadingBanks ? "Cargando..." : "Seleccionar banco"
                }
                searchPlaceholder="Buscar..."
                theme={theme}
                onChange={selectBank}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={isSending}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
              (pressed || isSending) && styles.submitButtonPressed,
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  scrollContentSelectOpen: {
    paddingBottom: 280,
  },
  amountSection: {
    paddingVertical: 4,
  },
  currencyInputWrapper: {
    position: "relative",
    width: "100%",
    justifyContent: "center",
  },
  currencyInput: {
    fontSize: 40,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  currencyClearButton: {
    position: "absolute",
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  fullSegment: {
    width: "100%",
    height: 36,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    width: 72,
  },
  segmentWrap: {
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontWeight: "600",
    fontSize: 15,
  },
  selectField: {
    height: 44,
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectOpen: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  selectSearchRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  selectResults: {
    maxHeight: 220,
  },
  selectItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  selectItemText: {
    fontSize: 14,
  },
  selectEmpty: {
    fontSize: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  editButton: {
    borderRadius: 8,
    padding: 6,
  },
  editButtonPressed: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  submitButton: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
});
