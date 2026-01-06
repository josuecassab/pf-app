import { SafeAreaView } from "react-native-safe-area-context";
import GroupedTable from "../components/GroupedTable";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <GroupedTable />
    </SafeAreaView>
  );
}
