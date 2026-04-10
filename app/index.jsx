import { SafeAreaView } from "react-native-safe-area-context";
import Input from "../components/Input";
import { useTheme } from "../contexts/ThemeContext";

export default function Index() {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Input />
    </SafeAreaView>
  );
}
