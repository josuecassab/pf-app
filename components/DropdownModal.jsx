import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CurrencyInput from "react-native-currency-input";
import { Dropdown } from "react-native-element-dropdown";
import { useTheme } from "../contexts/ThemeContext";

export default function DropdownModal({
  visible = false,
  onClose,
  onDone,
  title = "Seleccionar",
  cancelLabel = "Cancel",
  doneLabel = "Done",
  // Dropdown props (when data is provided, Dropdown is shown)
  data,
  value,
  onChange,
  labelField = "label",
  valueField = "value",
  placeholder = "Seleccionar item",
  searchPlaceholder = "Buscar...",
  search = true,
  maxHeight = 280,
  dropdownProps = {},
  type,
  // For type="picker": initial { year, month } and receive selection on Done
  pickerValue,
  // For type="currency": filter by value
  currencyValue,
  onCurrencyValueChange,
  // Custom content when no dropdown data
  children,
}) {
  const { theme } = useTheme();
  const showDropdown = Array.isArray(data);
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(
    pickerValue?.year ?? String(currentYear),
  );
  const [tempMonth, setTempMonth] = useState(
    pickerValue?.month ?? currentMonth,
  );

  useEffect(() => {
    if (visible && type === "picker") {
      setTempYear(pickerValue?.year ?? String(currentYear));
      setTempMonth(pickerValue?.month ?? currentMonth);
    }
  }, [visible, type, pickerValue?.year, pickerValue?.month]);

  const handleRequestClose = () => {
    if (typeof onClose === "function") onClose();
  };

  const handleDone = () => {
    if (
      type === "picker" &&
      tempYear &&
      tempMonth &&
      typeof onChange === "function"
    ) {
      onChange({ year: tempYear, month: tempMonth });
    }
    if (typeof onDone === "function") onDone();
    handleRequestClose();
  };

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = 2020; year <= currentYear; year++) {
      years.push(String(year));
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => {
    const months = [
      { value: "1", label: "Enero" },
      { value: "2", label: "Febrero" },
      { value: "3", label: "Marzo" },
      { value: "4", label: "Abril" },
      { value: "5", label: "Mayo" },
      { value: "6", label: "Junio" },
      { value: "7", label: "Julio" },
      { value: "8", label: "Agosto" },
      { value: "9", label: "Septiembre" },
      { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" },
      { value: "12", label: "Diciembre" },
    ];
    return months;
  }, []);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Pressable
          style={[
            styles.overlay,
            { backgroundColor: theme.colors.modalOverlay },
          ]}
          onPress={handleRequestClose}
        >
          <Pressable
            style={[
              styles.content,
              { backgroundColor: theme.colors.modalBackground, height: "50%" },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Pressable
                onPress={handleRequestClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {cancelLabel}
                </Text>
              </Pressable>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Pressable
                onPress={handleDone}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {doneLabel}
                </Text>
              </Pressable>
            </View>
            <View style={styles.body}>
              {type === "currency" ? (
                <View style={styles.currencyContainer}>
                  <CurrencyInput
                    style={[
                      styles.currencyInput,
                      {
                        backgroundColor: theme.colors.inputBackground,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    value={currencyValue ?? null}
                    onChangeValue={onCurrencyValueChange}
                    delimiter="."
                    separator=","
                    precision={2}
                    keyboardType="number-pad"
                    placeholder="Filtrar por valor"
                    placeholderTextColor={theme.colors.placeholder}
                  />
                </View>
              ) : type === "dropdown" ? (
                <Dropdown
                  data={data}
                  value={value}
                  onChange={onChange}
                  labelField={labelField}
                  valueField={valueField}
                  placeholder={placeholder}
                  searchPlaceholder={searchPlaceholder}
                  search={search}
                  maxHeight={maxHeight}
                  dropdownPosition="bottom"
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderBottomColor: theme.colors.border,
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
                    {
                      color: theme.colors.text,
                      backgroundColor: theme.colors.inputBackground,
                    },
                  ]}
                  iconStyle={styles.iconStyle}
                  containerStyle={[
                    styles.dropdownContainer,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  itemContainerStyle={{
                    backgroundColor: theme.colors.inputBackground,
                  }}
                  itemTextStyle={{ color: theme.colors.text }}
                  activeColor={theme.colors.primary + "20"}
                  {...dropdownProps}
                />
              ) : (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Picker
                      selectedValue={tempYear}
                      onValueChange={(itemValue) => setTempYear(itemValue)}
                      style={{ color: theme.colors.text }}
                      itemStyle={{ fontSize: 18, color: theme.colors.text }}
                    >
                      {yearOptions.map((year) => (
                        <Picker.Item key={year} label={year} value={year} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.pickerColumn}>
                    <Picker
                      selectedValue={tempMonth}
                      onValueChange={(itemValue) => setTempMonth(itemValue)}
                      style={{ color: theme.colors.text }}
                      itemStyle={{ fontSize: 18, color: theme.colors.text }}
                    >
                      {monthOptions.map((month) => (
                        <Picker.Item
                          key={month.value}
                          label={month.label}
                          value={month.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 16,
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerButton: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPressed: {
    opacity: 0.7,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 8,
  },
  body: {
    paddingVertical: 8,
  },
  dropdown: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 22,
    height: 22,
  },
  inputSearchStyle: {
    // height: 44,
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  pickerColumn: {
    flex: 1,
  },
  currencyContainer: {
    paddingVertical: 8,
  },
  currencyInput: {
    fontSize: 16,
    textAlign: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
});
