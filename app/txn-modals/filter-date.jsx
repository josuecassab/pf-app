import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CloseButton from "../../components/CloseButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useTxnFilterModalSubmit } from "../../hooks/useTxnFilterModalSubmit";
import { parseJsonParam } from "../../lib/txnFilterModalParams";

const HEADER = "Fecha";

const MONTH_OPTIONS = [
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

export default function TxnModalFilterDate() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const { closeModal, submit } = useTxnFilterModalSubmit();

  const filterDate = useMemo(
    () => parseJsonParam(params.filterDateJson, null),
    [params.filterDateJson],
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(
    filterDate?.year ?? String(currentYear),
  );
  const [tempMonth, setTempMonth] = useState(
    filterDate?.month ?? currentMonth,
  );

  useEffect(() => {
    setTempYear(filterDate?.year ?? String(currentYear));
    setTempMonth(filterDate?.month ?? currentMonth);
  }, [filterDate, currentYear, currentMonth]);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = 2020; year <= currentYear; year++) {
      years.push(String(year));
    }
    return years;
  }, [currentYear]);

  const handleListo = () => {
    if (tempYear && tempMonth) {
      submit(HEADER, { year: tempYear, month: tempMonth });
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View
            style={[
              styles.embeddedRoot,
              { flex: 1, backgroundColor: theme.colors.modalBackground },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerSide}>
                <CloseButton onPress={closeModal} />
              </View>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {HEADER}
              </Text>
              <Pressable
                onPress={handleListo}
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
                  Listo
                </Text>
              </Pressable>
            </View>
            <View style={[styles.body, styles.bodyFlex]}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerColumn}>
                  <Picker
                    selectedValue={tempYear}
                    onValueChange={setTempYear}
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
                    onValueChange={setTempMonth}
                    style={{ color: theme.colors.text }}
                    itemStyle={{ fontSize: 18, color: theme.colors.text }}
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <Picker.Item
                        key={month.value}
                        label={month.label}
                        value={month.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  embeddedRoot: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerSide: {
    minWidth: 64,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerButton: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPressed: { opacity: 0.7 },
  headerButtonText: { fontSize: 17, fontWeight: "400" },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 8,
  },
  body: { paddingVertical: 8 },
  bodyFlex: { flex: 1 },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  pickerColumn: { flex: 1 },
});
