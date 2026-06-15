# Build

```bash
# 1. Install dependencies
npm install

# 2. Build APK
cd android && ./gradlew assembleRelease
```

El APK se genera en `android/app/build/outputs/apk/release/app-release.apk`.

## Notas

- **Usa Expo dev-client**, no Expo Go (dependencias nativas).
- **Firebase** solo se usa para señalización WebRTC; si no configuras `google-services.json`, la sincronización P2P no funcionará, pero la app corre sin problemas.
- **NDK**: si el build falla con `clang++: error: clang frontend command failed with exit code 139`, es un bug del NDK >27.0. Solución: forzar NDK 27.0 en `android/gradle.properties`:
  ```gradle
  ndkVersion=27.0.12077973
  ```
- **Memoria JVM**: si el build se congela en `createBundleReleaseJsAndAssets` o el daemon de Gradle crashea con `SIGSEGV` en `MethodData::clean_method_data`, aumentar la memoria y cambiar a G1GC en `android/gradle.properties`:
  ```gradle
  org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseG1GC
  ```
- **No uses** `GRADLE_OPTS` (no es una variable real de Gradle) ni `METRO_NUM_WORKERS=1` (hace el bundling más lento).
