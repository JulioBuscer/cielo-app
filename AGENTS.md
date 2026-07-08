## Session Progress

### Goal
- Diagnosticar y corregir error "FOREIGN KEY constraint failed" en `useSaveTimelineEvent` y `useStartSleep` tras importar backup de datos

### Constraints & Preferences
- Conventional commits en español MX formal/técnico
- Build manual con `MALLOC_CHECK_=0 ./gradlew assembleRelease`
- Commit solo si build exitoso

### Done
- **Bug WebRTC corregido**: `runCleanup()` en `listenJoinSdp` cerraba `pcRef.current` antes de `setRemoteAnswer` → commit `df9e756`
- **ABI filter**: `ndk { abiFilters "arm64-v8a", "armeabi-v7a" }` en `app/build.gradle`
- **Commit `f6a9d55`**: Mirror catalog_items → event_types en sync (FK healing migration en `runMigrations()`)
- **Commit `be7ebe2`** (v0.7.3): `resolveProfileId()` en storage.ts — valida `ACTIVE_PROFILE_ID` contra DB y fallback al primer perfil. Reemplaza `getProfileId()` en hooks de timeline, sesiones, food/growth logs. Guards `!profile` en chat screen.
- **Commit `7ad9e51`** (v0.7.4): `useActiveProfile()` también usa `resolveProfileId()` — sin esto el guard del chat screen bloqueaba todas las mutaciones porque `getProfileId()` retornaba `''`.
- **Commit `38d4866`** (v0.7.5): Módulo de perfil del cuidador — pantallas de listado (`/settings/profiles`) y editor (`/settings/profile/[id]`), mutations update/delete con soft-delete, reasignación automática de perfil activo, validación de no eliminar el último perfil.
- **Commit `ecd3458`** (v0.7.6): Fix deadlock de sincronización — en listenSyncSignals, signalQueueFlush y checkAndSync. El receptor de una señal ahora siempre inicia host, eliminando el tiebreaker que causaba que ambos dispositivos esperaran indefinidamente.

# Build Notes

## Android Release Build

```bash
MALLOC_CHECK_=0 ./gradlew assembleRelease
```

### Why MALLOC_CHECK_=0?
- NDK 27.1 uses clang 18, which triggers a **false positive** glibc heap corruption detection (`corrupted size vs. prev_size`) when compiling C++20 template-heavy headers (folly, fmt, etc.) on cold cache
- `MALLOC_CHECK_=0` disables glibc's malloc checking, allowing clang 18 to compile without crashing
- This was persisted to `~/.bashrc`

### .cxx caches
- After one successful build, subsequent builds work even without `MALLOC_CHECK_=0` (warm cache)
- To force a fresh C++ compile: `rm -rf node_modules/.pnpm/*/node_modules/*/android/.cxx android/app/.cxx`

### settings.gradle
- RN Gradle plugin path patched for Gradle 8.13 compatibility (prevents duplicate `includeBuild`)

### Key config
- NDK 27.1 (default from Expo 52/react-native 0.81)
- `abiFilters: ["arm64-v8a", "armeabi-v7a"]` (from app.json) — builds all 4 archs
- `expo.useLegacyPackaging=false` (default) — requires 4K-aligned .so files

### Firebase
- Warning about deprecated Firebase namespace API is harmless
- "No Firebase App '[DEFAULT]' has been called — call firebase.initializeApp()` requiere `apply plugin: "com.google.gms.google-services"` al final de `android/app/build.gradle`
  - **Importante:** `expo prebuild --clean` borra este cambio manual — hay que re-agregarlo después de regenerar nativos
  - `google-services.json` va configurado via `expo-build-properties` en `app.json` (android.googleServicesFile)
- El classpath `com.google.gms:google-services:4.4.2` en `android/build.gradle` también se pierde con prebuild — re-agregar

---

# Cielo — Baby Tracker & P2P Sync Platform

Aplicación móvil offline-first y colaborativa para el seguimiento de bebés ("WhatsApp de papás"). Permite registrar alimentación, sueño, pañal, crecimiento, temperatura y alimentos de forma local y compartirlos en tiempo real sin un backend centralizado tradicional.

