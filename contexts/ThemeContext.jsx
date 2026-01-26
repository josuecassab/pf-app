import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

const ThemeContext = createContext();

const THEME_STORAGE_KEY = "@theme_preference";

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark");
        } else {
          // Default to system preference if no saved preference
          setIsDarkMode(systemColorScheme === "dark");
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        setIsDarkMode(systemColorScheme === "dark");
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        newTheme ? "dark" : "light"
      );
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const theme = {
    isDark: isDarkMode,
    toggleTheme,
    colors: {
      background: isDarkMode ? "#000000" : "#ffffff",
      surface: isDarkMode ? "#1a1a1a" : "#ffffff",
      card: isDarkMode ? "#1f1f1f" : "#f8fafc",
      text: isDarkMode ? "#ffffff" : "#000000",
      textSecondary: isDarkMode ? "#a0a0a0" : "#374151",
      border: isDarkMode ? "#333333" : "#d1d5db",
      borderLight: isDarkMode ? "#2a2a2a" : "#e5e7eb",
      inputBackground: isDarkMode ? "#2a2a2a" : "#F3F4F6",
      placeholder: isDarkMode ? "#666666" : "#9ca3af",
      primary: "#0a84ff",
      primaryPressed: "rgba(10, 132, 255, 0.5)",
      error: "#ef4444",
      success: "#10b981",
      tabBarActive: "#0a84ff",
      tabBarInactive: isDarkMode ? "#666666" : "gray",
      modalOverlay: "rgba(0, 0, 0, 0.5)",
      modalBackground: isDarkMode ? "#1a1a1a" : "#ffffff",
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
