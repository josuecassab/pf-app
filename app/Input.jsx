import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
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
import CurrencyInput from "react-native-currency-input";
import { Dropdown } from "react-native-element-dropdown";
import {
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import SwipeableCategoryItem from "../components/SwipeableCategoryItem";
import { useTheme } from "../contexts/ThemeContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  const [updatingCategory, setUpdatingCategory] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);

  const { theme } = useTheme();

  const { isPending, error, data, isFetching } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/categories`);
      return await response.json();
    },
    select: (data) => data.sort((a, b) => a.label.localeCompare(b.label)),
  });

  useEffect(() => {
    if (data) {
      setCategories(data);
    }
  }, [data]);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    console.log(currentDate);
    setShow(false);
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const handleValueChange = (text) => {
    // Only allow decimal numbers (digits and one decimal point)
    // const decimalRegex = /^\d*\.?\d*$/;
    // if (decimalRegex.test(text)) {
    //   setValue(text);
    // }
    setValue(text);
  };

  const submitTxn = async () => {
    setIsSending(true);
    const txn = {};
    // Format date in local timezone as YYYY-MM-DD (using 'en-CA' locale for ISO format)
    txn.fecha = date.toLocaleDateString("en-CA");
    txn.valor = txtType === 0 ? parseFloat(value) : -1 * parseFloat(value);
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

    console.log(txn);
    try {
      const res = await fetch(`${API_URL}/insert_txn/`, {
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const addCategory = async () => {
    if (inputCategory.trim() === "") return;
    try {
      console.log("Adding category:", inputCategory);
      const res = await fetch(`${API_URL}/categories/insert_category/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: inputCategory }),
      });

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
      const res = await fetch(`${API_URL}/categories/insert_subcategory/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sub_categoria: inputSubcategory,
          id_categoria: category,
        }),
      });

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
    } catch (error) {
      console.error("Error adding subcategory:", error);
      Alert.alert("Error agregando la subcategoría", error.message);
    }
  };

  const deleteCategory = async (categoryValue) => {
    try {
      const res = await fetch(
        `${API_URL}/categories/delete_category/?id=${categoryValue}`,
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
        `${API_URL}/categories/delete_subcategory/?id=${categoryValue}`,
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
        `${API_URL}/categories/update_category/?value=${value}&label=${newLabel}`,
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
        `${API_URL}/categories/update_subcategory/?value=${value}&label=${newLabel}`,
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
      <SafeAreaView
        style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        {/* <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        > */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View
            style={[
              {
                backgroundColor: theme.colors.background,
                flex: 1,
                justifyContent: "space-around",
              },
            ]}
          >
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
              <CurrencyInput
                style={[
                  styles.currencyInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    color: theme.colors.text,
                  },
                ]}
                value={value}
                onChangeValue={handleValueChange}
                delimiter="."
                separator=","
                precision={2}
                minValue={0}
                inputStyle={{
                  fontSize: 14,
                  height: 40,
                  textAlign: "center",
                  borderRadius: 30,
                  paddingHorizontal: 10,
                  color: theme.colors.text,
                }}
                keyboardType="number-pad"
                placeholder="ingresa el valor"
                placeholderTextColor={theme.colors.placeholder}
              />
              {/* <TextInput
              style={styles.currencyInput}
              placeholder="Ingresa el valor"
              placeholderTextColor="black"
              inputMode="decimal"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={handleValueChange}
            /> */}
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
                  borderRadius: 8,
                  borderColor: theme.colors.border,
                }}
                itemContainerStyle={{
                  backgroundColor: theme.colors.inputBackground,
                }}
                itemTextStyle={{
                  color: theme.colors.text,
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
                data={selectedCategory?.sub_categorias || []}
                search
                maxHeight={220}
                labelField="label"
                valueField="value"
                placeholder="Seleccionar sub categoria"
                searchPlaceholder="Buscar..."
                value={selectedSubcategory?.value}
                onChange={(item) => {
                  setSelectedSubcategory({
                    label: item.label,
                    value: item.value,
                  });
                }}
                dropdownPosition="top"
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
                          onPress={() => setShowCategoryModal(false)}
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
                                  <View
                                    key={cat.sub}
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
                                      placeholder="Nueva Subcategoria"
                                      placeholderTextColor={
                                        theme.colors.placeholder
                                      }
                                      value={inputSubcategory}
                                      onChangeText={(text) => {
                                        setInputSubcategory(text);
                                      }}
                                    />
                                    <Pressable
                                      onPress={() => addSubcategory(cat.value)}
                                      style={({ pressed }) => [
                                        styles.subCategoryAddButton,
                                        {
                                          backgroundColor:
                                            theme.colors.inputBackground,
                                        },
                                        pressed &&
                                          styles.subCategoryAddButtonPressed,
                                      ]}
                                    >
                                      <Text
                                        style={{ color: theme.colors.text }}
                                      >
                                        Agregar
                                      </Text>
                                    </Pressable>
                                  </View>
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
                  <Text style={styles.submitButtonText}>
                    Enviar transacción
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
        {/* </ScrollView> */}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    paddingLeft: 32,
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
