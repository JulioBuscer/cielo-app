import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/src/theme/useTheme';
import { useSync } from '@/src/sync/hooks';
import type { SyncOffer, SyncStep } from '@/src/sync/types';
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
  const [countdown, setCountdown] = useState(120);
  const [copied, setCopied] = useState(false);
  const [joinMode, setJoinMode] = useState<'menu' | 'scan' | 'manual'>('menu');
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('');
  const [manualKey, setManualKey] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval>>(null);

  // QR countdown in host mode
  useEffect(() => {
    if (mode === 'host' && sync.offer && sync.step === 'waiting_qr') {
      setCountdown(120);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [mode, sync.offer, sync.step]);

  const formatOffer = useCallback((offer: SyncOffer) => {
    if (offer.v === 1) {
      return `🌙 Te invito a sincronizar Cielo\n\nHost: ${offer.host}\nPuerto: ${offer.port}\nClave: ${offer.key}`;
    }
    const link = `cieloapp://pair/${offer.sessionId}/${offer.key}`;
    return `🌙 Te invito a sincronizar Cielo\n\nID de sesión: ${offer.sessionId}\nClave: ${offer.key}\n\nO abre este enlace:\n${link}`;
  }, []);

  const handleCopyOffer = useCallback(async () => {
    if (!sync.offer) return;
    await Clipboard.setStringAsync(formatOffer(sync.offer));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sync.offer, formatOffer]);

  const handleStartHost = () => {
    setMode('host');
    sync.startHost();
  };

  const handleStartJoin = () => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
    setMode('join');
    setJoinMode('menu');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const offer: SyncOffer = JSON.parse(data);
      if (offer.v === 1 && (!offer.host || !offer.port)) {
        Alert.alert('Error', 'Código QR inválido');
        setScanned(false);
        return;
      }
      if (offer.v === 2 && !offer.sessionId) {
        Alert.alert('Error', 'Código QR inválido');
        setScanned(false);
        return;
      }
      if (!offer.key) {
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
    setJoinMode('menu');
    setManualHost('');
    setManualPort('');
    setManualKey('');
  };

  const handleDisconnect = () => {
    sync.disconnect();
    setMode('menu');
    setScanned(false);
    setJoinMode('menu');
    setManualHost('');
    setManualPort('');
    setManualKey('');
  };

  // Auto-reset after done (soft reset — keeps presence alive)
  useEffect(() => {
    if (sync.step === 'done') {
      const timer = setTimeout(() => {
        sync.reset();
        setMode('menu');
        setScanned(false);
        setJoinMode('menu');
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
          onPress={mode === 'menu' ? () => router.back() : handleDisconnect}
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
        <ScrollView style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 24, gap: 20 }}>
          <Text style={{ color: c.textBody, fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 }}>
            Sincroniza los datos entre dispositivos.{'\n'}
            El cifrado es punto a punto — nadie más puede leer los datos.
          </Text>

          {/* Known peers online */}
          {sync.knownPeers.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                ● DISPOSITIVOS CERCANOS
              </Text>
              {sync.knownPeers.map((peer) => {
                const device = sync.pairedDevices.find((d) => d.deviceId === peer.deviceId);
                return (
                  <TouchableOpacity
                    key={peer.deviceId}
                    onPress={() => sync.startHost(peer.deviceId)}
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 16,
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#4CAF50',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 20 }}>🔗</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textBody, fontWeight: '700', fontSize: 15 }}>
                        {device?.name ?? 'Dispositivo'}
                      </Text>
                      <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '600' }}>
                        En línea — Toca para conectar
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20 }}>▶</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

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

          {/* Paired devices */}
          {sync.pairedDevices.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 }}>
                DISPOSITIVOS VINCULADOS
              </Text>
                {sync.pairedDevices.map((device) => (
                  <View
                    key={device.deviceId}
                    style={{
                      backgroundColor: c.elevated,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: sync.knownPeers.some((p) => p.deviceId === device.deviceId) ? '#4CAF50' : '#999',
                    }} />
                    <Text style={{ color: c.textBody, fontWeight: '600', fontSize: 14, flex: 1 }}>
                      {device.name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11, marginRight: 8 }}>
                      {device.sessionCount} sesiones
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Eliminar dispositivo',
                          `¿Eliminar "${device.name}" de dispositivos vinculados?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => sync.removePairedDevice(device.deviceId),
                            },
                          ],
                        );
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: c.danger + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: c.danger, fontSize: 14, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          {/* Sincronizar ahora */}
          {sync.pairedDevices.length > 0 && (
            <TouchableOpacity
              onPress={sync.checkAndSync}
              style={{
                backgroundColor: c.card,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1.5,
                borderColor: c.accentStrong + '40',
                borderStyle: 'dashed',
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.accentStrong + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>🔄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textBody, fontWeight: '700', fontSize: 15 }}>
                  Sincronizar ahora
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                  Buscar dispositivos vinculados
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
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
              alignItems: 'center',
              gap: 12,
            }}>
              <QRCode
                value={JSON.stringify(sync.offer)}
                size={220}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                  color: countdown <= 30 ? '#F44336' : '#666',
                }}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </Text>
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: countdown <= 30 ? '#F44336' : '#4CAF50',
                }} />
              </View>
            </View>
          )}

          {/* Share button */}
          {sync.offer && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message: formatOffer(sync.offer!),
                    title: 'Conectar con Cielo',
                  });
                } catch {}
              }}
              style={{
                backgroundColor: c.accentStrong,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📤</Text>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Compartir enlace
              </Text>
            </TouchableOpacity>
          )}

          {/* Manual connection info */}
          {sync.offer && sync.offer.v === 1 && (
            <View style={{
              backgroundColor: c.card,
              borderRadius: 16,
              padding: 16,
              width: '100%',
              gap: 10,
            }}>
              <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>
                O conecta manualmente
              </Text>
              <TouchableOpacity
                onPress={handleCopyOffer}
                style={{
                  backgroundColor: c.elevated,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{
                  color: c.textBody,
                  fontSize: 15,
                  fontWeight: '700',
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}>
                  {sync.offer.host}:{sync.offer.port}
                </Text>
                <Text style={{
                  color: copied ? '#4CAF50' : c.accentStrong,
                  fontSize: 13,
                  fontWeight: '700',
                }}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: c.textMuted, fontSize: 11, lineHeight: 16 }}>
                El invitado puede usar esta dirección IP manualmente si no tiene cámara.
              </Text>
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

          <SyncLogViewer log={sync.log} colors={c} />

          {sync.step !== 'idle' && sync.step !== 'done' && sync.step !== 'error' && (
            <TouchableOpacity
              onPress={handleDisconnect}
              style={{
                backgroundColor: '#F44336',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Desconectar
              </Text>
            </TouchableOpacity>
          )}

          {countdown === 0 && sync.step === 'waiting_qr' && (
            <TouchableOpacity
              onPress={() => { sync.reset(); setCountdown(120); }}
              style={{
                backgroundColor: c.accentStrong,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Regenerar QR
              </Text>
            </TouchableOpacity>
          )}

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
              {/* Toggle: QR scan vs manual */}
              {joinMode === 'menu' ? (
                <View style={{
                  flexDirection: 'row',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  gap: 10,
                }}>
                  {[
                    { key: 'scan', label: '📷 Escanear QR' },
                    { key: 'manual', label: '⌨️ Manual' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setJoinMode(opt.key as 'scan' | 'manual')}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 14,
                        backgroundColor: joinMode === opt.key ? c.accentStrong : c.card,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        color: joinMode === opt.key ? '#FFFFFF' : c.textBody,
                        fontWeight: '700',
                        fontSize: 14,
                      }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Camera scan mode */}
              {joinMode === 'scan' && cameraPermission?.granted ? (
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
                    <TouchableOpacity
                      onPress={() => setJoinMode('menu')}
                      style={{ marginTop: 16, padding: 8 }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>
                        Cancelar escaneo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </CameraView>
              ) : joinMode === 'scan' && !cameraPermission?.granted ? (
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
              ) : joinMode === 'manual' ? (
                <ManualEntryView
                  theme={theme}
                  onConnect={(offer) => {
                    sync.startJoin(offer);
                  }}
                  onBack={() => setJoinMode('menu')}
                />
              ) : null}
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

              <SyncLogViewer log={sync.log} colors={c} />

              {sync.step !== 'done' && sync.step !== 'error' && (
                <TouchableOpacity
                  onPress={handleDisconnect}
                  style={{
                    backgroundColor: '#F44336',
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Desconectar
                  </Text>
                </TouchableOpacity>
              )}

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

function SyncLogViewer({ log, colors }: { log: string[]; colors: any }) {
  const scrollRef = useRef<ScrollView>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  const handleCopyLog = useCallback(async () => {
    const text = log.join('\n');
    await Clipboard.setStringAsync(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  }, [log]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (log.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [log.length]);

  return (
    <View style={{
      backgroundColor: colors.elevated,
      borderRadius: 12,
      width: '100%',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: copiedLog ? '#4CAF50' : 'transparent',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || 'rgba(128,128,128,0.15)',
      }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
          LOG
        </Text>
        {log.length > 0 && (
          <TouchableOpacity onPress={handleCopyLog} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
            <Text style={{
              color: copiedLog ? '#4CAF50' : colors.accentStrong,
              fontSize: 12,
              fontWeight: '700',
            }}>
              {copiedLog ? '✓ Copiado' : '📋 Copiar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        style={{ maxHeight: 240, minHeight: log.length > 0 ? 80 : 0 }}
        contentContainerStyle={{ padding: 12 }}
      >
        {log.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, opacity: 0.5, fontStyle: 'italic' }}>
            Sin registros aún...
          </Text>
        ) : (
          log.map((entry, i) => (
            <Text key={i} style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              {entry}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ManualEntryView({
  theme,
  onConnect,
  onBack,
}: {
  theme: any;
  onConnect: (offer: SyncOffer) => void;
  onBack: () => void;
}) {
  const c = theme.colors;
  const [mode, setMode] = useState<'tcp' | 'firebase'>('firebase');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [key, setKey] = useState('');

  const handleConnect = () => {
    if (mode === 'tcp') {
      const portNum = parseInt(port, 10);
      if (!host || !portNum || !key) {
        Alert.alert('Error', 'Completa todos los campos');
        return;
      }
      onConnect({ v: 1, host, port: portNum, key, device: '' });
    } else {
      if (!sessionId || !key) {
        Alert.alert('Error', 'Completa todos los campos');
        return;
      }
      onConnect({ v: 2, key, device: '', sessionId });
    }
  };

  const inputStyle = {
    backgroundColor: c.elevated,
    borderRadius: 12,
    padding: 14,
    color: c.textBody,
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  };

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>
        Ingresa los datos del anfitrión
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
        <TouchableOpacity
          onPress={() => setMode('firebase')}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: mode === 'firebase' ? c.accentStrong : c.card,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'firebase' ? '#FFF' : c.textBody, fontWeight: '700', fontSize: 13 }}>
            Firebase
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('tcp')}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: mode === 'tcp' ? c.accentStrong : c.card,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'tcp' ? '#FFF' : c.textBody, fontWeight: '700', fontSize: 13 }}>
            IP directa
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 10 }}>
        {mode === 'firebase' ? (
          <>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>ID de sesión</Text>
              <TextInput
                style={inputStyle}
                value={sessionId}
                onChangeText={setSessionId}
                placeholder="uuid-de-sesion"
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Clave</Text>
              <TextInput
                style={inputStyle}
                value={key}
                onChangeText={setKey}
                placeholder="base64..."
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>
        ) : (
          <>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>IP</Text>
              <TextInput
                style={inputStyle}
                value={host}
                onChangeText={setHost}
                placeholder="192.168.1.5"
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Puerto</Text>
              <TextInput
                style={inputStyle}
                value={port}
                onChangeText={setPort}
                placeholder="8443"
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Clave</Text>
              <TextInput
                style={inputStyle}
                value={key}
                onChangeText={setKey}
                placeholder="base64..."
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={handleConnect}
        style={{
          backgroundColor: c.accentStrong,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
          Conectar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} style={{ alignItems: 'center' }}>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>
          Volver
        </Text>
      </TouchableOpacity>
    </View>
  );
}