## Stack

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Expo v54 (React Native 0.81) | Usa `expo-router` y dev-client (no Expo Go debido a dependencias nativas) |
| Package manager | pnpm | Workspace configurado con pnpm, no usar npm/yarn |
| UI | NativeWind v4 + Tailwind CSS v3 | Estilos utilitarios adaptados a componentes nativos de React Native |
| DB Local | SQLite (expo-sqlite) | Base de datos local-first en archivo físico `cielo.db` |
| ORM | Drizzle ORM | Configurado en `drizzle.config.ts`, esquema tipado en `src/db/schema.ts` |
| Sincronización | P2P WebRTC + Firebase RTDB | Sincronización incremental bidireccional punto a punto con Firebase para señalización y presencia |
| Storage de fotos | FileSystem local (expo-file-system) | Guardado local en el sandbox del dispositivo |

## Convenciones críticas

- **Inicialización lazy de base de datos**: En `src/db/client.ts`, la base de datos se abre de manera perezosa durante la llamada a `runMigrations()` en vez de en el top-level del módulo. Esto evita NullPointerExceptions durante el arranque con la New Architecture de React Native (JSI).
- **Migraciones de esquema manuales**: Por estabilidad nativa en Android, no se usa `drizzle-kit push` ni migrations multi-statement en producción. Los cambios se declaran de manera imperativa en la función `runMigrations()` de `src/db/client.ts` capturando errores de columnas duplicadas.
- **Cola de outbox local-first**: Toda modificación (insert, update, delete) sobre las tablas core (`profiles`, `babies`, `timeline_events`, `catalog_items`, `tags`) genera un registro en `sync_outbox` para su posterior sincronización incremental e intercambio WebRTC.
- **Borrado lógico (`deletedAt` / `deletedBy`)**: Para evitar la pérdida de consistencia en sincronizaciones offline concurrentes, los registros no se eliminan físicamente. Se actualizan con `deletedAt` y `deletedBy` para propagarse a otros dispositivos.
- **Lógica de timeline unificada**: Los eventos específicos de tomas, sueño, pañales y medicamentos se insertan en `timeline_events`, relacionando sus sesiones correspondientes si existen, y guardando datos variables en la columna `values` en formato JSON.
- **Flujo de commits y ramas**: Conventional commits, español MX formal/técnico. Trabajar siempre sobre `dev` y hacer merge a `main` al probar.
- **Versionado antes de rebuild APK**: Antes de ejecutar `./gradlew assembleRelease`, actualizar la versión en **3 lugares**: `package.json` (version), `app.json` (expo.version) y `android/app/build.gradle` (versionCode +1, versionName). Esto permite identificar el build en pruebas. La versión canónica es la de `package.json`; las otras dos deben reflejarla.
- **Keystore fuera de android/**: El release keystore vive en `keystores/release.keystore` (no en `android/app/`). `expo prebuild --clean` borra todo `android/`, así que el keystore se copia desde `keystores/` después del prebuild via `scripts/build-android-clean.sh`. Esto garantiza que la firma nunca cambie y `adb install -r` funcione sin perder datos.
- **Build scripts**: Usar `scripts/build-android-v2.sh` (optimizado). El original `scripts/build-android-clean.sh` se mantiene como fallback. Ambos usan `CI=true` para evitar prompts interactivos de prebuild. El script v2 auto-instala el APK via `adb install -r`.

## Arquitectura

```
cielo-app/
  app/                      → Rutas de Expo Router (File-based routing)
    (tabs)/
      _layout.tsx, index.tsx → Tab principal de Chats (vista tipo WhatsApp)
    baby/                   → Pantallas de gestión de perfil de bebés (crear, editar, eliminar)
    catalog/                → Editor y gestor de items de catálogo y plantillas
    chat/                   → Detalle de chat/timeline por bebé
    food/                   → Registro e historial de alimentación complementaria
    logs/                   → Formulario unificado de logs e inputs de eventos
    onboarding/             → Configuración inicial al abrir la app por primera vez
    pair/                   → Pantalla para emparejar y escanear códigos de sincronización
    settings/               → Pantalla de configuración general y perfil
    stats/                  → Estadísticas de tomas, sueño, pañales, etc.
    wake-windows.tsx        → Vista interactiva de ventanas de sueño / vigilia
  src/
    components/             → Componentes UI reusables (burbujas, inputs, sheets, modal)
    constants/              → Constantes globales
    db/
      client.ts             → Singleton de Drizzle, inicialización y migraciones SQL
      schema.ts             → Esquema de Drizzle SQLite con 17 tablas y tipos
    growth/                 → Lógica y helpers para curvas de crecimiento de la OMS
    hooks/                  → React Query / Drizzle custom hooks (useFoodLogs, useTimeline, etc.)
    services/
      imageStorage.ts       → Guardado de fotos locales usando expo-file-system
    sync/
      SyncProvider.tsx      → Core de sincronización P2P por WebRTC y presencia Firebase
      webrtc.ts, presence.ts → Lógica de emparejamiento WebRTC y RTDB
    theme/                  → Proveedor de tema claro/oscuro
    utils/                  → Helpers de formateo, storage local, id generator, etc.
```

## Database

SQLite local a través de `expo-sqlite` y Drizzle ORM.

### 17 tablas core

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Cuidadores (`mama`, `papa`, `abue`, `nanny`, `bestie`) con campo `avatarUri` |
| `babies` | Perfil del bebé (name, birth_date, emoji, sex, status, data de nacimiento) |
| `event_types` | Catálogo de tipos de eventos del sistema (deprecated en favor de `catalog_items`) |
| `tags` | Autocompletado de síntomas/notas reutilizables por bebé |
| `diaper_observations` | Observaciones físicas del pañal (blood, mucus, diarrhea, etc.) con métricas |
| `feeding_sessions` | Sesiones de tomas activas o finalizadas (breast_left, breast_right, bottle) |
| `feeding_status_events` | Trazabilidad del temporizador de tomas (start, pause, resume, finish) |
| `growth_logs` | Registro de crecimiento físico e histórico de curvas OMS |
| `sleep_sessions` | Sesiones de sueño activas o finalizadas del bebé |
| `sleep_status_events` | Trazabilidad del temporizador de sueño (start, pause, resume, finish) |
| `timeline_events` | Contenedor unificado de eventos históricos y sus valores JSON |
| `event_presets` | Plantillas de eventos preconfigurados (deprecated en favor de `catalog_items`) |
| `sync_history` | Bitácora de emparejamientos y sincronizaciones P2P exitosas o erróneas |
| `sync_outbox` | Bitácora de mutaciones locales pendientes de ser enviadas |
| `catalog_items` | Catálogo unificado de tipos de eventos y plantillas creadas por usuarios |
| `food_catalog` | Catálogo de alimentos (clasificados en fruta, verdura, cereal, proteína y grasa) |
| `food_logs` | Registro de alimentos consumidos, primeras tomas y reacciones del bebé |

### Enums locales en Drizzle Schema
- **Profiles role**: `mama`, `papa`, `abue`, `nanny`, `bestie`
- **Babies sex**: `male`, `female`, `unknown`
- **Babies status**: `healthy`, `sick`, `unknown`
- **Feeding type**: `breast_left`, `breast_right`, `bottle`
- **Feeding bottleSubtype**: `breast_milk`, `formula`, `mixed`, `other`
- **Feeding/Sleep session status**: `active`, `paused`, `finished`
- **Food group**: `fruit`, `vegetable`, `grain`, `protein`, `fat`

## Sincronización P2P e In Incremental

El sistema opera completamente sin conexión, persistiendo todo cambio a `sync_outbox` localmente. Al detectar un peer conectado:
1. **Presencia y Señalización**: Se utiliza Firebase Realtime Database para publicar la presencia temporal del dispositivo e intercambiar ofertas/respuestas WebRTC.
2. **WebRTC Data Channel**: Al establecer el canal WebRTC, los dispositivos calculan el delta de sincronización a partir de sus marcas de tiempo y envían sus deudas.
3. **Resolución de conflictos**: `src/sync/merge.ts` procesa los registros entrantes, evaluando la fecha de última actualización y unificando el estado de la base de datos SQLite sin sobrescribir datos válidos.

## Reference commands

```bash
pnpm install          # Instalar dependencias
pnpm start            # Iniciar el dev server de Expo
pnpm android          # Compilar y arrancar la app en emulador/dispositivo Android (dev-client)
pnpm ios              # Compilar y arrancar la app en simulador iOS (dev-client)
pnpm web              # Arrancar la versión web de la app
pnpm gen:sitemap      # Generar sitemap estático de la app

# Compilaciones nativas locales (Gradle)
pnpm build:android:debug   # Generar APK de depuración
pnpm build:android:release # Generar APK firmada de lanzamiento (usa MALLOC_CHECK_=0)
pnpm build:android:clean   # Limpiar caché de compilación y reconstruir depuración
pnpm build:prebuild        # Limpiar y regenerar el directorio nativo android/

# Compilaciones remotas con EAS
pnpm build:eas:android     # Build de Android en Expo Application Services
pnpm build:eas:ios         # Build de iOS en Expo Application Services
```

# Git workflow

## Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción — siempre deployable |
| `dev` | Integración — rama por defecto para features en progreso |
| `feat/<nombre>` | Features nuevas. Nombre en kebab-case inglés (ej: `feat/cloudflare-r2-upload`) |
| `fix/<descripcion>` | Bug fixes |
| `chore/<descripcion>` | Tooling, config, refactors, dependencias |

## Flujo

1. Crear rama desde `dev`: `git checkout dev && git checkout -b feat/<nombre>`
2. Commits incrementales en la rama feature
3. Al terminar: merge a `dev`, probar, luego merge a `main`
4. `main` siempre refleja lo que está en producción

## Tags

- `v<major>.<minor>.<patch>` para releases (se decide al llegar a producción)

## Convención de commits

- **Idioma:** Español MX — formal y técnico
- **Formato:** conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- **Primera línea:** tipo(scope): resumen corto (max 72 chars, primera letra mayúscula)
- **Cuerpo técnico:** bullet points en español explicando qué cambió, dónde y por qué
- **Historia:** párrafo narrativo al final, escrito en primera persona como si el usuario
  mismo lo hubiera escrito ("hice X", "implementé Y", "decidí Z"). Cuando la IA haya sido
  parte fundamental para resolver un problema específico, usar segunda persona
  ("usaste la IA para depurar el pooler"). No mencionar IA cuando no sea relevante —
  el commit debe leerse como si el autor fuera el usuario.


## Historial de hits

- [x] Onboarding y selección de perfiles de cuidadores.
- [x] Formulario de logs unificado para pañal, tomas, sueño, mediciones y temperatura.
- [x] "WhatsApp de papás": Vista principal del timeline en formato de burbujas con detalles completos del evento.
- [x] Sincronización multi-peer incremental de babies, profiles, timeline_events, catalog_items y tags.
- [x] Auto-sync periódico cada minuto al detectar peers mediante Firebase RTDB presencia.
- [x] Borrado lógico (`deletedAt`) propagable de eventos.
- [x] Botón para compartir logs directamente a WhatsApp desde cada burbuja.
- [x] Catálogo de alimentos complementarios (`food_catalog`) sembrado automáticamente.
- [x] Registro estructurado e historial de reacciones de alimentos complementarios.
- [x] Migración robusta de datos antiguos de peso y altura al modelo unificado `measurement`.
- [x] Workaround de `MALLOC_CHECK_=0` documentado e integrado para NDK 27.1 / Clang 18 en compilación release.
- [x] Integración de guardado y lectura de imágenes en la base de datos de pañales usando el FileSystem nativo.
- [x] Corrección de FK constraint fail en sync: mirror automático de catalog_items → event_types durante merge y migración de curación para DBs existentes.
