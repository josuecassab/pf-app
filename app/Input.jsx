import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import CurrencyInput from "react-native-currency-input";
import {
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import SwipeableCategoryItem from "../components/SwipeableCategoryItem";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Input() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [txtType, setTxnType] = useState(0);
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

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`${API_URL}/categories`).then((res) =>
        res.json()
      );
      console.log("Fetched Categories:", res);
      setCategories(res);
    };
    fetchCategories();
  }, []);

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

  const submitTxn = () => {
    setIsSending(true);
    const txn = {
      fecha: date.toISOString().split("T")[0],
      valor: txtType === 0 ? parseFloat(value) : -1 * parseFloat(value),
      id_categoria: selectedCategory,
      id_subcategoria: selectedSubcategory,
    };
    console.log(txn);
    try {
      fetch(`${API_URL}/insert_txn/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txn),
      });
    } catch (error) {
      console.error("Error submitting transaction:", error);
    }
    setIsSending(false);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const addCategory = async () => {
    if (inputCategory.trim() === "") return;
    try {
      const res = await fetch(`${API_URL}/insert_category/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: inputCategory }),
      }).then((res) => res.json());
      setCategories([...categories, res]);
      setInputCategory("");
      setVisibleInputCat(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const addSubcategory = async (category) => {
    if (inputSubcategory.trim() === "") return;
    try {
      const res = await fetch(`${API_URL}/insert_subcategory/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sub_categoria: inputSubcategory,
          id_categoria: category,
        }),
      }).then((res) => res.json());
      const categoryRef = categories.find(
        (cat) => cat.value === res["id_categoria"]
      );
      categoryRef.sub_categorias.push({
        label: res["sub_categoria"],
        value: res["id"],
      });
      setCategories([...categories]);
      setInputSubcategory("");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const deleteCategory = async (categoryValue) => {
    try {
      await fetch(`${API_URL}/delete_category/?id=${categoryValue}`, {
        method: "DELETE",
      });
      setCategories(categories.filter((cat) => cat.value !== categoryValue));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const deleteSubcategory = async (categoryValue) => {
    try {
      const result = await fetch(
        `${API_URL}/delete_subcategory/?id=${categoryValue}`,
        {
          method: "DELETE",
        }
      ).then((res) => res.json());
      console.log(result);
      const categoryRef = categories.find(
        (cat) => cat.value === result["id_categoria"]
      );
      const newSubcategories = categoryRef.filter(
        (sub) => sub.value !== result["id"]
      );
      categoryRef.sub_categorias = newSubcategories;
      console.log(categoryRef);
      setCategories([...categories]);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const updateCategory = async (value, newLabel) => {
    console.log(value, newLabel);
    setUpdatingCategory(value);
    try {
      const result = await fetch(
        `${API_URL}/update_category/?value=${value}&label=${newLabel}`,
        {
          method: "PUT",
        }
      ).then((res) => res.json());

      const categoryRef = categories.find(
        (cat) => cat.value === result["value"]
      );
      categoryRef.label = result["label"];
      setCategories([...categories]);
    } catch (error) {
      console.error("Error deleting category:", error);
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

  const containerStyle =
    "border border-gray-400 justify-center items-center w-full rounded-lg p-5";

  return (
    // <TouchableWithoutFeedback onPress={dismissKeyboard}>
    <SafeAreaView>
      <ScrollView>
        <View className="flex-1 justify-center items-center bg-white gap-4 p-4">
          <View className={containerStyle + " gap-2"}>
            <Text className="font-semibold">Fecha</Text>
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              onChange={onChange}
              textColor="black"
              themeVariant="light"
              display="default"
              accentColor="#0a84ff"
              // style={{ backgroundColor: "#e5e7eb" }}
            />
          </View>
          <View className={containerStyle + " gap-2"}>
            <Text className="font-semibold">Valor</Text>
            <CurrencyInput
              className="rounded-3xl py-2 px-4 text-black bg-gray-200/70 w-[150px] text-center"
              value={value}
              onChangeValue={handleValueChange}
              delimiter="."
              separator=","
              precision={2}
              minValue={0}
              style={{ fontSize: 16 }}
              keyboardType="number-pad"
            />
            {/* <TextInput
              className="rounded-3xl py-3 px-4 text-black bg-gray-200 w-[150px] text-center"
              placeholder="Ingresa el valor"
              placeholderTextColor="black"
              inputMode="decimal"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={handleValueChange}
            /> */}
          </View>
          <View className={containerStyle + " gap-2"}>
            <Text className="font-semibold">Tipo</Text>
            <View className="w-[300px]">
              <SegmentedControl
                values={["Ingreso", "Egreso"]}
                selectedIndex={txtType}
                onChange={(event) => {
                  console.log(event);
                  setTxnType(event.nativeEvent.selectedSegmentIndex);
                }}
                tintColor="#0a84ff"
                fontStyle={{ color: "#000000" }}
                activeFontStyle={{ color: "#ffffff" }}
              />
            </View>
          </View>
          <View className={`${containerStyle}` + " gap-4"}>
            <View className="flex-row justify-center items-center w-full">
              <Text className="font-semibold text-lg">Categoria</Text>
              <Pressable
                className="absolute right-1 rounded-lg p-2 active:bg-gray-200"
                onPress={() => setShowCategoryModal(true)}
              >
                <Feather name="edit" size={20} color="black" />
              </Pressable>
            </View>
            <View className="justify-between w-full">
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue, itemIndex) =>
                  setSelectedCategory(itemValue)
                }
                style={{ color: "#000000" }}
                itemStyle={{ fontSize: 16, color: "#000000" }}
              >
                {categories.map((cat) => (
                  <Picker.Item label={cat.label} value={cat.value} />
                ))}
              </Picker>
              <View className="flex-row justify-center flex-1">
                <Text className="text-lg font-semibold">Sub Categoria</Text>
              </View>
              <Picker
                selectedValue={selectedSubcategory}
                onValueChange={(itemValue, itemIndex) =>
                  setSelectedSubcategory(itemValue)
                }
                style={{ color: "#000000" }}
                itemStyle={{ fontSize: 16, color: "#000000" }}
              >
                {categories
                  .filter((cat) => cat.value === selectedCategory)[0]
                  ?.sub_categorias.map((cat) => (
                    <Picker.Item label={cat.label} value={cat.value} />
                  ))}
              </Picker>
            </View>
            <Modal
              transparent={false}
              animationType="slide"
              visible={showCategoryModal}
            >
              <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1 }}>
                  <View className="flex-row justify-between items-center px-4 py-2">
                    <Pressable
                      onPress={() => setShowCategoryModal(false)}
                      className="p-2"
                    >
                      {({ pressed }) => (
                        <AntDesign
                          name="close"
                          size={24}
                          color={pressed ? "#6b7280" : "black"}
                        />
                      )}
                    </Pressable>
                    <Text className="text-2xl font-semibold">Categorias</Text>
                    <Pressable
                      onPress={() => setVisibleInputCat(!visibleInputCat)}
                      className="p-2"
                    >
                      {({ pressed }) => (
                        <AntDesign
                          name={visibleInputCat ? "close" : "plus"}
                          size={24}
                          color={pressed ? "#6b7280" : "black"}
                        />
                      )}
                    </Pressable>
                  </View>
                  {visibleInputCat && (
                    <View className="flex-row gap-2 px-4 py-2">
                      <TextInput
                        className="rounded-lg py-2 px-3 text-black flex-1 border-gray-300 border mb-2"
                        placeholder="Nueva Categoria"
                        placeholderTextColor="black"
                        value={inputCategory}
                        onChangeText={(text) => {
                          setInputCategory(text);
                        }}
                      />
                      <Pressable
                        className="bg-[#0a84ff] rounded-lg p-3 active:bg-[#0a84ff]/50 mb-2"
                        onPress={() => addCategory()}
                      >
                        <Text className=" text-white font-semibold ">
                          Agregar
                        </Text>
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
                                <View key={sub.value} className="pl-8 w-full">
                                  <SwipeableCategoryItem
                                    cat={sub}
                                    onDelete={deleteSubcategory}
                                  />
                                </View>
                              ))}
                              <View
                                key={cat.sub}
                                className="flex-row gap-2 px-4 py-2 ml-4"
                              >
                                <TextInput
                                  className="rounded-lg py-2 px-3 text-black flex-1 border-gray-300 border"
                                  placeholder="Nueva Subcategoria"
                                  placeholderTextColor="black"
                                  value={inputSubcategory}
                                  onChangeText={(text) => {
                                    setInputSubcategory(text);
                                  }}
                                />
                                <Pressable
                                  onPress={() => addSubcategory(cat.value)}
                                  className="px-4 bg-gray-200 justify-center rounded-lg active:bg-gray-300"
                                >
                                  <Text>Agregar</Text>
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
            </Modal>
          </View>
          <Pressable
            onPress={submitTxn}
            className="bg-[#0a84ff] rounded-lg p-4 w-full items-center active:bg-[#0a84ff]/50"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">
                Enviar transacción
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    // </TouchableWithoutFeedback>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "start",
//     height: "100%",
//   },
// });
