import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

export const PRIVACY_POLICY_URL =
  "https://support-url-generator.com/privacy/oP1Z7ReiQKCy";

export const SUPPORT_URL = "https://support-url-generator.com/zerogasto";

export async function openExternalUrl(url) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
