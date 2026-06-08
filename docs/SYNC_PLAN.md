# Plan de Sincronización P2P — Cielo App

## Arquitectura

### Transporte: WebRTC
- **`react-native-webrtc`** para conexión punto a punto
- STUN público de Google para NAT traversal (`stun:stun.l.google.com:19302`)
- **DataChannel** para transferencia de datos binarios
- Funciona en redes distintas (WiFi, datos móviles, redes diferentes)

### Señalización: QR + TCP signaling temporal
- Sin servidor de señalización permanente
- **Anfitrión**: inicia servidor TCP temporal en puerto aleatorio, muestra QR con IP:puerto
- **Invitado**: escanea QR, se conecta al TCP signaling server
- Intercambio de SDP (offer/answer) + ICE candidates por TCP
- Una vez establecido WebRTC, se cierra el TCP signaling server

### Cifrado: E2E con AES-256-GCM
- Clave pre-compartida generada por el anfitrión
- Se transfiere al invitado dentro del QR (cifrado en tránsito por el canal local)
- `expo-crypto`: `encryptAsync` / `decryptAsync` con AES-256-GCM
- Cada mensaje en WebRTC DataChannel va cifrado con esta clave

### Almacenamiento de sync state
- AsyncStorage:
  - `@sync/key` — clave AES compartida (base64)
  - `@sync/paired_device` — ID del dispositivo emparejado
  - `@sync/last_sync_ats` — mapa de `{ deviceId: lastTimestampMs }`
- No se requiere tabla SQLite adicional

### Merge: last-write-wins
- Cada registro tiene `created_at` (timestamp UNIX ms)
- Conflicto: gana el de mayor `created_at`
- Se sincera con `INSERT OR REPLACE` en transacción SQLite
- Tablas sincronizadas: `timeline_events`, `catalog_items`, `tags`

---

## Roadmap

### Fase 1 — Infraestructura (esta sesión)
- [ ] Instalar dependencias: `react-native-webrtc`, `expo-crypto`, `expo-camera`
- [ ] Configurar `app.json` (plugin cámara + permisos)
- [ ] `src/sync/types.ts` — Tipos compartidos
- [ ] `src/sync/crypto.ts` — `generateKey()`, `encryptPayload()`, `decryptPayload()`
- [ ] `src/sync/signaling.ts` — TCP signaling server + client
- [ ] `src/sync/webrtc.ts` — WebRTC peer connection + data channel
- [ ] `src/sync/merge.ts` — Merge de datos en DB local
- [ ] `src/sync/hooks.ts` — `useSyncHost()`, `useSyncJoin()`
- [ ] `app/settings/sync.tsx` — Pantalla completa de sincronización
- [ ] `app/settings/index.tsx` — Agregar item "🔄 Sincronizar"

### Fase 2 — Refinamiento UX
- [ ] Indicador de progreso en tiempo real
- [ ] Log de pasos (conectando, intercambiando SDP, sincronizando...)
- [ ] Animación de QR con cuenta regresiva
- [ ] Preview de cámara con guía visual para escaneo
- [ ] Botón para copiar IP:puerto manual (fallback si no hay cámara)

### Fase 3 — Post-MVP
- [ ] Reconexión automática con pares conocidos
- [ ] Background sync periódico
- [ ] Relay ligero vía Firebase RTDB (solo señalización, datos siempre E2E)
- [ ] Historial de sincronización con conflictos visibles
- [ ] Sincronización de bebés/perfiles

---

## Protocolo

### QR Payload (`SyncOffer`)
```json
{
  "v": 1,
  "host": "192.168.1.5",
  "port": 8443,
  "key": "a2V5...==",
  "device": "uuid-del-host"
}
```

### TCP Signaling (temporal)
```
1. Cliente conecta → envía saludo
2. Host envía su SDP offer
3. Cliente responde con SDP answer
4. Host confirma → ambos cierran TCP
5. WebRTC DataChannel establecido
6. Intercambio de datos cifrados over WebRTC
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
├── types.ts        # SyncOffer, SyncPayload, SyncMessage
├── crypto.ts       # generateKey, encryptPayload, decryptPayload
├── signaling.ts    # TCPSignalingServer, TCPSignalingClient
├── webrtc.ts       # createPeerConnection, setupDataChannel
├── merge.ts        # mergeSyncPayload (INSERT OR REPLACE)
├── hooks.ts        # useSyncHost, useSyncJoin

app/settings/
├── sync.tsx        # SyncScreen (Host / Join / QR / progreso)
├── index.tsx       # + item "🔄 Sincronizar" en SETTINGS_ITEMS
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
