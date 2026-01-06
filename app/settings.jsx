import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function Settings() {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 p-6 justify-end">
        <Pressable
          onPress={() => signOut()}
          className="bg-blue-500 active:bg-blue-600 rounded-xl py-4 px-6 shadow-lg shadow-black-500/30 flex-row items-center justify-center gap-2"
        >
          <Text className="text-white font-semibold text-base tracking-wide">
            Salir
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
