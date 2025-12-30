import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export default function SwipeableCategoryItem({
  cat,
  parent,
  onPress,
  onDelete,
  onEdit,
  isLoading = false,
}) {
  const pressed = useSharedValue(false);
  const position = useSharedValue(0);
  const END_POSITION = -140;
  const MIDDLE_POSITION = -70;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedInputCat, setDisplayedInputCat] = useState(new Set());
  const [categoryLabel, setCategoryLabel] = useState("");

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      position.value = event.translationX;
      pressed.value = true;
    })
    .onEnd(() => {
      console.log("Final position:", position.value);
      if (position.value < MIDDLE_POSITION) {
        position.value = withSpring(END_POSITION);
      } else {
        const finalPosition = position.value;
        position.value = withSpring(0);
        pressed.value = false;
        if (finalPosition > 0) {
          // Swiped right - set isEditing to false
          runOnJS(setIsEditing)(false);
        } else {
          runOnJS(toggleEditing)();
        }
      }
    });

  const animatedStyles = useAnimatedStyle(() => ({
    backgroundColor: pressed.value ? "#f0f0f0" : "white",
    transform: [{ translateX: position.value }],
  }));

  const labelOffset = useDerivedValue(() => {
    // Clamp position to only allow leftward movement (negative values)
    const clampedPosition = clamp(position.value, END_POSITION, 0);
    // When container moves left (negative), text moves right (positive)
    return -clampedPosition;
  });

  const animatedStyleLabel = useAnimatedStyle(() => ({
    backgroundColor: pressed.value ? "#f0f0f0" : "white",
    transform: [{ translateX: labelOffset.value }],
  }));

  return (
    <View className="flex-row relative">
      <View className="absolute right-0 h-full w-[140px] justify-center items-center flex-row">
        <Pressable
          onPress={() => {
            if (isEditing === true) {
              onEdit(cat.value, categoryLabel);
              setIsEditing(false);
              position.value = 0;
            } else {
              setIsEditing(!isEditing);
              setDisplayedInputCat((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(cat.value)) {
                  newSet.delete(cat.value);
                } else {
                  newSet.add(cat.value);
                }
                return newSet;
              });
            }
          }}
          disabled={isLoading}
          className="border-l border-white h-full px-4 justify-center bg-green-200 active:opacity-70"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="black" />
          ) : isEditing ? (
            <Text className="text-black">Enviar</Text>
          ) : (
            <Text className="text-black">Editar</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => onDelete(cat.value)}
          className="border-l border-gray-200 h-full px-4 justify-center bg-red-200 active:opacity-70"
        >
          <Text className="text-black">Eliminar</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[animatedStyles]}
          className="p-4 px-2 border-b border-gray-200 flex-row items-center flex-1"
        >
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => {
              setIsExpanded(!isExpanded);
              parent && onPress();
            }}
          >
            {({ pressed }) => (
              <>
                {parent && (
                  <>
                    {isExpanded ? (
                      <Octicons name="triangle-down" size={24} color="black" />
                    ) : (
                      <Octicons name="triangle-right" size={24} color="black" />
                    )}
                  </>
                )}
                {isEditing ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="rounded-lg px-2 text-black w-[150px] text-center border border-gray-200 ml-[140px] h-8"
                      placeholder="Nuevo nombre"
                      placeholderTextColor="black"
                      inputMode="text"
                      value={categoryLabel}
                      onChangeText={(text) => setCategoryLabel(text)}
                      editable={!isLoading}
                    />
                    {isLoading && (
                      <ActivityIndicator size="small" color="#0a84ff" />
                    )}
                  </View>
                ) : (
                  <Animated.View
                    style={[animatedStyleLabel]}
                    className="flex-row items-center gap-2 h-8"
                  >
                    <Text className="text-l">{cat.label}</Text>
                    {isLoading && (
                      <ActivityIndicator size="small" color="#0a84ff" />
                    )}
                  </Animated.View>
                )}
              </>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
