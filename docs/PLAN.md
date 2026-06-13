# Plan de Implementación — Sync Automático + Deep Link

## Orden de implementación

### 1. SyncProvider (Context global)
- [ ] Crear `src/sync/SyncProvider.tsx`
  - Context con todo el estado de sync (step, role, offer, log, pairedDevices, knownPeers)
  - Monta `listenSyncSignals` y `listenKnownPeers` siempre
  - Heartbeat de presencia cada 30s
  - Background sync (periódico + al foreground)
  - Debounce de signals por dispositivo (30s)

### 2. presence.ts — Heartbeat + signals mejoradas
- [ ] `startPresenceHeartbeat(deviceId)` / `stopPresenceHeartbeat()`
- [ ] Aumentar `PRESENCE_TTL` a 120s
- [ ] `sendSyncSignal()` ahora incluye `sessionId` y `key`
- [ ] `signalAllPeers()` genera sesión + key como host, escribe en Firebase
- [ ] Nueva función `signalHosted(deviceId, sessionId, key)` para que el peer host escriba su sesión

### 3. hooks.ts — Refactor
- [ ] `useSync()` → refactor para leer del contexto en vez de tener estado propio
- [ ] `signalPeers()` → ahora inicia sesión como host (genera sessionId + key + SDP), escribe en Firebase
- [ ] Mantener `signalPeers()` como standalone para mutation hooks

### 4. app/_layout.tsx
- [ ] Envolver con `<SyncProvider>`

### 5. app/settings/sync.tsx — Usar context + compartir
- [ ] Cambiar `useSync()` por `useSyncContext()`
- [ ] Botón "Compartir" en modo host (Share.share con deep link `cieloapp://pair/{sessionId}/{key}`)

### 6. app/pair/[sessionId]/[key].tsx — Deep link
- [ ] Ruta nueva que lee params y llama `startJoin()` automáticamente
- [ ] UI de progreso + redirección al home al terminar

### 7. Fix auto-sync flow
- [ ] `listenSyncSignals` recibe sessionId+key → llama `startJoin()` en vez de `startHost()`
- [ ] Quien inicia el sync (tiene datos nuevos) actúa como host
- [ ] Peer recibe señal y hace join

### 8. Fix busy flag → debounce
- [ ] Reemplazar `busy` booleano con `lastSignalTimestamps: Map<string, number>`
- [ ] Ignorar signals del mismo dispositivo si < 30s desde el último

### 9. Background sync en SyncProvider
- [ ] Sync periódico cada 5 min
- [ ] Sync al volver a foreground
- [ ] Solo si hay paired devices

## Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| `src/sync/SyncProvider.tsx` | **Nuevo** |
| `src/sync/presence.ts` | Heartbeat + signal mejorado |
| `src/sync/hooks.ts` | Refactor useSync → context; signalPeers como host |
| `src/sync/types.ts` | Posible ajuste |
| `app/_layout.tsx` | Envolver con provider |
| `app/settings/sync.tsx` | Usar context + share button |
| `app/pair/[sessionId]/[key].tsx` | **Nuevo** — deep link |

## Commits (MX spanish)

1. `feat(sync): crear SyncProvider con contexto global de sincronización`
2. `feat(sync): agregar heartbeat de presencia y signals con sesión`
3. `fix(sync): refactor useSync para usar contexto global`
4. `feat(sync): envolver app con SyncProvider en layout`
5. `feat(sync): migrar SyncScreen a contexto + botón compartir`
6. `feat(sync): ruta deep link para pares`
7. `fix(sync): auto-sync con host/join correcto`
8. `fix(sync): debounce de signals por dispositivo`
9. `feat(sync): background sync automático en provider`
