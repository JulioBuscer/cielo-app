/**
 * AvatarPicker — selector de avatar para el bebé.
 * Permite elegir un emoji de una lista predefinida
 * o tomar/seleccionar una foto real con expo-image-picker.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  Image, ScrollView, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Emojis disponibles para el bebé
const BABY_EMOJIS = [
  '👶', '🐣', '🌙', '⭐', '🌟', '💫', '✨', '🌸', '🌺', '🌻',
  '🦋', '🐝', '🐱', '🐶', '🐰', '🐻', '🐼', '🦁', '🐯', '🐮',
  '🐷', '🐧', '🐥', '🦄', '🌈', '🍭', '🧸', '🎀', '🎠', '🌙',
];

export function AvatarPicker({
  emoji = '👶',
  photoUri,
  onEmojiChange,
  onPhotoChange,
  size = 64,
}: {
  emoji?: string;
  photoUri?: string | null;
  onEmojiChange: (emoji: string) => void;
  onPhotoChange: (uri: string | null) => void;
  size?: number;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para elegir una foto.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickFromGallery = async () => {
    const ok = await requestPermission();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onPhotoChange(result.assets[0].uri);
      setShowPicker(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onPhotoChange(result.assets[0].uri);
      setShowPicker(false);
    }
  };

  return (
    <>
      {/* Avatar circular — toca para cambiar */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.35)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)',
          overflow: 'hidden',
        }}
        activeOpacity={0.8}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: size, height: size }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
        )}
        {/* Badge de edición */}
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15,
          backgroundColor: '#FF5C9A',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: size * 0.14, color: '#FFF' }}>✏️</Text>
        </View>
      </TouchableOpacity>

      {/* Sheet de selección */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(45,27,38,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowPicker(false)}
        >
          <Pressable>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              padding: 20, paddingBottom: 36,
              maxHeight: '75%',
            }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: '#FFD6E8', borderRadius: 99, alignSelf: 'center', marginBottom: 16 }} />

              <Text style={{ fontWeight: '900', fontSize: 17, color: '#2D1B26', marginBottom: 16 }}>
                🎨 Elige un avatar
              </Text>

              {/* Botones de foto */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={takePhoto}
                  style={{ flex: 1, backgroundColor: '#FFE4EE', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 24 }}>📷</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF5C9A' }}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickFromGallery}
                  style={{ flex: 1, backgroundColor: '#FFE4EE', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 24 }}>🖼️</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF5C9A' }}>Galería</Text>
                </TouchableOpacity>
                {photoUri && (
                  <TouchableOpacity
                    onPress={() => { onPhotoChange(null); setShowPicker(false); }}
                    style={{ flex: 1, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 24 }}>🗑️</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Quitar foto</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Separador */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#FFE4EE' }} />
                <Text style={{ fontSize: 12, color: '#9B7A88', fontWeight: '700' }}>o elige un emoji</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#FFE4EE' }} />
              </View>

              {/* Grid de emojis */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {BABY_EMOJIS.map(e => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => { onEmojiChange(e); onPhotoChange(null); setShowPicker(false); }}
                      style={{
                        width: 52, height: 52, borderRadius: 14,
                        backgroundColor: emoji === e && !photoUri ? '#FFE4EE' : '#FFF0F5',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: emoji === e && !photoUri ? 2 : 0,
                        borderColor: '#FF5C9A',
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity onPress={() => setShowPicker(false)} style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: '#9B7A88', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
