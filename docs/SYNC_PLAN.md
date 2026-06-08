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
- [ ] Historial de sincronización con conflictos visibles — tabla `sync_history` + UI de conflictos
- [ ] Sincronización de bebés/perfiles — agregar `profiles` a las tablas sincronizadas

**Requieren Firebase RTDB (después de setup):**
- [ ] Relay ligero vía Firebase RTDB — reemplazar TCP signaling por Firebase (solo señalización, datos E2E)
- [ ] Reconexión automática con pares conocidos — detectar pares vía Firebase Presence
- [ ] Background sync periódico — sincronizar en segundo plano cuando hay cambios

> **Nota:** Firebase RTDB solo se usa para señalización (intercambio de SDP + ICE candidates). Los datos reales viajan P2P cifrados por WebRTC DataChannel. Ver `docs/FIREBASE_SETUP.md` para guía de configuración.

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
