import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { exportDatabase, importDatabase } from '@/src/services/backup';

export default function BackupScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDatabase();
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Importar datos',
      'Esto reemplazará todos los datos actuales con los del archivo de respaldo. Se hará un backup automático de la base de datos actual. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const count = await importDatabase();
              if (count > 0) {
                Alert.alert(
                  'Importación completada',
                  `Se importaron ${count} registros. La app se reiniciará para aplicar los cambios.`,
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
                );
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo importar los datos');
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      <View
        style={{
          backgroundColor: c.headerBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.headerText, fontWeight: '900', fontSize: 18, flex: 1 }}>
          💾 Respaldar datos
        </Text>
      </View>

      <ScrollView
        style={{ backgroundColor: c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      >
        <View style={{
          backgroundColor: c.card,
          borderRadius: 20,
          padding: 20,
          gap: 16,
          borderWidth: 1,
          borderColor: c.elevated,
        }}>
          <Text style={{ fontSize: 14, color: c.textBody, lineHeight: 20 }}>
            Exporta todos tus datos como archivo JSON para guardarlos como respaldo
            o transferirlos a otro dispositivo.
          </Text>

          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            style={{
              backgroundColor: c.accent,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                📤 Exportar datos
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: c.card,
          borderRadius: 20,
          padding: 20,
          gap: 16,
          borderWidth: 1,
          borderColor: c.elevated,
        }}>
          <Text style={{ fontSize: 14, color: c.textBody, lineHeight: 20 }}>
            Importa un archivo JSON de respaldo para restaurar todos tus datos.
            Se hará un backup automático de la base de datos actual por si algo sale mal.
          </Text>

          <Text style={{ fontSize: 12, color: c.danger, fontWeight: '600' }}>
            ⚠️ Esto reemplazará todos los datos actuales
          </Text>

          <TouchableOpacity
            onPress={handleImport}
            disabled={importing}
            style={{
              backgroundColor: importing ? c.textMuted : c.danger,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                📥 Importar datos
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', lineHeight: 16 }}>
          Los archivos de respaldo contienen toda la información de tus bebés en formato JSON.
          No incluyen fotos (solo las referencias a archivos locales).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
