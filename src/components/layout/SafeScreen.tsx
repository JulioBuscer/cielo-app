import { SafeAreaView, ScrollView, View } from 'react-native';

export function SafeScreen({ children, scrollable = false }: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {scrollable
        ? <ScrollView className="flex-1 px-4 pt-2">{children}</ScrollView>
        : <View className="flex-1 px-4 pt-2">{children}</View>}
    </SafeAreaView>
  );
}
