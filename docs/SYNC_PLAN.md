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

### Merge: operation-log con trazabilidad
- Cada mutación local (insert/update/delete) escribe en `sync_outbox`
- El outbox contiene `{ table_name, record_id, operation, data (JSON), created_by, created_at }`
- Sync envía solo operaciones desde `lastSyncAt[peerDeviceId]` (incremental)
- Primera sync con un peer: full sync (SELECT * WHERE deleted_at IS NULL)
- Merge recibe `operations[]`, aplica en orden: insert → INSERT, update → UPDATE si más nuevo, delete → SET deleted_at
- Tablas syncables con columnas de trazabilidad: `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`
- Cada sesión se registra en `sync_history` con merged/conflict counts

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

### Fase 4 — Sync Outbox + Trazabilidad ✅

**Schema & columnas:**
- [x] `sync_outbox` table: `id, table_name, record_id, operation, data (JSON), created_by, created_at`
- [x] Columnas en tablas syncables: `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`
- [x] Migraciones ALTER TABLE para columnas nuevas (backward compat)

**Lógica de sync:**
- [x] `src/sync/outbox.ts` — `writeOutbox(operation)`, `pruneOutbox()`, `readOutbox(fromTime)`
- [x] `src/sync/types.ts` — `SyncOperation { id, tableName, recordId, operation: 'insert'|'update'|'delete', data, createdAt }`
- [x] `src/sync/merge.ts` — procesar `operations[]`:
  - `insert` → INSERT record con `created_by = senderDeviceId`
  - `update` → UPDATE si `remote.updated_at > local.updated_at`
  - `delete` → SET `deleted_at = now(), deleted_by = senderDeviceId`
  - Baby dedup: match por `LOWER(name) + birthDate`, UPDATE si existe
  - Full sync para primer contacto (sin `lastSyncAt`)
- [x] `gatherLocalPayload()` → leer desde `sync_outbox` desde `lastSyncAts[peerDeviceId]`
- [x] Post-sync cleanup: `DELETE FROM sync_outbox WHERE created_at <= payload.timestamp`

**Wiring mutations:**
- [x] `useBaby.ts` → tras INSERT/UPDATE, llamar `writeOutbox('babies', ...)` + `signalPeers()`
- [x] `useProfile.ts` → igual
- [x] `useTimeline.ts` → insertTimelineEvent + update ya tenían writeOutbox, completado resto
- [x] `useCatalogItems.ts` → writeOutbox en insert/update/delete + signalPeers
- [x] `useTags.ts` → writeOutbox en upsert + signalPeers
- [x] `useGrowthLogs.ts` → writeOutbox en timeline insert + signalPeers
- [x] Firebase imports lazy en `hooks.ts` (evita crash `RNFBAppModule not found` en Android)

**UI de trazabilidad:**
- [ ] Burbujas de timeline: mostrar `created_by` si el device es diferente al local (icono/color)
- [ ] Detalle de evento: sección "Origen" con dispositivo que creó/modificó/eliminó
- [ ] Historial de sync (`sync-history.tsx`): mostrar trazabilidad por sesión

### Fase 5 — Pre-lanzamiento (antes de Play Store)
- [ ] Migrar notificaciones de señalización a FCM
  - [ ] `@react-native-firebase/messaging` / `expo-notifications`
  - [ ] Registro y refresh de tokens FCM en RTDB (`/fcm_tokens/{deviceId}`)
  - [ ] Cloud Function HTTP para relay de mensajes FCM
  - [ ] Configurar APNs key para iOS
  - [ ] Manejar `contentAvailable: true` para background wake
- [ ] Dejar señales RTDB como fallback local

> **Nota:** Firebase FCM es 100% gratuito sin límites de mensajes. Las señales RTDB dan ~1-2s en foreground; FCM añade background wake.

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

**v2 (legacy — full-table):**
```json
{
  "deviceId": "uuid",
  "timestamp": 1717000000000,
  "timelineEvents": [...],
  "catalogItems": [...],
  "tags": [...]
}
```

**v3 (incremental — operations):**
```json
{
  "deviceId": "uuid",
  "timestamp": 1717000000000,
  "operations": [
    {
      "tableName": "babies",
      "recordId": "abc123",
      "operation": "insert",
      "data": { ... full record ... },
      "createdAt": 1717000000000
    },
    {
      "tableName": "timeline_events",
      "recordId": "def456",
      "operation": "delete",
      "data": { "id": "def456", "deletedAt": 1717000000000 },
      "createdAt": 1717000000000
    }
  ]
}
```

### Columnas de trazabilidad (por tabla syncable)
| Columna | Tipo | Propósito |
|---|---|---|
| `created_at` | INTEGER | Timestamp de creación |
| `created_by` | TEXT | `device_id` que creó el registro |
| `updated_at` | INTEGER | Última modificación |
| `updated_by` | TEXT | `device_id` que modificó |
| `deleted_at` | INTEGER | Soft-delete (NULL = activo) |
| `deleted_by` | TEXT | `device_id` que eliminó |

### Tabla `sync_outbox`
```sql
CREATE TABLE sync_outbox (
  id          TEXT PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
  data        TEXT NOT NULL,  -- JSON: full record snapshot
  created_by  TEXT NOT NULL,  -- device_id que originó la mutación
  created_at  INTEGER NOT NULL
);
```

### Baby deduplication
Al recibir un `insert` de `babies`:
```sql
SELECT * FROM babies WHERE LOWER(name) = LOWER(incoming.name) AND birth_date = incoming.birth_date
```
- Si existe → UPDATE sobre el existente (merge de campos)
- Si no existe → INSERT normal con `created_by = senderDeviceId`

### Tipos de mensaje WebRTC
| Tipo | Dirección | Contenido |
|---|---|---|
| `sync_request` | Ambos | Solicita datos |
| `sync_response` | Ambos | `operations[]` o `timelineEvents[]`+`catalogItems[]`+... según versión |
| `sync_ack` | Ambos | Confirmación de merge exitoso |
| `sync_error` | Ambos | Mensaje de error |

---

## Estructura de archivos

```
src/sync/
├── types.ts        # SyncOffer, SyncPayload, SyncOperation, SyncMessage, PairedDevice
├── crypto.ts       # generateKey, encryptPayload, decryptPayload
├── firebase.ts     # Firebase RTDB helpers (createSession, listenSdp, cleanup)
├── presence.ts     # Firebase Presence announce, listenKnownPeers, PairedDevice storage
├── signaling.ts    # TCPSignalingServer, TCPSignalingClient (legacy, v1)
├── webrtc.ts       # createPeerConnection, setupDataChannel
├── outbox.ts       # writeOutbox, readOutbox, pruneOutbox
├── merge.ts        # mergeSyncPayload (operations[] processing, soft-delete, dedup)
├── hooks.ts        # useSync (signaling, presence, paired devices, background sync)

src/db/
├── schema.ts       # + syncOutbox table, + trazability columns
├── client.ts       # + CREATE TABLE, + ALTER TABLE migrations

app/settings/
├── sync-history.tsx# SyncHistoryScreen (lista de sesiones + trazabilidad)
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
