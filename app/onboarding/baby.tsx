import { useState } from 'react';
import {
  Text, TextInput, View, StatusBar, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/src/components/ui/BigButton';
import { DateTimePicker } from '@/src/components/ui/DateTimePicker';
import { AvatarPicker } from '@/src/components/ui/AvatarPicker';
import { useCreateBaby, SEX_LABELS } from '@/src/hooks/useBaby';

type Sex = 'male' | 'female' | 'unknown';

export default function BabySetup() {
  const [name, setName]         = useState('');
  const [nickname, setNickname] = useState('');
  const [sex, setSex]           = useState<Sex>('unknown');
  const [birthDate, setBirth]   = useState(new Date());
  const [avatarEmoji, setEmoji] = useState('👶');
  const [photoUri, setPhoto]    = useState<string | null>(null);
  const createBaby              = useCreateBaby();

  const handleFinish = () => {
    if (!name.trim()) return;
    createBaby.mutate(
      {
        name:        name.trim(),
        nickname:    nickname.trim() || undefined,
        birthDate,
        sex,
        avatarEmoji,
        photoUri:    photoUri ?? undefined,
      } as any,
      { onSuccess: () => router.replace('/dashboard') }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* Header con avatar interactivo */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, alignItems: 'center', gap: 8 }}>
          <AvatarPicker
            emoji={avatarEmoji}
            photoUri={photoUri}
            onEmojiChange={setEmoji}
            onPhotoChange={setPhoto}
            size={80}
          />
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22 }}>
            {name.trim() || 'El Bebé'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>
            Toca el avatar para personalizarlo ✨
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFF0F5', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Nombre */}
          <View style={card}>
            <Text style={label}>Nombre</Text>
            <TextInput
              style={input}
              placeholder="Ej: Emiliano"
              placeholderTextColor="#9B7A88"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          {/* Apodo */}
          <View style={card}>
            <Text style={label}>Apodo (opcional)</Text>
            <TextInput
              style={input}
              placeholder="Ej: Mili, Emi, Bebé…"
              placeholderTextColor="#9B7A88"
              value={nickname}
              onChangeText={setNickname}
            />
          </View>

          {/* Sexo */}
          <View style={card}>
            <Text style={label}>Sexo</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.entries(SEX_LABELS) as [Sex, { emoji: string; label: string }][]).map(([id, { emoji, label: l }]) => {
                const sel = sex === id;
                return (
                  <TouchableOpacity
                    key={id} onPress={() => setSex(id)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12,
                      borderRadius: 14, borderWidth: 2,
                      backgroundColor: sel ? '#FFE4EE' : '#FFF0F5',
                      borderColor: sel ? '#FF5C9A' : '#FFD6E8',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: sel ? '#FF5C9A' : '#9B7A88', marginTop: 3 }}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fecha y hora */}
          <View style={card}>
            <Text style={label}>Fecha y Hora de Nacimiento</Text>
            <Text style={{ fontSize: 11, color: '#9B7A88', marginBottom: 12 }}>
              Toca un campo, bórralo completamente y escribe el valor nuevo 🌙
            </Text>
            <DateTimePicker value={birthDate} onChange={setBirth} />
          </View>

          <BigButton
            label="¡Comenzar! ✨"
            disabled={!name.trim() || createBaby.isPending}
            loading={createBaby.isPending}
            onPress={handleFinish}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos reutilizables ────────────────────────────────────────────────────
const card: any = {
  backgroundColor: '#FFFFFF', borderRadius: 20,
  padding: 16, marginBottom: 12,
  shadowColor: '#FF8AB3', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
};
const label: any = {
  fontWeight: '800', fontSize: 12, color: '#9B7A88',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
};
const input: any = {
  backgroundColor: '#FFF0F5', borderRadius: 12,
  padding: 12, fontSize: 16, color: '#2D1B26',
};
