import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
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
import TxnTable from "../components/TxnTable";
import { useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TXNS_TABLE = "txns";

export default function Reconcile() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);

  const fetchStatements = async () => {
    try {
      const data = await fetch(`${API_URL}/list_statements`).then((res) =>
        res.json(),
      );
      const statements = data.map((item) => ({
        label: item.split("/").at(-1).split(".")[0],
        value: item,
      }));
      console.log(statements);
      setStatements(statements);
      setSelectedStatement(statements[0]);
    } catch (error) {
      console.error("Error fetching statements:", error);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  const {
    isPending: categoriesIsPending,
    error: categoriesError,
    data: categoriesData,
    isFetching: categoriesIsFetching,
  } = useCategories();

  const {
    data: matchedTxns,
    error: matchedTxnsError,
    fetchNextPage: fetchNextMatchedTxnsPage,
    hasNextPage: hasNextMatchedTxnsPage,
    isFetchingNextPage: isFetchingNextMatchedTxnsPage,
    isPending: isMatchedTxnsPending,
    refetch: refetchMatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["matched_txns", `${selectedStatement?.label}_joined`],
    queryFn: ({ pageParam }) =>
      fetch(
        `${API_URL}/reconcile_matched_txns/?table_name=${pageParam.table_name}&page=${pageParam.page}&limit=${pageParam.limit}`,
      ).then((res) => res.json()),
    enabled: !!selectedStatement?.label,
    initialPageParam: {
      table_name: selectedStatement?.label + "_joined",
      page: 0,
      limit: 100,
    },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (
        !lastPage ||
        !Array.isArray(lastPage) ||
        lastPage.length < lastPageParam.limit
      ) {
        return undefined;
      }
      return {
        table_name: lastPageParam.table_name,
        page: lastPageParam.page + 1,
        limit: lastPageParam.limit,
      };
    },
    enabled: !!selectedStatement?.label,
    // staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // refetchOnMount: false,
  });

  const {
    data: unmatchedTxns,
    error: unmatchedTxnsError,
    fetchNextPage: fetchNextUnmatchedTxnsPage,
    hasNextPage: hasNextUnmatchedTxnsPage,
    isFetchingNextPage: isFetchingNextUnmatchedTxnsPage,
    isPending: isUnmatchedTxnsPending,
    refetch: refetchUnmatchedTxns,
  } = useInfiniteQuery({
    queryKey: ["unmatched_txns", selectedStatement?.label],
    queryFn: ({ pageParam }) =>
      fetch(
        `${API_URL}/reconcile_unmatched_txns/?table_name=${selectedStatement.label}&page=${pageParam.page}&limit=${pageParam.limit}`,
      ).then((res) => res.json()),
    enabled: !!selectedStatement?.label,
    initialPageParam: { page: 0, limit: 100 },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (
        !lastPage ||
        !Array.isArray(lastPage) ||
        lastPage.length < lastPageParam.limit
      ) {
        return undefined;
      }
      return { page: lastPageParam.page + 1, limit: lastPageParam.limit };
    },
    // staleTime: 1000 * 60 * 5,
    // refetchOnWindowFocus: false,
    // refetchOnReconnect: false,
    // refetchOnMount: false,
  });

  // Flatten all pages into a single array of transactions
  const flattenedMatchedTxns = useMemo(() => {
    console.log("matchedTxns:", matchedTxns?.pages);
    return matchedTxns?.pages?.flatMap((page) => page) ?? [];
  }, [matchedTxns]);

  const flattenedUnmatchedTxns = useMemo(() => {
    return unmatchedTxns?.pages?.flatMap((page) => page) ?? [];
  }, [unmatchedTxns]);

  const columnsWidth = {
    fecha: 98,
    descripcion: 144,
    valor: 112,
    categoria: 112,
    sub_categoria: 112,
  };

  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [selectedStatement?.label],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/statements?table=${selectedStatement.label}`,
      );
      return await response.json();
    },
    enabled: !!selectedStatement?.label,
  });

  // if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>An error has occurred: {error.message}</Text>;

  const handleUpload = async () => {
    if (!file) {
      return alert("Select a file first");
    }
    setIsLoading(true);

    try {
      // 1️⃣ Get signed URL from backend
      const res = await fetch(
        `${API_URL}/generate_upload_url?filename=${encodeURIComponent(file.name)}`,
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
          const result = await fetch(`${API_URL}/create_statement_table`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gcs_uri: "gs://" + gcsURI,
            }),
          }).then((res) => res.json());
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
    try {
      const res = await fetch(
        `${API_URL}/create_statement_joined?table_name=${selectedStatement.label}`,
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
    } catch (error) {
      console.error("Error reconciling transactions:", error);
      Alert.alert("Error", "Error al conciliar transacciones");
    } finally {
      setShowReconcile(true);
    }
  };

  const completeReconcile = async () => {
    try {
      const res = await fetch(
        `${API_URL}/get_uncategorized_count/?table_name=${selectedStatement?.label}_joined`,
        {
          method: "GET",
        },
      );
      const response = await res.json();
      console.log("Uncategorized count:", response);
      if (!res.ok) {
        Alert.alert("Error", response.message);
        return;
      }
      if (response.count > 0) {
        Alert.alert(
          "Alerta",
          "Hay transacciones no categorizadas: porfavor categorice las transacciones antes de completar la conciliación",
        );
        return;
      }
      const minMaxDatesRes = await fetch(
        `${API_URL}/min_and_max_dates/?table_name=${selectedStatement?.label}_joined`,
      );
      const minMaxDatesResponse = await minMaxDatesRes.json();
      console.log("Min and max dates response:", minMaxDatesResponse);
      if (!minMaxDatesRes.ok) {
        Alert.alert("Error", minMaxDatesResponse.message);
        return;
      }
      const deleteTxnsRes = await fetch(
        `${API_URL}/delete_txns/?table=${TXNS_TABLE}&from_date=${minMaxDatesResponse.min_date}&to_date=${minMaxDatesResponse.max_date}`,
        {
          method: "DELETE",
        },
      );
      const deleteTxnsResponse = await deleteTxnsRes.json();
      console.log("Delete txns response:", deleteTxnsResponse.message);
      if (!deleteTxnsRes.ok) {
        Alert.alert("Error", deleteTxnsResponse.message);
        return;
      }
      const insertTxnsRes = await fetch(
        `${API_URL}/insert_txns/?from_table=${selectedStatement?.label}_joined&to_table=${TXNS_TABLE}`,
        {
          method: "POST",
        },
      );
      const insertTxnsResponse = await insertTxnsRes.json();
      console.log("Insert txns response:", insertTxnsResponse.inserted_count);
      if (!insertTxnsRes.ok) {
        Alert.alert("Error", insertTxnsResponse.message);
        return;
      }
      Alert.alert("Éxito", "✅ Conciliación completada correctamente!");
      setShowReconcile(false);
    } catch (error) {
      console.error("Error completing reconcile:", error);
      Alert.alert("Error", "Error al completar la conciliación");
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

  const renderHeaderCell = (label, width = 160) => (
    <View
      style={[
        reconcileStyles.headerCell,
        { width, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text style={[reconcileStyles.headerText, { color: theme.colors.text }]}>
        {label}
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (!columnsWidth) return null;
    return (
      <View style={reconcileStyles.row}>
        {renderHeaderCell("Fecha", columnsWidth["fecha"])}
        {renderHeaderCell("Descripcion", columnsWidth["descripcion"])}
        {renderHeaderCell("Valor", columnsWidth["valor"])}
        {renderHeaderCell("Saldo", columnsWidth["valor"])}
      </View>
    );
  };

  const renderCell = (value, width) => (
    <View
      style={[
        reconcileStyles.cell,
        { width, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );

  const renderNumberCell = (value, width) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View
        style={[
          reconcileStyles.cell,
          { width, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
          {formattedValue}
        </Text>
      </View>
    );
  };

  const renderTextCell = (value, width) => {
    return (
      <View
        style={[
          reconcileStyles.cell,
          { width, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[reconcileStyles.cellText, { color: theme.colors.text }]}>
          {value && value.toLowerCase()}
        </Text>
      </View>
    );
  };

  const renderTxns = (item) => {
    if (!columnsWidth) return null;
    return (
      <View style={reconcileStyles.row}>
        {renderCell(item.fecha, columnsWidth["fecha"])}
        {renderTextCell(item?.descripcion, columnsWidth["descripcion"])}
        {renderNumberCell(item.valor, columnsWidth["valor"])}
        {renderNumberCell(item.saldo, columnsWidth["valor"])}
      </View>
    );
  };

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
          <Pressable
            style={({ pressed }) => [
              reconcileStyles.button,
              { backgroundColor: theme.colors.primary },
              pressed && reconcileStyles.buttonPressed,
            ]}
            onPress={pickDocument}
          >
            <Text style={reconcileStyles.buttonText}>Seleccionar extracto</Text>
          </Pressable>

          {file && (
            <>
              <View
                style={[
                  reconcileStyles.fileInfo,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    reconcileStyles.fileLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  File Name:
                </Text>
                <Text
                  style={[
                    reconcileStyles.fileValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {file.name}
                </Text>

                <Text
                  style={[
                    reconcileStyles.fileLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  File Size:
                </Text>
                <Text
                  style={[
                    reconcileStyles.fileValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {(file.size / 1024).toFixed(2)} KB
                </Text>

                <Text
                  style={[
                    reconcileStyles.fileLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  URI:
                </Text>
                <Text
                  style={[
                    reconcileStyles.fileValue,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {file.uri}
                </Text>

                <Text
                  style={[
                    reconcileStyles.fileLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  MIME Type:
                </Text>
                <Text
                  style={[
                    reconcileStyles.fileValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {file.mimeType}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  reconcileStyles.uploadButton,
                  { backgroundColor: theme.colors.primary },
                  pressed && reconcileStyles.uploadButtonPressed,
                ]}
                onPress={handleUpload}
              >
                <Text style={reconcileStyles.uploadButtonText}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    "Cargar archivo"
                  )}
                </Text>
              </Pressable>
            </>
          )}
          <View style={reconcileStyles.dropdownRow}>
            <Dropdown
              style={[
                styles.dropdown,
                { flex: 1, backgroundColor: theme.colors.inputBackground },
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
              data={statements}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Seleccionar extracto"
              value={selectedStatement}
              onChange={(item) => {
                setSelectedStatement({
                  label: item.label,
                  value: item.value,
                });
                setShowReconcile(false);
              }}
            />
            <Pressable
              onPress={reconcile}
              style={({ pressed }) => [
                styles.reconcileButton,
                { backgroundColor: theme.colors.primary },
                pressed && reconcileStyles.reconcileButtonPressed,
              ]}
            >
              <Text style={styles.reconcileButtonText}>Conciliar</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {!showReconcile && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={[
            reconcileStyles.scrollView,
            { borderColor: theme.colors.border },
          ]}
        >
          <FlatList
            style={[
              reconcileStyles.flatList,
              { borderColor: theme.colors.border },
            ]}
            keyExtractor={(item, index) => index}
            data={data}
            ListHeaderComponent={renderHeader}
            renderItem={({ item }) => renderTxns(item)}
            stickyHeaderIndices={[0]}
          />
        </ScrollView>
      )}

      {flattenedUnmatchedTxns.length > 0 && showReconcile && (
        <View style={reconcileStyles.unmatchedSection}>
          <Text
            style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
          >
            Transacciones no concilidadas
          </Text>
          <TxnTable
            table={selectedStatement?.label}
            txns={flattenedUnmatchedTxns}
            error={unmatchedTxnsError}
            fetchNextPage={fetchNextUnmatchedTxnsPage}
            hasNextPage={hasNextUnmatchedTxnsPage}
            isFetchingNextPage={isFetchingNextUnmatchedTxnsPage}
            isPending={isUnmatchedTxnsPending}
            queryKey={["unmatched_txns", selectedStatement?.label]}
            refetch={refetchUnmatchedTxns}
          />
        </View>
      )}

      {flattenedMatchedTxns.length > 0 && showReconcile && (
        <>
          <View style={reconcileStyles.matchedHeader}>
            <Text
              style={[
                reconcileStyles.sectionTitle,
                { color: theme.colors.text },
              ]}
            >
              Transacciones concilidadas
            </Text>
            <Pressable
              style={({ pressed }) => [
                reconcileStyles.completeButton,
                { backgroundColor: theme.colors.primary },
                pressed && reconcileStyles.completeButtonPressed,
              ]}
              onPress={completeReconcile}
            >
              <Text style={styles.reconcileButtonText}>Completar</Text>
            </Pressable>
          </View>
          <TxnTable
            categories={categoriesData}
            table={`${selectedStatement?.label}_joined`}
            txns={flattenedMatchedTxns}
            error={matchedTxnsError}
            fetchNextPage={fetchNextMatchedTxnsPage}
            hasNextPage={hasNextMatchedTxnsPage}
            isFetchingNextPage={isFetchingNextMatchedTxnsPage}
            isPending={isMatchedTxnsPending}
            queryKey={["matched_txns", selectedStatement?.label]}
            refetch={refetchMatchedTxns}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderRadius: 12,
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
  reconcileButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  reconcileButtonText: {
    fontSize: 16,
    lineHeight: 16,
  },
  icon: {
    marginRight: 5,
  },
  item: {
    padding: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textItem: {
    flex: 1,
    fontSize: 16,
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
  },
  fileInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  value: {
    marginTop: 2,
    color: "#666",
  },
});

const reconcileStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  headerSection: {
    paddingVertical: 16,
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  fileInfo: {
    padding: 15,
    borderRadius: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 1,
    borderWidth: 1,
  },
  fileLabel: {
    fontWeight: "bold",
    marginTop: 10,
  },
  fileValue: {
    marginTop: 2,
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  uploadButtonPressed: {
    opacity: 0.8,
  },
  uploadButtonText: {
    fontWeight: "600",
    color: "#ffffff",
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 8,
  },
  reconcileButtonPressed: {
    opacity: 0.8,
  },
  scrollView: {
    borderWidth: 1,
    borderRadius: 16,
  },
  flatList: {
    borderRadius: 16,
  },
  unmatchedSection: {
    height: 160,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 20,
  },
  matchedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  completeButtonPressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
  },
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
  footer: {
    paddingVertical: 16,
  },
});
