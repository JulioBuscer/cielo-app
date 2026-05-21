---
name: p2p-local-first
description: Architect local-first mobile apps with offline support, P2P sync, and zero-server dependencies. Use when designing data sync strategies, implementing CRDTs, or planning multi-device collaboration for offline-first apps.
---

# P2P & Local-First Mobile

Arquitectura offline-first con sincronización peer-to-peer para apps mobile.

## Filosofía (Cielo App)

| Pilar | Decisión | Por qué |
|---|---|---|
| **Offline-First** | expo-sqlite + Drizzle ORM | Cero latencia, cero dependencia de red |
| **Auth Lazy** | Sin registro inicial | Elimina el mayor punto de abandono |
| **Privacidad por Diseño** | FileSystem sandbox | Fotos nunca salen del dispositivo |
| **No Over-Engineering** | TanStack Query para cache local | No Redux, no Zustand |

## Estrategia de datos

### Local = Fuente de verdad
- SQLite en dispositivo es la DB primaria
- El usuario siempre puede leer/escribir sin conexión
- No hay "cargando..." ni "sin conexión" blockers

### Sync futura (v1.3+)
```
SQLite local → Sync Engine → Supabase/Remoto
                  ↓
            Solo texto (NUNCA fotos)
```

### Arquitectura multi-dispositivo (v2.0+)
```
Device A (SQLite) ←→ [P2P / Relay] ←→ Device B (SQLite)
    ↑                        ↑                   ↑
TanStack Query          Sync Engine         TanStack Query
```

## Gestión de IDs
```ts
// IDs generados localmente — sin depender de servidor
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
```

## Concurrencia

### Una sesión activa por tipo por bebé
```ts
// Regla de negocio: solo 1 feeding activo por bebé
// Al iniciar nueva toma, auto-finish la anterior
export async function autoFinishPreviousSession(babyId: string) {
  const active = await getDb().select().from(feedingSessions)
    .where(and(
      eq(feedingSessions.babyId, babyId),
      inArray(feedingSessions.status, ['active', 'paused'])
    ));
  for (const s of active) {
    await finishSession(s); // finish + calcular duración
  }
}
```

### Sesiones independientes
- Toma activa + Sueño activo pueden coexistir
- Cada sesión tiene su propio ciclo de vida

## Política de privacidad "Zero-Storage"
1. Solo permiso CAMERA, nunca MEDIA_LIBRARY
2. Fotos en `FileSystem.documentDirectory/cielo/diapers/`
3. Cero uploads — no existe endpoint de cloud storage
4. 100% client-side
5. Derecho al olvido: borrar foto individual o reset total

## Roadmap de sync
| Fase | Feature | Estrategia |
|---|---|---|
| MVP (ahora) | Solo local | SQLite + TanStack Query |
| v1.3 | Sync texto | Supabase con last-write-wins |
| v2.0 | Multi-cuidador | P2P o relay con CRDT básico |
| v2.1 | Fotos compartidas | Encriptadas + link temporario |
