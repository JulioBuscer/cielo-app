---
name: expo-mobile-dev
description: Develop Expo/React Native apps for Android and iOS. Use when setting up Expo projects, writing React Native components, configuring native modules, handling platform differences, or debugging mobile-specific issues.
---

# Expo Mobile Development

Guía para desarrollar apps mobile con Expo SDK 54+ y React Native 0.81+.

## Stack actual
- **Framework:** Expo SDK 54, React 19, React Native 0.81.5
- **Routing:** expo-router (file-based)
- **DB:** expo-sqlite + Drizzle ORM
- **Estilo:** NativeWind v4 + Tailwind v3
- **Estado:** TanStack React Query v5
- **Animación:** react-native-reanimated v4
- **Build:** EAS Build (Android APK/AAB)

## Configuración crítica

### New Architecture
```json
// app.json
{
  "expo": {
    "newArchEnabled": true
  }
}
```
Con New Architecture: NO inicializar módulos nativos en import-time. Usar lazy singleton:

```ts
let _db: ReturnType<typeof drizzle> | null = null;
export function getDb() {
  if (!_db) throw new Error('getDb() llamado antes de runMigrations()');
  return _db;
}
```

### SDK y versiones
| Paquete | Versión | Nota |
|---|---|---|
| expo | ~54.x | LTS actual |
| react-native | 0.81.x | Pegada a SDK |
| nativewind | ^4.2.0 | NO v5 |
| tailwindcss | ^3.4.17 | NO v4 |
| expo-sqlite | ~16.x | Con drizzle |

### Babel config
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

### Metro config
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

## Patrones clave

### SafeScreen (layout consistente)
```tsx
<SafeAreaView className="flex-1 bg-bg">
  <View className="flex-1 px-4 pt-2">{children}</View>
</SafeAreaView>
```

### KeyboardAvoidingView
```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={0}
>
```

### ID generation (sin crypto en Hermes)
```ts
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
```

### Share nativo (texto + imagen secuencial)
- `Share.share()` solo texto
- `expo-sharing` solo archivos
- Para texto + imagen: compartir imagen primero, delay 600ms, luego texto

## Debugging

```bash
# Reset data via ADB
adb shell run-as com.buscer.cieloapp rm /data/data/com.buscer.cieloapp/files/SQLite/cielo.db
adb shell pm clear com.buscer.cieloapp

# Logs en tiempo real
adb logcat -s ReactNativeJS

# Build APK
eas build --profile preview --platform android
```

## Comandos útiles
```bash
npx expo start --android    # desarrollo
npx expo start --clear      # reset cache Metro
npm install --legacy-peer-deps  # siempre con React 19
```
