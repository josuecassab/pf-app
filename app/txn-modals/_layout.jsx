import { Stack } from "expo-router";

export default function TxnModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: false,
      }}
    />
  );
}
