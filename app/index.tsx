import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((done) => {
      setTarget(done ? '/dashboard' : '/onboarding/welcome');
    });
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C5CBF" size="large" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
