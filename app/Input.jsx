import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Input() {
  const [selectedLanguage, setSelectedLanguage] = useState();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [txtType, setTxnType] = useState(0);
  const [txtInfo, setTxnInfo] = useState({});
  const [value, setValue] = useState("");
  const [categories, setCategories] = useState([]);
  const [visibleInputCat, setVisibleInputCat] = useState(false);
  const [inputCategory, setInputCategory] = useState("");

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
    setShow(false);
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const handleValueChange = (text) => {
    // Only allow decimal numbers (digits and one decimal point)
    const decimalRegex = /^\d*\.?\d*$/;
    if (decimalRegex.test(text)) {
      setValue(text);
    }
  };

  const submitTxn = () => {
    const txn = {};
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
  const containerStyle =
    " border justify-center items-center w-full rounded-lg p-5";
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
            />
          </View>
          <View className={containerStyle + " gap-2"}>
            <Text className="font-semibold">Valor</Text>
            <TextInput
              className="rounded-lg py-3 px-4 text-black bg-gray-200"
              placeholder="Ingresa el valor"
              placeholderTextColor="black"
              inputMode="decimal"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={handleValueChange}
            />
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
            <View className="flex-row justify-between items-center w-full">
              <Text className="font-semibold">Categoria</Text>
              <Pressable
                className="rounded-lg p-2 active:bg-gray-200"
                onPress={() => {
                  setVisibleInputCat(!visibleInputCat);
                }}
              >
                {/* <Text className="text-white font-semibold">Editar</Text> */}
                <Feather
                  name="edit"
                  size={20}
                  color="black"
                  backgroundColor="#"
                />
              </Pressable>
            </View>
            <View className="justify-between w-full">
              {visibleInputCat ? (
                <View className="flex-row gap-2">
                  <TextInput
                    className="rounded-lg py-3 px-4 text-black bg-gray-200 flex-1"
                    placeholder="Nueva Categoria"
                    placeholderTextColor="black"
                    value={inputCategory}
                    onChangeText={(text) => {
                      setInputCategory(text);
                    }}
                  />
                  <Pressable onPress={() => addCategory()}>
                    <Text className="bg-[#0a84ff] text-white font-semibold rounded-lg p-3">
                      Agregar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Picker
                  selectedValue={selectedLanguage}
                  onValueChange={(itemValue, itemIndex) =>
                    setSelectedLanguage(itemValue)
                  }
                  style={{ color: "#000000" }}
                  itemStyle={{ fontSize: 16, color: "#000000" }}
                >
                  {categories.map((cat) => (
                    <Picker.Item label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              )}
            </View>
          </View>
          <View className={containerStyle}>
            <View className="flex-row">
              <Text className="font-semibold">Sub Categoria</Text>
            </View>
            <View className="w-[300px] ">
              <Picker
                selectedValue={selectedLanguage}
                onValueChange={(itemValue, itemIndex) =>
                  setSelectedLanguage(itemValue)
                }
                style={{ color: "#000000" }}
                itemStyle={{ fontSize: 16, color: "#000000" }}
              >
                {categories
                  .filter((cat) => cat.value === selectedLanguage)[0]
                  ?.sub_categorias.map((cat) => (
                    <Picker.Item label={cat.label} value={cat.value} />
                  ))}
              </Picker>
            </View>
          </View>
          <Pressable onPress={submitTxn}></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    // </TouchableWithoutFeedback>
  );
}
