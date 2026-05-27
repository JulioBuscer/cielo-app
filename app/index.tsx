import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getOnboardingDone } from '@/src/utils/storage';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingDone().then((done) => {
      setTarget(done ? '/(tabs)' : '/onboarding/welcome');
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
