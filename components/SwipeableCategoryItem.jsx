import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
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
  parentId = null,
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
    <View style={styles.container}>
      <View style={styles.actionsContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="black" />
        ) : isEditing ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.sendButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => {
              if (categoryLabel.trim() === "") {
                Alert.alert(
                  "Error",
                  "El nombre de la categoría no puede estar vacío.",
                );
                return;
              }
              console.log(categoryLabel);
              Alert.alert(
                "Cambiar nombre",
                "Está seguro que desea cambiar el nombre de la categoría?",
                [
                  {
                    text: "No",
                  },
                  {
                    text: "Si",
                    onPress: () => {
                      onEdit(cat.value, categoryLabel, parentId);
                      setIsEditing(false);
                      position.value = 0;
                      pressed.value = false;
                      setCategoryLabel("");
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.actionButtonText}>Enviar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.editButton,
              pressed && styles.actionButtonPressed,
            ]}
            disabled={isLoading}
            onPress={() => {
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
            }}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => onDelete(cat.value)}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[animatedStyles, styles.swipeableContent]}
        >
          <Pressable
            style={styles.pressableContent}
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
                  <View style={styles.editingContainer}>
                    <TextInput
                      style={styles.editingInput}
                      placeholder="Nuevo nombre..."
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
                    style={[animatedStyleLabel, styles.labelContainer]}
                  >
                    <Text style={styles.labelText}>{cat.label}</Text>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    position: "relative",
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    height: "100%",
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  actionButton: {
    borderLeftWidth: 1,
    height: "100%",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButton: {
    borderLeftColor: "#ffffff",
    backgroundColor: "#bbf7d0",
  },
  editButton: {
    borderLeftColor: "#ffffff",
    backgroundColor: "#bbf7d0",
  },
  deleteButton: {
    borderLeftColor: "#e5e7eb",
    backgroundColor: "#fecaca",
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#000000",
  },
  swipeableContent: {
    padding: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pressableContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editingInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginLeft: 140,
    height: 32,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 32,
  },
  labelText: {
    fontSize: 16,
  },
});
