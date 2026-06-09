# Plan de Sincronización P2P — Cielo App

## Arquitectura

### Transporte: WebRTC
- **`react-native-webrtc`** para conexión punto a punto
- STUN público de Google para NAT traversal (`stun:stun.l.google.com:19302`)
- **DataChannel** para transferencia de datos binarios
- Funciona en redes distintas (WiFi, datos móviles, redes diferentes)

### Señalización: QR + Firebase RTDB (actual) / TCP (legacy)
- **Firebase RTDB** como relay de señalización (predeterminado desde v2)
- **Host**: crea sesión en Firebase, publica SDP offer, espera SDP answer
- **Join**: escucha sesión en Firebase, lee SDP offer, publica SDP answer
- Una vez establecido WebRTC, se limpia la sesión en Firebase
- **TCP signaling** (v1, legacy): funciona como fallback en red local sin Firebase

### Cifrado: E2E con tweetnacl (XSalsa20-Poly1305)
- Clave pre-compartida generada por el anfitrión
- Se transfiere al invitado dentro del QR
- `tweetnacl secretbox` para cifrar/descifrar payloads
- Cada mensaje en WebRTC DataChannel va cifrado con esta clave

### Almacenamiento de sync state
- AsyncStorage:
  - `@sync/device_id` — UUID de este dispositivo
  - `@sync/last_sync_ats` — mapa de `{ deviceId: lastTimestampMs }`
  - `@sync/paired_devices` — lista de `{ deviceId, name, lastConnectedAt, sessionCount }`
- Firebase RTDB:
  - `/presence/{deviceId}` — `{ sessionId, lastSeen }` con `onDisconnect` cleanup
  - `/sessions/{sessionId}` — SDP exchange (se limpia tras handshake)

### Merge: last-write-wins
- Cada registro tiene `created_at` (timestamp UNIX ms)
- Conflicto: gana el de mayor `created_at`
- Se sincera con `INSERT OR REPLACE` en transacción SQLite
- Tablas sincronizadas: `timeline_events`, `catalog_items`, `tags`
- Cada sesión se registra en `sync_history` (tabla SQLite) con conteo de merges/conflictos

---

## Roadmap

### Fase 1 — Infraestructura ✅
- [x] Instalar dependencias: `react-native-webrtc`, `expo-crypto`, `expo-camera`
- [x] Configurar `app.json` (plugin cámara + permisos)
- [x] `src/sync/types.ts` — Tipos compartidos
- [x] `src/sync/crypto.ts` — `generateKey()`, `encryptPayload()`, `decryptPayload()`
- [x] `src/sync/signaling.ts` — TCP signaling server + client
- [x] `src/sync/webrtc.ts` — WebRTC peer connection + data channel
- [x] `src/sync/merge.ts` — Merge de datos en DB local
- [x] `src/sync/hooks.ts` — `useSyncHost()`, `useSyncJoin()`
- [x] `app/settings/sync.tsx` — Pantalla completa de sincronización
- [x] `app/settings/index.tsx` — Agregar item "🔄 Sincronizar"

### Fase 2 — Refinamiento UX
- [x] Indicador de progreso en tiempo real (ActivityIndicator + STEP_LABELS)
- [x] Log de pasos (conectando, intercambiando SDP, sincronizando...)
- [x] Animación de QR con cuenta regresiva (120s, color rojo <30s)
- [x] Preview de cámara con guía visual para escaneo
- [x] Botón para copiar IP:puerto manual (fallback si no hay cámara)
- [x] Entrada manual de IP/puerto/clave para invitado sin cámara

### Fase 3 — Post-MVP (orden priorizado)

**Independientes de Firebase (se pueden hacer ya):**
- [x] Historial de sincronización con conflictos visibles — tabla `sync_history`, detección en merge, UI en `app/settings/sync-history.tsx`
- [x] Sincronización de bebés/perfiles — agregar `profiles` y `babies` a las tablas sincronizadas en `merge.ts`

**Requieren Firebase RTDB (después de setup):**
- [x] Relay ligero vía Firebase RTDB — reemplazar TCP signaling por Firebase (solo señalización, datos E2E)
- [x] Reconexión automática con pares conocidos — detectar pares vía Firebase Presence, quick-connect en UI
- [x] Background sync periódico — sincronizar al volver a foreground + intervalo configurable (default 5 min)

> **Nota:** Firebase RTDB solo se usa para señalización (intercambio de SDP + ICE candidates). Los datos reales viajan P2P cifrados por WebRTC DataChannel. Ver `docs/FIREBASE_SETUP.md` para guía de configuración.

---

## Protocolo

### QR Payload (`SyncOffer`) — v1 (TCP legacy)
```json
{
  "v": 1,
  "host": "192.168.1.5",
  "port": 8443,
  "key": "a2V5...==",
  "device": "uuid-del-host"
}
```

### QR Payload (`SyncOffer`) — v2 (Firebase RTDB)
```json
{
  "v": 2,
  "key": "a2V5...==",
  "device": "uuid-del-host",
  "sessionId": "uuid-de-sesion-firebase"
}
```

### Firebase Signaling
```
1. Host crea sesión en Firebase RTDB (/sessions/{sessionId})
2. Host genera SDP offer, lo publica en hostSdp
3. Join escucha hostSdp, genera SDP answer, lo publica en joinSdp
4. Host recibe joinSdp, completa handshake WebRTC
5. Sesión Firebase se limpia (status → 'done')
6. WebRTC DataChannel establecido
7. Intercambio de datos cifrados over WebRTC
```

### Sync Payload (over WebRTC DataChannel)
```json
{
  "deviceId": "uuid",
  "timestamp": 1717000000000,
  "timelineEvents": [...],
  "catalogItems": [...],
  "tags": [...]
}
```

### Tipos de mensaje WebRTC
| Tipo | Dirección | Contenido |
|---|---|---|
| `sync_request` | Ambos | TimelineEvents, catalogItems, tags |
| `sync_response` | Ambos | Ídem |
| `sync_ack` | Ambos | Confirmación de merge exitoso |
| `sync_error` | Ambos | Mensaje de error |

---

## Estructura de archivos

```
src/sync/
├── types.ts        # SyncOffer, SyncPayload, SyncMessage, PairedDevice
├── crypto.ts       # generateKey, encryptPayload, decryptPayload
├── firebase.ts     # Firebase RTDB helpers (createSession, listenSdp, cleanup)
├── presence.ts     # Firebase Presence announce, listenKnownPeers, PairedDevice storage
├── signaling.ts    # TCPSignalingServer, TCPSignalingClient (legacy, v1)
├── webrtc.ts       # createPeerConnection, setupDataChannel
├── merge.ts        # mergeSyncPayload (timelineEvents, catalogItems, tags, profiles, babies)
├── hooks.ts        # useSync (Firebase signaling, presence, paired devices, background sync)

app/settings/
├── sync-history.tsx# SyncHistoryScreen (lista de sesiones pasadas + conflictos)
├── sync.tsx        # SyncScreen (Host / Join / QR / quick-connect peers / paired devices)
├── index.tsx       # + items "🔄 Sincronizar" y "📋 Historial de Sync"
```

---

## Dependencias

```bash
npx expo install react-native-webrtc expo-crypto expo-camera
```

### app.json plugin
```json
["expo-camera", {
  "cameraPermission": "Usar cámara para sincronizar dispositivos"
}]
```

### Permisos Android
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Permisos iOS
```xml
<key>NSCameraUsageDescription</key>
<string>Usar cámara para sincronizar dispositivos</string>
```
