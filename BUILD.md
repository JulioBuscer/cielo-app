# Build

```bash
# 1. Install dependencies
npm install

# 2. Build APK
cd android
GRADLE_OPTS="-XX:TieredStopAtLevel=1" METRO_NUM_WORKERS=1 ./gradlew assembleRelease --no-daemon
```

El APK se genera en `android/app/build/outputs/apk/release/app-release.apk`.

## Notas

- Usa Expo dev-client, no Expo Go (dependencias nativas).
- Firebase solo se usa para señalización WebRTC; si no configuras `google-services.json`, la sincronización P2P no funcionará, pero la app corre sin problemas.
- Si el build falla con `clang++: error: clang frontend command failed with exit code 139`, es un bug del NDK >27.0. Solución: forzar NDK 27.0 en `android/gradle.properties`:
```gradle
ndkVersion=27.0.12077973
```
