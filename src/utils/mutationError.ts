import { Alert } from "react-native";
import * as Clipboard from 'expo-clipboard';

export function onMutationError(tag: string) {
  return (e: Error) => {
    console.error(tag, e);
    const msg = `${tag}: ${e?.message || e}`;
    Alert.alert("Error", "Algo salió mal. Intenta de nuevo.", [
      { text: "Copiar error", onPress: () => Clipboard.setStringAsync(msg) },
      { text: "OK" },
    ]);
  };
}
