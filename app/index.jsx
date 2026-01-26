import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupedTable from "../components/GroupedTable";
import { useTheme } from "../contexts/ThemeContext";

const queryClient = new QueryClient();

export default function Index() {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <QueryClientProvider client={queryClient}>
        <GroupedTable />
      </QueryClientProvider>
    </SafeAreaView>
  );
}
