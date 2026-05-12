import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTheme } from "../../contexts/ThemeContext";
import { useBanks } from "../../hooks/useBanks";
import { useCategories } from "../../hooks/useCategories";
import { useSubcategories } from "../../hooks/useSubcategories";

export default function TabsLayout() {
  const { theme } = useTheme();
  useCategories();
  useBanks();
  useSubcategories();
  return (
    <NativeTabs
      initialRouteName="index"
      backgroundColor={theme.colors.surface}
      tintColor={theme.colors.tabBarActive}
      iconColor={{
        default: theme.colors.tabBarInactive,
        selected: theme.colors.tabBarActive,
      }}
    >
      <NativeTabs.Trigger name="summary">
        <NativeTabs.Trigger.Label>Resumen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="grid_view"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="txns">
        <NativeTabs.Trigger.Label>Txns</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agregar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          md="add_circle_outline"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reconcile">
        <NativeTabs.Trigger.Label>Conciliar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          md="receipt_long"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Config</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
