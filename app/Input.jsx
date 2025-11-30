import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function Input() {
  const [selectedLanguage, setSelectedLanguage] = useState();
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [txtType, setTxnType] = useState(0);
  const [txtInfo, setTxnInfo] = useState({});
  const [value, setValue] = useState("");

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

  const containerStyle =
    "border justify-center items-center w-full rounded-lg p-5";
  return (
    <View className="flex-1 justify-center items-center bg-white gap-4 p-4">
      <View className={containerStyle + " gap-2"}>
        <Text className="font-semibold">Fecha</Text>
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          onChange={onChange}
        />
      </View>
      <View className={containerStyle + " gap-2"}>
        <Text className="font-semibold">Valor</Text>
        <TextInput
          className="font-semibold border border-gray-300 rounded-3xl p-2 w-1/2 text-center"
          placeholder="Ingresa el valor"
          inputMode="decimal"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={handleValueChange}
        />
      </View>
      <View className={containerStyle + " gap-2"}>
        <Text className="font-semibold">Tipo</Text>
        <SegmentedControl
          values={["Ingreso", "Egreso"]}
          selectedIndex={txtType}
          onChange={(event) => {
            console.log(event);
            setTxnType(event.nativeEvent.selectedSegmentIndex);
          }}
          style={{ width: 300 }}
        />
      </View>
      <View className={containerStyle}>
        <Text className="font-semibold">Categoria</Text>
        <Picker
          selectedValue={selectedLanguage}
          onValueChange={(itemValue, itemIndex) =>
            setSelectedLanguage(itemValue)
          }
          style={{ width: 300 }}
          itemStyle={{ height: 88, fontSize: 16 }}
        >
          <Picker.Item label="Java" value="java" />
          <Picker.Item label="JavaScript" value="js" />
          <Picker.Item label="Python" value="python" />
          <Picker.Item label="C++" value="cpp" />
        </Picker>
      </View>
      <Pressable onPress={submitTxn}></Pressable>
    </View>
  );
}
