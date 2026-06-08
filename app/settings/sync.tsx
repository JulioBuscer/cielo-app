import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/src/theme/useTheme';
import { useSync } from '@/src/sync/hooks';
import type { SyncOffer, SyncStep } from '@/src/sync/types';
import { getRandomBytes } from 'expo-crypto';
import { encodeBase64 } from 'tweetnacl-util';
import QRCode from 'react-native-qrcode-svg';

const STEP_LABELS: Record<SyncStep, string> = {
  idle: 'Listo',
  generating: 'Generando clave...',
  waiting_qr: 'Escanea el código QR',
  scanning: 'Escanea el código QR del anfitrión',
  signaling: 'Conectando...',
  connecting_webrtc: 'Estableciendo conexión segura...',
  syncing: 'Sincronizando datos...',
  merging: 'Fusionando registros...',
  done: '¡Completado!',
  error: 'Error',
};

export default function SyncScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const sync = useSync();
  const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleStartHost = () => {
    setMode('host');
    sync.startHost();
  };

  const handleStartJoin = () => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
    setMode('join');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const offer: SyncOffer = JSON.parse(data);
      if (!offer.host || !offer.port || !offer.key) {
        Alert.alert('Error', 'Código QR inválido');
        setScanned(false);
        return;
      }
      sync.startJoin(offer);
    } catch {
      Alert.alert('Error', 'No se pudo leer el código QR');
      setScanned(false);
    }
  };

  const handleReset = () => {
    sync.reset();
    setMode('menu');
    setScanned(false);
  };

  // Auto-reset after done
  useEffect(() => {
    if (sync.step === 'done') {
      const timer = setTimeout(() => {
        handleReset();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sync.step]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
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
          onPress={mode === 'menu' ? () => router.back() : handleReset}
          style={{ paddingRight: 16, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>
            {mode === 'menu' ? '←' : '✕'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: c.headerText, fontWeight: '900', fontSize: 18, flex: 1 }}>
          🔄 Sincronizar
        </Text>
      </View>

      {mode === 'menu' && (
        <View style={{ flex: 1, backgroundColor: c.surface, padding: 24, gap: 20, justifyContent: 'center' }}>
          <Text style={{ color: c.textBody, fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 }}>
            Sincroniza los datos de {`{babyName}`} entre dispositivos.{'\n'}
            El cifrado es punto a punto — nadie más puede leer los datos.
          </Text>

          <TouchableOpacity
            onPress={handleStartHost}
            style={{
              backgroundColor: c.accentStrong,
              borderRadius: 20,
              padding: 20,
              alignItems: 'center',
              shadowColor: c.accentStrong,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📤</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 17 }}>
              Soy el anfitrión
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
              Compartir mis datos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStartJoin}
            style={{
              backgroundColor: c.card,
              borderRadius: 20,
              padding: 20,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: c.accentStrong + '40',
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📥</Text>
            <Text style={{ color: c.textBody, fontWeight: '900', fontSize: 17 }}>
              Unirme
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>
              Escanear QR del anfitrión
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'host' && (
        <ScrollView style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 20 }}>
          {/* QR Code */}
          {sync.offer && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <QRCode
                value={JSON.stringify(sync.offer)}
                size={220}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
          )}

          {/* Status */}
          <View style={{
            backgroundColor: c.card,
            borderRadius: 16,
            padding: 16,
            width: '100%',
            gap: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {sync.step !== 'done' && sync.step !== 'error' && (
                <ActivityIndicator size="small" color={c.accentStrong} />
              )}
              <Text style={{
                color: sync.step === 'done' ? '#4CAF50' : sync.step === 'error' ? '#F44336' : c.textBody,
                fontWeight: '700',
                fontSize: 15,
              }}>
                {STEP_LABELS[sync.step]}
              </Text>
            </View>

            {sync.mergedCount > 0 && (
              <Text style={{ color: c.textMuted, fontSize: 13 }}>
                {sync.mergedCount} registros sincronizados
              </Text>
            )}

            {sync.error && (
              <Text style={{ color: '#F44336', fontSize: 13 }}>{sync.error}</Text>
            )}
          </View>

          {/* Log */}
          <View style={{
            backgroundColor: c.elevated,
            borderRadius: 12,
            padding: 12,
            width: '100%',
            maxHeight: 200,
          }}>
            <ScrollView nestedScrollEnabled>
              {sync.log.map((entry, i) => (
                <Text key={i} style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>
                  {entry}
                </Text>
              ))}
            </ScrollView>
          </View>

          {sync.step === 'done' && (
            <TouchableOpacity
              onPress={handleReset}
              style={{
                backgroundColor: c.accentStrong,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Volver
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {mode === 'join' && (
        <View style={{ flex: 1, backgroundColor: c.surface }}>
          {sync.step === 'idle' || sync.step === 'scanning' ? (
            <>
              {cameraPermission?.granted ? (
                <CameraView
                  style={{ flex: 1 }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                      width: 250,
                      height: 250,
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      borderRadius: 20,
                      backgroundColor: 'transparent',
                    }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '700',
                      marginTop: 24,
                      textShadowColor: 'rgba(0,0,0,0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }}>
                      Escanea el QR del anfitrión
                    </Text>
                  </View>
                </CameraView>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
                  <Text style={{ color: c.textBody, fontSize: 40 }}>📷</Text>
                  <Text style={{ color: c.textMuted, fontSize: 15, textAlign: 'center' }}>
                    Necesitamos acceso a la cámara para escanear el código QR
                  </Text>
                  <TouchableOpacity
                    onPress={requestCameraPermission}
                    style={{
                      backgroundColor: c.accentStrong,
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 32,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                      Permitir cámara
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 20 }}>
              <View style={{
                backgroundColor: c.card,
                borderRadius: 16,
                padding: 16,
                width: '100%',
                gap: 8,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {sync.step !== 'done' && sync.step !== 'error' && (
                    <ActivityIndicator size="small" color={c.accentStrong} />
                  )}
                  <Text style={{
                    color: sync.step === 'done' ? '#4CAF50' : sync.step === 'error' ? '#F44336' : c.textBody,
                    fontWeight: '700',
                    fontSize: 15,
                  }}>
                    {STEP_LABELS[sync.step]}
                  </Text>
                </View>

                {sync.mergedCount > 0 && (
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>
                    {sync.mergedCount} registros sincronizados
                  </Text>
                )}

                {sync.error && (
                  <Text style={{ color: '#F44336', fontSize: 13 }}>{sync.error}</Text>
                )}
              </View>

              <View style={{
                backgroundColor: c.elevated,
                borderRadius: 12,
                padding: 12,
                width: '100%',
                maxHeight: 200,
              }}>
                <ScrollView nestedScrollEnabled>
                  {sync.log.map((entry, i) => (
                    <Text key={i} style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>
                      {entry}
                    </Text>
                  ))}
                </ScrollView>
              </View>

              {sync.step === 'done' && (
                <TouchableOpacity
                  onPress={handleReset}
                  style={{
                    backgroundColor: c.accentStrong,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Volver
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
