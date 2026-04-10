import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useBanks } from "../../hooks/useBanks";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** gs://bucket/<bank_slug>/file.xlsx → matching bank option from list, if known */
function bankFromStatementGcsUri(uri, bankOptions) {
  if (!uri || typeof uri !== "string") return null;
  const match = uri.match(/^gs:\/\/[^/]+\/([^/]+)\//);
  if (!match) return null;
  const slug = match[1];
  return bankOptions.find((b) => b.value === slug) ?? null;
}

const DROPDOWN_SELECTED_TEXT_PROPS = {
  numberOfLines: 1,
  ellipsizeMode: "tail",
};

function navigateToReconcileResults(params) {
  router.push({
    pathname: "/reconcile/reconcile-results",
    params,
  });
}

export default function Reconcile() {
  const { theme } = useTheme();
  const { schema } = useAuth();
  const queryClient = useQueryClient();
  const { data: banksFromApi } = useBanks();
  const bankList = Array.isArray(banksFromApi) ? banksFromApi : [];
  const [file, setFile] = useState(null);
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchStatements = useCallback(async () => {
    if (!schema || !selectedBank?.label) return;
    try {
      const data = await fetch(
        `${API_URL}/list_statements?schema=${schema}&bank_name=${selectedBank.label}`,
      ).then((res) => res.json());
      console.log("data:", data);
      const statements = data.map((item) => ({
        label: item.split("/").at(-1).split(".")[0],
        value: item,
      }));
      setStatements(statements);
      setSelectedStatement((prev) => {
        if (prev && statements.some((s) => s.value === prev.value)) {
          return prev;
        }
        return statements[0] ?? null;
      });
    } catch (error) {
      console.error("Error fetching statements:", error);
    }
  }, [schema, selectedBank?.label]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  // Table rendering — column widths from StyleSheet (same pattern as TxnTable)
  const headerColumnStyle = {
    Fecha: reconcileStyles.colFecha,
    Descripcion: reconcileStyles.colDescripcion,
    Valor: reconcileStyles.colValor,
    Saldo: reconcileStyles.colSaldo,
    Banco: reconcileStyles.colBanco,
  };

  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [selectedStatement?.label],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/statements?table=${selectedStatement.label}&schema=${schema}`,
      );
      return await response.json();
    },
    enabled: !!selectedStatement?.label,
  });

  const handleUpload = async () => {
    if (!file) {
      return alert("Select a file first");
    }
    if (!selectedBank?.label) {
      return alert("Select a bank first");
    }
    setIsLoading(true);

    try {
      // 1️⃣ Get signed URL from backend
      const res = await fetch(
        `${API_URL}/generate_upload_url?bank_name=${selectedBank?.label}&filename=${encodeURIComponent(file.name)}&schema=${schema}`,
      );
      const { url } = await res.json();
      console.log("Uploading file:", file);

      // 2️⃣ Read the file from URI as blob
      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();

      // 3️⃣ Upload file directly to GCS
      const upload = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type":
            file.mimeType ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: blob,
      });

      const responseBody = await upload.text();
      console.log("Upload response body:", responseBody);

      if (upload.ok) {
        Alert.alert("Éxito", "✅ File uploaded successfully!");
        const gcsURI = url
          .split("?")[0]
          .split("https://storage.googleapis.com/")[1];
        console.log("GCS URI:", "gs://" + gcsURI);
        try {
          const result = await fetch(
            `${API_URL}/create_statement_table?schema=${schema}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                gcs_uri: "gs://" + gcsURI,
                bank_name: selectedBank.label,
              }),
            },
          ).then((res) => res.json());
          console.log(result);
        } catch (error) {
          console.error("Error processing statement:", error);
        }
        fetchStatements();
      } else {
        Alert.alert("Error", "❌ Upload failed.");
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      Alert.alert("Error", "❌ Upload failed: " + error.message);
      setIsLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Allow all file types
        copyToCacheDirectory: true,
        multiple: false, // Set to true to allow selecting multiple files
      });

      // Check if the user canceled the action
      if (!result.canceled) {
        // Success: The result contains an 'assets' array
        const pickedFile = result.assets[0];
        setFile(pickedFile);
        console.log("File picked:", pickedFile);
      } else {
        console.log("User canceled the document picker");
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const reconcile = async () => {
    if (!selectedStatement?.label) {
      Alert.alert("Error", "Por favor selecciona un extracto primero");
      return;
    }
    if (!selectedBank?.label) {
      Alert.alert("Error", "Por favor selecciona el banco del extracto");
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/create_statement_joined?table_name=${selectedStatement.label}&schema=${schema}&bank_name=${selectedBank.label}`,
        {
          method: "POST",
        },
      );
      const response = await res.json();
      if (!res.ok) {
        Alert.alert("Error", response.message);
        return;
      }
      console.log("Reconciliation result:", response);
      // Invalidate queries to refetch the data
      queryClient.invalidateQueries({
        queryKey: ["matched_txns", `${selectedStatement.label}_joined`],
      });
      queryClient.invalidateQueries({
        queryKey: ["unmatched_txns", selectedStatement.label],
      });
      navigateToReconcileResults({
        statementLabel: selectedStatement.label,
        bankLabel: selectedBank.label,
      });
    } catch (error) {
      console.error("Error reconciling transactions:", error);
      Alert.alert("Error", "Error al conciliar transacciones");
    }
  };

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

  const renderHeaderCell = (label) => (
    <View
      style={[
        reconcileStyles.headerCell,
        headerColumnStyle[label],
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[reconcileStyles.headerText, { color: theme.colors.text }]}>
        {label}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={reconcileStyles.row}>
      {renderHeaderCell("Fecha")}
      {renderHeaderCell("Descripcion")}
      {renderHeaderCell("Valor")}
      {renderHeaderCell("Saldo")}
      {renderHeaderCell("Banco")}
    </View>
  );

  const renderFechaCell = (value) => (
    <View
      style={[
        reconcileStyles.cell,
        reconcileStyles.colFecha,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );

  const renderDescripcionCell = (value) => (
    <View
      style={[
        reconcileStyles.cell,
        reconcileStyles.colDescripcion,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderValorCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          reconcileStyles.cell,
          reconcileStyles.colValor,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderSaldoCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          reconcileStyles.cell,
          reconcileStyles.colSaldo,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderBancoCell = (value) => (
    <View
      style={[
        reconcileStyles.cell,
        reconcileStyles.colBanco,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text
        style={[reconcileStyles.cellText, { color: theme.colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value && value.toLowerCase()}
      </Text>
    </View>
  );

  const renderTxns = (item) => (
    <View style={reconcileStyles.row}>
      {renderFechaCell(item.fecha)}
      {renderDescripcionCell(item?.descripcion)}
      {renderValorCell(item.valor)}
      {renderSaldoCell(item.saldo)}
      {renderBancoCell(item?.banco)}
    </View>
  );

  const renderFooter = () => {
    if (!isFetching) return null;
    return (
      <View style={reconcileStyles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  };
  return (
    <SafeAreaView
      style={[
        reconcileStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={reconcileStyles.headerSection}>
        <Text style={[reconcileStyles.title, { color: theme.colors.text }]}>
          Conciliar
        </Text>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />
        <View style={reconcileStyles.section}>
          <View style={reconcileStyles.filePickAndUploadRow}>
            <View
              style={[
                styles.dropdown,
                reconcileStyles.bankDropdown,
                reconcileStyles.filePickButton,
                reconcileStyles.filePickBar,
                { backgroundColor: theme.colors.inputBackground },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  reconcileStyles.filePickBarMain,
                  pressed && reconcileStyles.filePickBarPressed,
                ]}
                onPress={pickDocument}
              >
                <Text
                  style={
                    file
                      ? [styles.selectedTextStyle, { color: theme.colors.text }]
                      : [
                          styles.placeholderStyle,
                          { color: theme.colors.placeholder },
                        ]
                  }
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {file ? file.name : "Seleccionar extracto"}
                </Text>
              </Pressable>
              {file ? (
                <Pressable
                  style={({ pressed }) => [
                    reconcileStyles.filePickClearHit,
                    pressed && reconcileStyles.filePickBarPressed,
                  ]}
                  onPress={() => setFile(null)}
                  accessibilityLabel="Quitar archivo seleccionado"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            {file && (
              <Pressable
                style={({ pressed }) => [
                  reconcileStyles.uploadButton,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                  pressed && reconcileStyles.uploadButtonPressed,
                ]}
                onPress={handleUpload}
              >
                <Text style={reconcileStyles.uploadButtonText}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    "Cargar"
                  )}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={reconcileStyles.selectBlock}>
            <Text
              style={[reconcileStyles.fieldLabel, { color: theme.colors.text }]}
            >
              Banco del extracto
            </Text>
            <Dropdown
              style={[
                styles.dropdown,
                reconcileStyles.bankDropdown,
                { backgroundColor: theme.colors.inputBackground },
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
                borderColor: theme.colors.border,
                borderRadius: 8,
              }}
              itemContainerStyle={{
                borderBottomColor: theme.colors.borderLight,
              }}
              itemTextStyle={{ color: theme.colors.text }}
              activeColor={theme.colors.border}
              selectedTextProps={DROPDOWN_SELECTED_TEXT_PROPS}
              data={bankList}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Seleccionar banco"
              value={selectedBank?.value}
              onChange={(item) => {
                setSelectedBank({ label: item.label, value: item.value });
              }}
            />
            {file && (
              <Text
                style={[
                  reconcileStyles.uploadBankHint,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Se cargará en{" "}
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                  {selectedBank?.label ?? "—"}
                </Text>
                . Cambia «Banco» arriba si no corresponde.
              </Text>
            )}
          </View>
          <View style={reconcileStyles.statementRow}>
            <Text
              style={[reconcileStyles.fieldLabel, { color: theme.colors.text }]}
            >
              Extracto
            </Text>
            <View style={reconcileStyles.statementActionsRow}>
              <View style={reconcileStyles.statementDropdownFlex}>
                <Dropdown
                  style={[
                    styles.dropdown,
                    reconcileStyles.bankDropdown,
                    { backgroundColor: theme.colors.inputBackground },
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
                    borderColor: theme.colors.border,
                    borderRadius: 8,
                  }}
                  itemContainerStyle={{
                    borderBottomColor: theme.colors.borderLight,
                  }}
                  itemTextStyle={{ color: theme.colors.text }}
                  activeColor={theme.colors.border}
                  selectedTextProps={DROPDOWN_SELECTED_TEXT_PROPS}
                  data={statements}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Seleccionar extracto"
                  value={selectedStatement?.value}
                  onChange={(item) => {
                    setSelectedStatement({
                      label: item.label,
                      value: item.value,
                    });
                    const bank = bankFromStatementGcsUri(item.value, bankList);
                    if (bank) {
                      setSelectedBank(bank);
                    }
                  }}
                />
              </View>
              <Pressable
                onPress={reconcile}
                style={({ pressed }) => [
                  reconcileStyles.uploadButton,
                  { backgroundColor: theme.colors.primary },
                  pressed && reconcileStyles.uploadButtonPressed,
                ]}
              >
                <Text style={reconcileStyles.uploadButtonText}>Conciliar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={[
          reconcileStyles.scrollView,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <FlatList
          style={[
            reconcileStyles.flatList,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
          keyExtractor={(item, index) => index}
          data={data}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => renderTxns(item)}
          stickyHeaderIndices={[0]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
