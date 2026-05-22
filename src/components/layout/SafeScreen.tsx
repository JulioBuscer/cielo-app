import { SafeAreaView, ScrollView, View } from 'react-native';
import { useTheme } from "@/src/theme/useTheme";

export function SafeScreen({ children, scrollable = false }: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }}>
      {scrollable
        ? <ScrollView className="flex-1 px-4 pt-2">{children}</ScrollView>
        : <View className="flex-1 px-4 pt-2">{children}</View>}
    </SafeAreaView>
  );
}
