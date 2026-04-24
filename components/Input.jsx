import Feather from "@expo/vector-icons/Feather";
import { router, useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useBanks } from "../hooks/useBanks";
import { useCategories } from "../hooks/useCategories";
import { takePendingBankSelection } from "../lib/pendingBankSelection";

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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [txtType, setTxnType] = useState(1);
  const [txtData, setTxnData] = useState({});
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const { schema } = useAuth();

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // NativeTabs (expo-router) does not provide @react-navigation/bottom-tabs context.
  const tabBarHeight =
    Platform.OS === "ios" ? 49 + insets.bottom : 56 + insets.bottom;

  const amountSeparators = useMemo(() => getAmountFormattingConfig(), []);

  const { isPending, error, data, isFetching } = useCategories();
  const categoryOptions = Array.isArray(data) ? data : [];
  const { data: banksData } = useBanks();
  const bankList = Array.isArray(banksData) ? banksData : EMPTY_BANK_LIST;

  console.log(value);

  useFocusEffect(
    useCallback(() => {
      const bank = takePendingBankSelection();
      if (bank) setSelectedBank(bank);
    }, []),
  );

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
                onPress={() => router.push("/manage-categories")}
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
              data={categoryOptions}
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
                onPress={() => router.push("/manage-banks")}
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
