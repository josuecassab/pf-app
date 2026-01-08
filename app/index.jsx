import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupedTable from "../components/GroupedTable";

const queryClient = new QueryClient();

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <QueryClientProvider client={queryClient}>
        <GroupedTable />
      </QueryClientProvider>
    </SafeAreaView>
  );
}
