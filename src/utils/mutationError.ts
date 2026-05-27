import { Alert } from "react-native";

export function onMutationError(tag: string) {
  return (e: Error) => {
    console.error(tag, e);
    Alert.alert("Error", "Algo salió mal. Intenta de nuevo.");
  };
}
