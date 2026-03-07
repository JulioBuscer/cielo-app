import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveBaby, useUpdateBaby, calcAge, SEX_LABELS, STATUS_LABELS } from '@/src/hooks/useBaby';
import { resetAllData } from '@/src/db/client';
import { BigButton } from '@/src/components/ui/BigButton';
import { DateTimePicker } from '@/src/components/ui/DateTimePicker';
import { AvatarPicker } from '@/src/components/ui/AvatarPicker';

type Sex    = 'male' | 'female' | 'unknown';
type Status = 'healthy' | 'sick' | 'unknown';

function InfoRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: '#FFF0F5',
    }}>
      <Text style={{ fontSize: 20, marginRight: 12 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#9B7A88', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2D1B26', marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF0F5', borderRadius: 16, padding: 14, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: '900', color: '#2D1B26' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#9B7A88', fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function BabyProfile() {
  const { data: baby } = useActiveBaby();
  const update         = useUpdateBaby();
  const [editing, setEditing] = useState(false);

  const [formName, setFormName]         = useState('');
  const [formNick, setFormNick]         = useState('');
  const [formSex, setFormSex]           = useState<Sex>('unknown');
  const [formStatus, setFormStatus]     = useState<Status>('unknown');
  const [formBirth, setFormBirth]       = useState(new Date());
  const [formWeightKg, setFormWeightKg] = useState('');
  const [formHeightCm, setFormHeightCm] = useState('');
  const [formEmoji, setFormEmoji]       = useState('👶');
  const [formPhoto, setFormPhoto]       = useState<string | null>(null);

  const startEdit = () => {
    if (!baby) return;
    setFormName(baby.name);
    setFormNick(baby.nickname ?? '');
    setFormSex((baby.sex as Sex) ?? 'unknown');
    setFormStatus((baby.status as Status) ?? 'unknown');
    setFormBirth(new Date(baby.birthDate));
    setFormWeightKg(baby.weightBirthGrams ? String(baby.weightBirthGrams / 1000) : '');
    setFormHeightCm(baby.heightBirthMm    ? String(baby.heightBirthMm / 10)     : '');
    setFormEmoji((baby as any).avatarEmoji ?? '👶');
    setFormPhoto(baby.photoUri ?? null);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!baby || !formName.trim()) return;
    update.mutate(
      {
        id:               baby.id,
        name:             formName.trim(),
        nickname:         formNick.trim() || null,
        sex:              formSex,
        status:           formStatus,
        birthDate:        formBirth,
        weightBirthGrams: formWeightKg ? Math.round(parseFloat(formWeightKg) * 1000) : null,
        heightBirthMm:    formHeightCm ? Math.round(parseFloat(formHeightCm) * 10)   : null,
        avatarEmoji:      formEmoji,
        photoUri:         formPhoto ?? null,
      } as any,
      {
        onSuccess: () => setEditing(false),
        onError:   (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo guardar'),
      }
    );
  };

  if (!baby) return null;

  const age        = calcAge(baby.birthDate);
  const sexInfo    = SEX_LABELS[(baby.sex as Sex)] ?? SEX_LABELS.unknown;
  const statusInfo = STATUS_LABELS[(baby.status as Status)] ?? STATUS_LABELS.unknown;
  const birthStr   = new Date(baby.birthDate).toLocaleString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const avatarEmoji = (baby as any).avatarEmoji ?? '👶';
  const photoUri    = baby.photoUri ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* Header */}
        <View style={{
          backgroundColor: '#FF8AB3',
          paddingHorizontal: 16, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <TouchableOpacity onPress={() => { setEditing(false); router.back(); }}>
            <Text style={{ color: '#FFFFFF', fontSize: 26, lineHeight: 28 }}>←</Text>
          </TouchableOpacity>

          {/* Avatar en header — solo muestra, no abre picker aquí */}
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={{ width: 44, height: 44 }} />
              : <Text style={{ fontSize: 24 }}>{avatarEmoji}</Text>
            }
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 17 }}>
              {baby.nickname || baby.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
              {age.label} · {statusInfo.emoji} {statusInfo.label}
            </Text>
          </View>

          <TouchableOpacity
            onPress={editing ? saveEdit : startEdit}
            disabled={update.isPending}
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
              {editing ? (update.isPending ? '...' : '💾 Guardar') : '✏️ Editar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Stats en el header rosa */}
          <View style={{ backgroundColor: '#FF8AB3', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard emoji="🎂" label="Edad" value={age.label} />
              <StatCard emoji="📅" label="Días" value={`${age.days}`} />
              {baby.weightBirthGrams
                ? <StatCard emoji="⚖️" label="Al nacer" value={`${(baby.weightBirthGrams / 1000).toFixed(3)} kg`} />
                : <StatCard emoji="⚖️" label="Al nacer" value="—" />
              }
            </View>
          </View>

          <View style={{ backgroundColor: '#FFFFFF', padding: 16 }}>

            {/* ── MODO SOLO LECTURA ── */}
            {!editing ? (
              <>
                <InfoRow emoji={photoUri ? '🖼️' : avatarEmoji} label="Avatar" value={photoUri ? 'Foto personalizada' : `Emoji: ${avatarEmoji}`} />
                <InfoRow emoji="👶" label="Nombre completo" value={baby.name} />
                {baby.nickname && <InfoRow emoji="💬" label="Apodo" value={baby.nickname} />}
                <InfoRow emoji={sexInfo.emoji}    label="Sexo"          value={sexInfo.label} />
                <InfoRow emoji={statusInfo.emoji} label="Estado actual" value={statusInfo.label} />
                <InfoRow emoji="🕐" label="Fecha y hora de nacimiento" value={birthStr} />
                {baby.weightBirthGrams != null && (
                  <InfoRow emoji="⚖️" label="Peso al nacer" value={`${(baby.weightBirthGrams / 1000).toFixed(3)} kg`} />
                )}
                {baby.heightBirthMm != null && (
                  <InfoRow emoji="📏" label="Talla al nacer" value={`${(baby.heightBirthMm / 10).toFixed(1)} cm`} />
                )}
                <TouchableOpacity
                  onPress={startEdit}
                  style={{ marginTop: 24, backgroundColor: '#FFE4EE', borderRadius: 16, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FF5C9A', fontWeight: '800', fontSize: 15 }}>✏️ Editar datos</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── MODO EDICIÓN ── */
              <View style={{ gap: 18 }}>

                {/* Avatar picker centrado */}
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 12, textTransform: 'uppercase' }}>
                    Avatar de {formName || 'el bebé'}
                  </Text>
                  <AvatarPicker
                    emoji={formEmoji}
                    photoUri={formPhoto}
                    onEmojiChange={setFormEmoji}
                    onPhotoChange={setFormPhoto}
                    size={80}
                  />
                </View>

                {/* Nombre */}
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 6, textTransform: 'uppercase' }}>Nombre</Text>
                  <TextInput
                    style={{ backgroundColor: '#FFF0F5', borderRadius: 12, padding: 12, fontSize: 15, color: '#2D1B26', borderWidth: 1.5, borderColor: '#FFD6E8' }}
                    value={formName}
                    onChangeText={setFormName}
                  />
                </View>

                {/* Apodo */}
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 6, textTransform: 'uppercase' }}>Apodo (opcional)</Text>
                  <TextInput
                    style={{ backgroundColor: '#FFF0F5', borderRadius: 12, padding: 12, fontSize: 15, color: '#2D1B26', borderWidth: 1.5, borderColor: '#FFD6E8' }}
                    placeholder="Ej: Mili, Emi…"
                    placeholderTextColor="#9B7A88"
                    value={formNick}
                    onChangeText={setFormNick}
                  />
                </View>

                {/* Sexo */}
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 8, textTransform: 'uppercase' }}>Sexo</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(Object.entries(SEX_LABELS) as [Sex, { emoji: string; label: string }][]).map(([id, { emoji, label }]) => (
                      <TouchableOpacity
                        key={id} onPress={() => setFormSex(id)}
                        style={{
                          flex: 1, alignItems: 'center', paddingVertical: 10,
                          borderRadius: 12, borderWidth: 2,
                          backgroundColor: formSex === id ? '#FFE4EE' : '#FFF0F5',
                          borderColor:     formSex === id ? '#FF5C9A' : '#FFD6E8',
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: formSex === id ? '#FF5C9A' : '#9B7A88' }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Estado */}
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 8, textTransform: 'uppercase' }}>¿Cómo está?</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(Object.entries(STATUS_LABELS) as [Status, { emoji: string; label: string }][]).map(([id, { emoji, label }]) => (
                      <TouchableOpacity
                        key={id} onPress={() => setFormStatus(id)}
                        style={{
                          flex: 1, alignItems: 'center', paddingVertical: 10,
                          borderRadius: 12, borderWidth: 2,
                          backgroundColor: formStatus === id ? '#FFE4EE' : '#FFF0F5',
                          borderColor:     formStatus === id ? '#FF5C9A' : '#FFD6E8',
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: formStatus === id ? '#FF5C9A' : '#9B7A88', textAlign: 'center' }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Fecha/hora nacimiento */}
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 4, textTransform: 'uppercase' }}>
                    Fecha y hora de nacimiento
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9B7A88', marginBottom: 10 }}>
                    Toca un campo, bórralo y escribe el nuevo valor 👇
                  </Text>
                  <DateTimePicker value={formBirth} onChange={setFormBirth} />
                </View>

                {/* Peso y talla */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 6, textTransform: 'uppercase' }}>Peso al nacer (kg)</Text>
                    <TextInput
                      style={{ backgroundColor: '#FFF0F5', borderRadius: 12, padding: 12, fontSize: 15, color: '#2D1B26', borderWidth: 1.5, borderColor: '#FFD6E8' }}
                      placeholder="3.250"
                      placeholderTextColor="#9B7A88"
                      keyboardType="decimal-pad"
                      value={formWeightKg}
                      onChangeText={setFormWeightKg}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', fontSize: 11, color: '#9B7A88', marginBottom: 6, textTransform: 'uppercase' }}>Talla al nacer (cm)</Text>
                    <TextInput
                      style={{ backgroundColor: '#FFF0F5', borderRadius: 12, padding: 12, fontSize: 15, color: '#2D1B26', borderWidth: 1.5, borderColor: '#FFD6E8' }}
                      placeholder="50.0"
                      placeholderTextColor="#9B7A88"
                      keyboardType="decimal-pad"
                      value={formHeightCm}
                      onChangeText={setFormHeightCm}
                    />
                  </View>
                </View>

                <BigButton label="💾 Guardar cambios" loading={update.isPending} disabled={!formName.trim()} onPress={saveEdit} />
                <BigButton label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
              </View>
            )}

            {/* Zona de peligro */}
            {!editing && (
              <View style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: '#FFE4EE', paddingTop: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#9B7A88', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  ⚠️ Zona de desarrollo
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      '⚠️ Borrar todos los datos',
                      'Se eliminarán todos los registros. Esta acción no se puede deshacer.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: '🗑️ Borrar todo', style: 'destructive',
                          onPress: () => Alert.alert(
                            '¿Estás seguro?',
                            '¿Confirmar reset total?',
                            [
                              { text: 'No, cancelar', style: 'cancel' },
                              {
                                text: 'Sí, borrar todo', style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await resetAllData();
                                    router.replace('/onboarding/welcome');
                                  } catch (e: any) { Alert.alert('Error', e?.message); }
                                },
                              },
                            ]
                          ),
                        },
                      ]
                    );
                  }}
                  style={{ backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' }}
                >
                  <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 14 }}>🗑️ Borrar todos los datos</Text>
                  <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 3 }}>Vuelve al onboarding — útil para reiniciar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
