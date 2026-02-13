import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import Input from "./input";

export default function Index() {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Input />
    </SafeAreaView>
  );
}
