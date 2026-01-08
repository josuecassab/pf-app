import { useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
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

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Reconcile() {
  const [file, setFile] = useState(null);
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const table = "34269719739_JUN2025";

  const columnsWidth = {
    fecha: "w-[98px]",
    descripcion: "w-36",
    valor: "w-28",
    categoria: "w-28",
    sub_categoria: "w-28",
    editar: "w-[60px]",
  };

  const fetchStatements = async () => {
    try {
      const data = await fetch(`${API_URL}/list_statements`).then((res) =>
        res.json()
      );
      const statements = data.map((item) => ({
        label: item.split("/").at(-1),
        value: item,
      }));
      console.log(statements);
      setStatements(statements);
    } catch (error) {
      console.error("Error fetching statements:", error);
    }
  };

  {
  }

  useEffect(() => {
    fetchStatements();
  }, []);

  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [selectedStatement],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/statements?table=${table}`);
      return await response.json();
    },
  });

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>An error has occurred: {error.message}</Text>;

  const handleUpload = async () => {
    if (!file) {
      return alert("Select a file first");
    }
    setIsLoading(true);

    // 1️⃣ Get signed URL from backend
    const res = await fetch(
      `${API_URL}/generate_upload_url?filename=${encodeURIComponent(file.name)}`
    );
    const { url } = await res.json();
    console.log(url);
    // 2️⃣ Upload file directly to GCS
    const upload = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: file,
    });

    if (upload.ok) {
      Alert.alert("Éxito", "✅ File uploaded successfully!");
      console.log("GCS URL:", url.split("?")[0]);
      fetchStatements();
    } else {
      Alert.alert("Error", "❌ Upload failed.");
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
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
    try {
      fetch();
    } catch (error) {}
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

  const renderHeaderCell = (label, widthClass = "w-40") => (
    <View
      className={`${widthClass} border-b border-r justify-center p-2 border-slate-300 bg-white`}
    >
      <Text className="font-bold text-slate-800 text-right">{label}</Text>
    </View>
  );

  const renderHeader = () => {
    if (!columnsWidth) return null;
    return (
      <View className="flex-row">
        {renderHeaderCell("Fecha", columnsWidth["fecha"])}
        {renderHeaderCell("Descripcion", columnsWidth["descripcion"])}
        {renderHeaderCell("Valor", columnsWidth["valor"])}
        {renderHeaderCell("Saldo", columnsWidth["valor"])}
      </View>
    );
  };

  const renderCell = (value, widthClass) => (
    <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
      <Text className="text-right">{value}</Text>
    </View>
  );

  const renderNumberCell = (value, widthClass) => {
    const formattedValue = formatSpanishNumber(value);
    return (
      <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
        <Text className="text-right">{formattedValue}</Text>
      </View>
    );
  };

  const renderDescripcionCell = (value, widthClass) => {
    return (
      <View className={"border-b border-r p-2 border-slate-300 " + widthClass}>
        <Text className="text-right">{value && value.toLowerCase()}</Text>
      </View>
    );
  };

  const renderTxns = (item) => {
    if (!columnsWidth) return null;
    return (
      <View className="flex-row">
        {renderCell(item.fecha, columnsWidth["fecha"])}
        {renderDescripcionCell(item?.descripcion, columnsWidth["descripcion"])}
        {renderNumberCell(item.valor, columnsWidth["valor"])}
        {renderNumberCell(item.valor, columnsWidth["valor"])}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetching) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View className="px-4 py-4 gap-4">
        <Text className="text-4xl font-semibold">Conciliar</Text>
        <StatusBar barStyle="dark-content" />
        <View className="gap-2">
          <Text className="text-lg mx-[8px]">Document Picker</Text>
          <Pressable
            className="px-4 py-3 bg-white rounded-xl active:bg-gray-200 justify-center shadow-sm shadow-black/20"
            onPress={pickDocument}
          >
            <Text className="text-black text-lg">Seleccionar extracto</Text>
          </Pressable>

          {file && (
            <>
              <View className="p-[15px] bg-white rounded-[10px] w-full shadow-sm shadow-black/10 border">
                <Text className="font-bold mt-[10px] text-[#333]">
                  File Name:
                </Text>
                <Text className="mt-0.5 text-[#666]">{file.name}</Text>

                <Text className="font-bold mt-[10px] text-[#333]">
                  File Size:
                </Text>
                <Text className="mt-0.5 text-[#666]">
                  {(file.size / 1024).toFixed(2)} KB
                </Text>

                <Text className="font-bold mt-[10px] text-[#333]">URI:</Text>
                <Text
                  className="mt-0.5 text-[#666]"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {file.uri}
                </Text>

                <Text className="font-bold mt-[10px] text-[#333]">
                  MIME Type:
                </Text>
                <Text className="mt-0.5 text-[#666]">{file.mimeType}</Text>
              </View>
              <Pressable
                className="px-4 py-3 bg-[#0a84ff] rounded-xl active:bg-[#0a84ff]/50 shadow-sm shadow-black/20 self-start"
                onPress={handleUpload}
              >
                <Text className="font-semibold text-white">
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    "Cargar archivo"
                  )}
                </Text>
              </Pressable>
            </>
          )}
          <View className="flex flex-row">
            <Dropdown
              style={[styles.dropdown, { flex: 1 }]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
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
              }}
            />
            <Pressable
              onPress={reconcile}
              className="justify-center bg-white active:bg-gray-200 shadow-sm shadow-black/20 rounded-xl mx-2"
              style={styles.reconcileButton}
            >
              <Text style={styles.reconcileButtonText}>Conciliar</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        className="border border-slate-300 rounded-2xl"
      >
        <FlatList
          className="rounded-2xl border-slate-300"
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
    margin: 8,
    backgroundColor: "white",
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
    margin: 8,
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
