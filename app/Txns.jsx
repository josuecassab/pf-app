import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TxnTable from "../components/TxnTable";

const queryClient = new QueryClient();

export default function Txns() {
  return (
    <QueryClientProvider client={queryClient}>
      <TxnTable />
    </QueryClientProvider>
  );
}
