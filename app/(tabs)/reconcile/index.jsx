import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { PDFDocument } from "pdf-lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { usePurchasesContext } from "../../../contexts/PurchasesContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useBanks } from "../../../hooks/useBanks";
import { formatApiError } from "../../../lib/apiErrors";
import { hasActiveEntitlement } from "../../../lib/revenuecatEntitlements";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** `create_statement_table` 400 responses (API contract). */
const CREATE_STATEMENT_PDF_NEED_PASSWORD =
  "This PDF is password protected. Provide pdf_password in the form data.";
const CREATE_STATEMENT_PDF_WRONG_PASSWORD =
  "The password does not correspond to this PDF.";

function detailStringFromBody(body) {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((item) =>
        typeof item === "object" && item != null && "msg" in item
          ? String(item.msg)
          : String(item),
      )
      .join(" ");
  }
  return "";
}

/** List endpoint may return strings or objects with a path field */
function statementPathFromListItem(item) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    for (const k of ["uri", "path", "gcs_uri", "value", "url"]) {
      if (typeof item[k] === "string") return item[k];
    }
  }
  return null;
}

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

function isPdfPickedFile(file) {
  if (!file) return false;
  const mime = (file.mimeType ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

async function pdfIsPasswordProtected(arrayBuffer) {
  try {
    const doc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}

async function pickedFileToArrayBuffer(file) {
  if (Platform.OS === "web") {
    if (file.file instanceof Blob) {
      return await file.file.arrayBuffer();
    }
    if (file.uri) {
      const blobRes = await fetch(file.uri);
      return await blobRes.arrayBuffer();
    }
    throw new Error("No se pudo leer el archivo");
  }
  const res = await fetch(file.uri);
  return await res.arrayBuffer();
}

export default function Reconcile() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const { isNativePurchasesPlatform, presentPaywallIfNeeded, entitlementId } =
    usePurchasesContext();
  const queryClient = useQueryClient();
  const { data: banksFromApi } = useBanks();
  const bankList = Array.isArray(banksFromApi) ? banksFromApi : [];
  const [file, setFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfPasswordRequired, setPdfPasswordRequired] = useState(false);
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conciliarGateBusy, setConciliarGateBusy] = useState(false);

  const selectedBank = useMemo(() => {
    if (!bankList.length) return null;
    const fromStatement = selectedStatement?.value
      ? bankFromStatementGcsUri(selectedStatement.value, bankList)
      : null;
    return fromStatement ?? bankList[0];
  }, [bankList, selectedStatement?.value]);

  const fetchStatements = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`${API_URL}/list_statements/`, {
        headers: getAuthHeaders(),
      });
      const payload = await res.json();
      if (!res.ok) {
        console.error("list_statements failed:", res.status, payload);
        Alert.alert(
          "Error",
          formatApiError(payload) ||
            `No se pudieron listar los extractos (${res.status})`,
        );
        setStatements([]);
        setSelectedStatement(null);
        return;
      }
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.statements)
          ? payload.statements
          : Array.isArray(payload?.uris)
            ? payload.uris
            : Array.isArray(payload?.results)
              ? payload.results
              : Array.isArray(payload?.data)
                ? payload.data
                : [];
      if (
        rawList.length === 0 &&
        payload != null &&
        typeof payload === "object" &&
        !Array.isArray(payload)
      ) {
        console.warn(
          "list_statements: expected an array or known wrapper; got keys:",
          Object.keys(payload),
        );
      }
      const statements = rawList
        .map(statementPathFromListItem)
        .filter(Boolean)
        .map((item) => ({
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
      Alert.alert(
        "Error",
        error?.message ?? "No se pudieron cargar los extractos.",
      );
    }
  }, [tenantId, getAuthHeaders]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  // Table rendering — column widths from StyleSheet (same pattern as TxnTable)
  const headerColumnStyle = {
    Fecha: reconcileStyles.colDate,
    Descripcion: reconcileStyles.colDescription,
    Valor: reconcileStyles.colAmount,
    Saldo: reconcileStyles.colBalance,
    Banco: reconcileStyles.colBanco,
  };

  const { error, data, isFetching } = useQuery({
    queryKey: ["statements", tenantId, selectedStatement?.label],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/statements/?table=${encodeURIComponent(selectedStatement.label)}`,
        { headers: getAuthHeaders() },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          formatApiError(payload) ||
            `No se pudo cargar el extracto (${response.status})`,
        );
      }
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === "object") {
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.rows)) return payload.rows;
        if (Array.isArray(payload.results)) return payload.results;
      }
      return [];
    },
    enabled: !!tenantId && !!selectedStatement?.label,
  });

  const handleUpload = async () => {
    if (!file) {
      return alert("Select a file first");
    }
    setIsLoading(true);

    try {
      let passwordToSend = "";

      if (isPdfPickedFile(file)) {
        const ab = await pickedFileToArrayBuffer(file);
        const encrypted = await pdfIsPasswordProtected(ab);
        if (encrypted) {
          if (!pdfPassword.trim()) {
            setPdfPasswordRequired(true);
            if (pdfPasswordRequired) {
              Alert.alert(
                "PDF protegido",
                "Introduce la contraseña del documento para continuar.",
              );
            }
            setIsLoading(false);
            return;
          }
          passwordToSend = pdfPassword.trim();
        } else {
          setPdfPasswordRequired(false);
          setPdfPassword("");
        }
      } else {
        setPdfPasswordRequired(false);
        setPdfPassword("");
      }

      const formData = new FormData();
      // Web FormData only accepts Blob/File; RN's { uri, name, type } becomes "[object Object]".
      if (Platform.OS === "web") {
        const picked = file;
        if (picked.file instanceof Blob) {
          formData.append("file", picked.file, picked.name ?? "statement");
        } else if (picked.uri) {
          const blobRes = await fetch(picked.uri);
          const blob = await blobRes.blob();
          formData.append("file", blob, picked.name ?? "statement");
        } else {
          Alert.alert(
            "Error",
            "No se pudo leer el archivo. Elige el documento de nuevo.",
          );
          setIsLoading(false);
          return;
        }
        if (isPdfPickedFile(file)) {
          formData.append("pdf_password", passwordToSend);
        }
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? "application/octet-stream",
        });
        if (isPdfPickedFile(file)) {
          formData.append("pdf_password", passwordToSend);
        }
      }

      const res = await fetch(`${API_URL}/create_statement_table/`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          Accept: "application/json",
        },
        body: formData,
      });

      let body = {};
      try {
        body = await res.json();
      } catch {
        body = {};
      }

      const detail = detailStringFromBody(body);

      if (!res.ok) {
        if (res.status === 400) {
          if (detail === CREATE_STATEMENT_PDF_NEED_PASSWORD) {
            setPdfPasswordRequired(true);
            setIsLoading(false);
            return;
          }
          if (detail === CREATE_STATEMENT_PDF_WRONG_PASSWORD) {
            setPdfPasswordRequired(true);
            setPdfPassword("");
            Alert.alert(
              "Contraseña incorrecta",
              "La contraseña no corresponde a este PDF. Inténtalo de nuevo.",
            );
            setIsLoading(false);
            return;
          }
        }
        const fallback =
          detail ||
          (typeof body?.message === "string" ? body.message : "") ||
          `Error ${res.status}`;
        Alert.alert("Error", fallback);
        setIsLoading(false);
        return;
      }

      console.log("Upload successful:", body);
      fetchStatements();
      setPdfPassword("");
      setPdfPasswordRequired(false);
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
        setPdfPassword("");
        setPdfPasswordRequired(false);
        console.log("File picked:", pickedFile);
      } else {
        console.log("User canceled the document picker");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert(
        "Error",
        error?.message ?? "No se pudo seleccionar el archivo.",
      );
    }
  };

  const reconcile = async () => {
    if (!selectedStatement?.label) {
      Alert.alert("Error", "Por favor selecciona un extracto primero");
      return;
    }
    if (!selectedBank?.label) {
      Alert.alert(
        "Error",
        "No hay banco asociado a este extracto. Comprueba la lista de bancos o el extracto seleccionado.",
      );
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/create_statement_joined/?table_name=${encodeURIComponent(selectedStatement.label)}&bank_name=${encodeURIComponent(selectedBank.label)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
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
        queryKey: [
          "matched_txns",
          tenantId,
          `${selectedStatement.label}_joined`,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["unmatched_txns", tenantId, selectedStatement.label],
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

  const handleConciliarPress = async () => {
    if (!isNativePurchasesPlatform) {
      await reconcile();
      return;
    }
    setConciliarGateBusy(true);
    try {
      const { ok, error, customerInfo: info } = await presentPaywallIfNeeded();
      if (!ok && error) {
        Alert.alert("Paywall", error.message ?? String(error));
        return;
      }
      if (info && hasActiveEntitlement(info, entitlementId)) {
        await reconcile();
      }
    } finally {
      setConciliarGateBusy(false);
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

  const renderDateCell = (value) => (
    <View
      style={[
        reconcileStyles.cell,
        reconcileStyles.colDate,
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

  const renderDescriptionCell = (value) => (
    <View
      style={[
        reconcileStyles.cell,
        reconcileStyles.colDescription,
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

  const renderAmountCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          reconcileStyles.cell,
          reconcileStyles.colAmount,
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

  const renderBalanceCell = (value) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          reconcileStyles.cell,
          reconcileStyles.colBalance,
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

  const renderBankCell = (value) => (
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
      {renderDateCell(item.date)}
      {renderDescriptionCell(item?.description)}
      {renderAmountCell(item.amount)}
      {renderBalanceCell(item.balance)}
      {renderBankCell(item?.bank)}
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
      edges={["bottom", "left", "right"]}
      style={[
        reconcileStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={reconcileStyles.headerSection}>
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
                  onPress={() => {
                    setFile(null);
                    setPdfPassword("");
                    setPdfPasswordRequired(false);
                  }}
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

          {pdfPasswordRequired ? (
            <View style={reconcileStyles.selectBlock}>
              <Text
                style={[
                  reconcileStyles.fieldLabel,
                  { color: theme.colors.text },
                ]}
              >
                Contraseña del PDF
              </Text>
              <TextInput
                value={pdfPassword}
                onChangeText={setPdfPassword}
                placeholder="Contraseña"
                placeholderTextColor={theme.colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                style={[
                  styles.dropdown,
                  reconcileStyles.bankDropdown,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    color: theme.colors.text,
                  },
                ]}
              />
            </View>
          ) : null}

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
                  }}
                />
              </View>
              <Pressable
                onPress={handleConciliarPress}
                disabled={conciliarGateBusy}
                style={({ pressed }) => [
                  reconcileStyles.uploadButton,
                  { backgroundColor: theme.colors.primary },
                  pressed && reconcileStyles.uploadButtonPressed,
                  conciliarGateBusy && { opacity: 0.7 },
                ]}
              >
                <Text style={reconcileStyles.uploadButtonText}>
                  {conciliarGateBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    "Conciliar"
                  )}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      {error ? (
        <Text
          style={{
            color: theme.colors.error,
            padding: 16,
            textAlign: "center",
          }}
        >
          {error.message}
        </Text>
      ) : (
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
      )}
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
