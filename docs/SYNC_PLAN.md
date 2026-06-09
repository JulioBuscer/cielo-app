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

### Fase 3 — Sincronización en tiempo real

- [x] Historial de sincronización con conflictos visibles — tabla `sync_history`
- [x] Sincronización de bebés/perfiles — `profiles` y `babies` en `merge.ts`
- [x] Relay ligero vía Firebase RTDB — reemplazar TCP signaling por Firebase
- [x] Reconexión automática con pares conocidos — Firebase Presence + quick-connect UI
- [x] Background sync periódico — AppState + intervalo configurable (5 min default)
- [x] Señales RTDB para sync inmediato en foreground — `/sync_signals/{target}/{sender}`

### Fase 4 — Pre-lanzamiento (antes de Play Store)
- [ ] Migrar notificaciones de señalización a FCM (Firebase Cloud Messaging)
  - [ ] `@react-native-firebase/messaging` / `expo-notifications`
  - [ ] Registro y refresh de tokens FCM en RTDB (`/fcm_tokens/{deviceId}`)
  - [ ] Cloud Function HTTP para relay de mensajes FCM
  - [ ] Configurar APNs key para iOS
  - [ ] Manejar `contentAvailable: true` para background wake
- [ ] Dejar señales RTDB como fallback local

> **Nota:** Firebase FCM es 100% gratuito sin límites de mensajes, en plan Spark y Blaze. Las señales RTDB dan latencia ~1-2s en foreground; FCM añade capacidad de despertar la app en background. Todo en `docs/SYNC_PLAN.md`.

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

### RTDB Sync Signals (acelerador en foreground)
```
1. Usuario guarda un evento localmente → `signalPeers()` desde hooks.ts
2. Se escribe en `/sync_signals/{targetDeviceId}/{senderDeviceId}` = `{ timestamp, senderDeviceId }`
3. El target escucha `child_added` en `/sync_signals/{suDeviceId}` (hooks.ts useEffect)
4. Si el sender es paired y está online (presence), responde con `startHost(senderDeviceId)`
5. Se limpia la señal inmediatamente (`remove()`) para evitar re-fire
6. Sync P2P vía WebRTC como siempre
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
