import { SafeAreaView } from "react-native-safe-area-context";
import DataTable from "../components/DataTable";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <DataTable />
    </SafeAreaView>
  );
}

