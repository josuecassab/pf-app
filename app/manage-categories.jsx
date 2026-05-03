import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeableCategoryItem from "../components/SwipeableCategoryItem";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";
import { authJsonHeaders } from "../lib/apiHeaders";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function closeModal() {
  router.back();
}

export default function ManageCategoriesScreen() {
  const queryClient = useQueryClient();
  const { tenantId, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const { data } = useCategories();

  const [searchQuery, setSearchQuery] = useState("");
  const [visibleInputCat, setVisibleInputCat] = useState(false);
  const [inputCategory, setInputCategory] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [addingSubcategoryForId, setAddingSubcategoryForId] = useState(null);
  const [updatingCategory, setUpdatingCategory] = useState(null);
  const [inputSubcategory, setInputSubcategory] = useState("");

  const displayCategories = useMemo(() => {
    const list = data ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((cat) => cat.label.toLowerCase().includes(q));
  }, [data, searchQuery]);

  const addCategory = async () => {
    if (inputCategory.trim() === "") return;
    try {
      const res = await fetch(`${API_URL}/categories/insert_category/`, {
        method: "POST",
        headers: authJsonHeaders(getAuthHeaders),
        body: JSON.stringify({ label: inputCategory }),
      });

      const resData = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error agregando la categoría",
          resData.message || JSON.stringify(resData),
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

  const addSubcategory = async (categoryId) => {
    if (inputSubcategory.trim() === "") return;
    try {
      const res = await fetch(`${API_URL}/categories/insert_subcategory/`, {
        method: "POST",
        headers: authJsonHeaders(getAuthHeaders),
        body: JSON.stringify({
          name: inputSubcategory,
          category_id: categoryId,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Error agregando la subcategoría",
          resData.message || JSON.stringify(resData),
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setInputSubcategory("");
      setAddingSubcategoryForId(null);
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
          headers: getAuthHeaders(),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        Alert.alert(
          "Error eliminando la categoría",
          errData.message || JSON.stringify(errData),
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
          headers: getAuthHeaders(),
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
    setUpdatingCategory(value);
    try {
      const res = await fetch(
        `${API_URL}/categories/update_category/?value=${value}&label=${newLabel}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
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
    setUpdatingCategory(value);
    try {
      const res = await fetch(
        `${API_URL}/categories/update_subcategory/?value=${value}&label=${newLabel}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
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

  const expandCategories = useCallback(
    (cat) => {
      let wasExpanded = false;
      setExpandedCategories((prev) => {
        wasExpanded = prev.has(cat.value);
        const next = new Set(prev);
        if (wasExpanded) next.delete(cat.value);
        else next.add(cat.value);
        return next;
      });
      if (wasExpanded && addingSubcategoryForId === cat.value) {
        setAddingSubcategoryForId(null);
        setInputSubcategory("");
      }
    },
    [addingSubcategoryForId],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.modalHeader}>
          <Pressable
            onPress={() => {
              closeModal();
              setAddingSubcategoryForId(null);
              setInputSubcategory("");
            }}
            style={styles.iconButton}
          >
            {({ pressed }) => (
              <AntDesign
                name="close"
                size={24}
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
              />
            )}
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
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
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
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
            value={searchQuery}
            onChangeText={setSearchQuery}
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
              onChangeText={setInputCategory}
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
        <GestureHandlerRootView style={styles.flex}>
          <GHScrollView>
            {displayCategories.map((cat) => (
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
                      <View key={sub.value} style={styles.subCategoryContainer}>
                        <SwipeableCategoryItem
                          parentId={cat.value}
                          cat={sub}
                          onDelete={deleteSubcategory}
                          onEdit={updateSubcategory}
                        />
                      </View>
                    ))}
                    {addingSubcategoryForId === cat.value ? (
                      <View
                        key={`${cat.value}-input`}
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
                          placeholder="Nueva subcategoría"
                          placeholderTextColor={theme.colors.placeholder}
                          value={inputSubcategory}
                          onChangeText={setInputSubcategory}
                          autoFocus
                        />
                        <Pressable
                          onPress={() => addSubcategory(cat.value)}
                          style={({ pressed }) => [
                            styles.subCategoryAddButton,
                            {
                              backgroundColor: theme.colors.primary,
                            },
                            pressed && styles.subCategoryAddButtonPressed,
                          ]}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontWeight: "600",
                              fontSize: 14,
                            }}
                          >
                            Agregar
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setAddingSubcategoryForId(cat.value)}
                        style={({ pressed }) => [
                          styles.addSubcategoryButton,
                          {
                            backgroundColor: pressed
                              ? theme.colors.inputBackground
                              : theme.colors.card,
                            borderBottomColor: theme.colors.borderLight,
                          },
                        ]}
                      >
                        <View style={styles.addSubcategoryInnerRow}>
                          <Text
                            style={[
                              styles.addSubcategoryButtonText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            Agregar subcategoría
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            ))}
          </GHScrollView>
        </GestureHandlerRootView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  addSubcategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 8,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  addSubcategoryInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 32,
  },
  addSubcategoryButtonText: {
    fontSize: 14,
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
});
