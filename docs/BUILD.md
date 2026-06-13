# Build — Cielo App

## Requisitos generales

| Recurso | Android | iOS |
|---|---|---|
| PC | Linux / macOS / Windows | **macOS** (obligatorio) |
| IDE | Android Studio | Xcode 16+ |
| Node.js | >= 18 | >= 18 |
| Expo CLI | `npm install -g eas-cli` | `npm install -g eas-cli` |
| Cuenta Expo | https://expo.dev/signup | https://expo.dev/signup |
| Apple Developer | — | $99/año |
| google-services.json | ✅ (raíz del proyecto) | — |
| GoogleService-Info.plist | — | ✅ (raíz del proyecto) |

---

## 0. Filosofía del Build (Roadmap)

Cada build es una *negociación* entre tres fuerzas:

```
Tamaño   ↔   Compatibilidad   ↔   Velocidad de build
```

| Priorizas        | Sacrificas                     | Para qué                                   |
|-----------------|--------------------------------|--------------------------------------------|
| **Tamaño**      | Compatibilidad + build lento   | Distribuir a usuarios finales (release)    |
| **Compatibilidad** | Tamaño grande + build lento | Development build, pruebas en dispositivo |
| **Velocidad**   | Tamaño + compatibilidad        | Iteración rápida en desarrollo             |

### Decisiones clave

| Decisión | Efecto | Por qué |
|---|---|---|
| `arm64-v8a` **solo** | APK pasa de 237 MB → 40 MB | El 95%+ de dispositivos modernos son ARM64. Las otras ABIs duplican el APK sin beneficio real. |
| `expo.useLegacyPackaging=true` | Ahorra ~20-30 MB adicionales | Comprime las `.so` nativas dentro del APK en vez de dejarlas sin comprimir. Solo aplica a debug. |
| `newArchEnabled=true` | Requiere React Native 0.76+ | `react-native-worklets` 0.8.3 exige new architecture. No hay opción. |
| Deshabilitar native linking de `react-native-worklets` | Evita error `Duplicate class` | Reanimated 3.19.x ya incluye el código nativo de worklets. El paquete debe quedarse instalado (nativewind lo necesita como plugin Babel) pero sin linking nativo. |
| `-XX:+UseParallelGC` en JVM | Build estable sin SIGSEGV | G1GC (default en JDK 17+) crashea con proyectos grandes. ParallelGC es más predecible. |
| `debuggableVariants = []` | APK standalone sin Metro | Por defecto debug APK no incluye el JS bundle. Con `[]` se embebe el bundle en el APK. El flag `--no-daemon` evita que el daemon quede colgado. |
| Google Services plugin en gradle | Firebase funciona en APK standalone | Sin `classpath` + `apply plugin` + `google-services.json` en `android/app/`, el módulo `@react-native-firebase/database` falla silenciosamente. |

---

## 1. Build APK local (sin EAS)

Compila en tu propia PC, sin subir nada a la nube.

### Prerrequisitos

```bash
java -version                          # Java 17+ (recomendado 21)
npx expo --version                     # Expo CLI
echo $ANDROID_HOME                     # debe apuntar al SDK
```

#### ANDROID_HOME

```bash
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
source ~/.bashrc
```

O usa `android/local.properties` (ignorado por git):
```bash
echo "sdk.dir=/usr/lib/android-sdk" > android/local.properties
```

#### SDK, NDK, cmdline-tools

```bash
# 1. Instalar cmdline-tools 13.0 (necesario para platform 36)
sudo apt install google-android-cmdline-tools-13.0-installer

# 2. Aceptar licencias
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager --licenses

# 3. NDK
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager \
  "ndk;27.1.12297006"

# 4. Platform
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager \
  "platforms;android-36"

# 5. Build tools
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager \
  "build-tools;36.0.0"
```

> Usa **siempre** cmdline-tools >= 13.0. Versiones anteriores (11.0) no entienden el formato XML v4 de platform 36.

### Configuración uno por uno

#### 1. `android/gradle.properties`

```properties
# --- Memoria JVM ---
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC
org.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64

# --- New Architecture (obligatorio) ---
newArchEnabled=true

# --- Optimizaciones de APK ---
android.abis=arm64-v8a
expo.useLegacyPackaging=true
```

#### 2. `react-native.config.js` (raíz del proyecto)

```js
module.exports = {
  dependencies: {
    "react-native-worklets": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
```

#### 3. `android/build.gradle` — Google Services + worklets exclusion

```gradle
buildscript {
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
    classpath('com.google.gms:google-services:4.4.2')  // ← OBLIGATORIO para Firebase
  }
}
```

#### 4. `android/app/build.gradle`

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"
apply plugin: "com.google.gms.google-services"  // ← OBLIGATORIO para Firebase

react {
    // ...
    debuggableVariants = []  // ← embebe JS bundle → APK standalone sin Metro
    // ...
}

android {
    // Doble protección contra worklets duplicados
    configurations.all {
        exclude group: 'com.swmansion.worklets', module: 'react-native-worklets'
    }
}
```

#### 5. `google-services.json`

Debe estar en **dos lugares**:
- `google-services.json` (raíz del proyecto)
- `android/app/google-services.json` (lo necesita el plugin de Gradle)

```bash
cp google-services.json android/app/google-services.json
```

### Recipe final: build APK standalone

```bash
# 1. Limpiar
cd android
./gradlew clean

# 2. Build debug APK (con JS bundle embebido + Firebase + optimizaciones)
./gradlew assembleDebug --no-daemon

# 3. Build release APK (mismo código, sin banner React Native, firmado)
./gradlew assembleRelease --no-daemon

# 4. Salida
ls -lh app/build/outputs/apk/debug/app-debug.apk
ls -lh app/build/outputs/apk/release/app-release.apk
```

### Debug vs Release

| Aspecto | Debug | Release |
|---|---|---|
| Tamaño | ~44 MB | ~26 MB |
| JS bundle | ✅ embebido | ✅ embebido |
| Hermes | ✅ | ✅ |
| Firebase | ✅ | ✅ |
| P2P / WebRTC | ✅ | ✅ |
| Barra roja errores | ✅ visible | ❌ oculta |
| Banner "React Native" | ✅ visible | ❌ oculto |
| Minificación ProGuard | ❌ off | ❌ off por defecto |
| Firma | debug.keystore automática | debug.keystore (cambiar para Play Store) |

> **Para Play Store**: necesitas un keystore propio y habilitar ProGuard con reglas para Firebase y WebRTC (ver sección de problemas). Mientras tanto, el release APK con debug.keystore es 100% representativo del comportamiento en producción.

### Instalación

```bash
# Con USB conectado
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk

# O transfiere el APK y toca en el dispositivo
```

### Instalación

```bash
# Con USB conectado
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# O transfiere el APK y toca en el dispositivo
```

---

## 2. Build por EAS (Expo Application Services)

Compila en servidores de Expo en la nube. No requiere Android Studio ni SDK local.

```bash
npm install -g eas-cli
eas login
```

```bash
eas build -p android --profile preview
```

El APK de EAS funciona igual que el local. Si el QR de sincronización no aparece, verifica que Firebase esté configurado (google-services.json en Secrets del proyecto Expo).

---

## 3. Solución de problemas

### "Native module RNFBAppModule not found" / Firebase no funciona

**Causa:** Falta el plugin Google Services en gradle o el `google-services.json` en `android/app/`.

**Verificar:**
```bash
# 1. ¿Está google-services.json en android/app/?
ls -la android/app/google-services.json

# 2. ¿Tiene el classpath en android/build.gradle?
grep "google-services" android/build.gradle

# 3. ¿Tiene el apply plugin en android/app/build.gradle?
grep "google-services" android/app/build.gradle
```

### Daemon JVM crash (SIGSEGV)

**Causa:** G1GC de Java 17+ crashea con proyectos grandes.

**Solución:** ParallelGC en `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC
```

### APK pide Metro al abrir ("Cannot connect to Metro")

**Causa:** `debuggableVariants` no está configurado. Por defecto `['debug']` excluye el JS bundle del APK debug.

**Solución:** En `android/app/build.gradle`:
```gradle
react {
    debuggableVariants = []
}
```
Luego rebuild: `./gradlew clean assembleDebug --no-daemon`

### "Duplicate class com.swmansion.worklets"

**Causa:** `react-native-worklets` compite con reanimated (que ya incluye esas clases).

**Solución en 2 capas:**
1. `react-native.config.js`: `platforms: { android: null, ios: null }`
2. `android/app/build.gradle`: `configurations.all { exclude group: 'com.swmansion.worklets', module: 'react-native-worklets' }`

### "SDK location not found"

`expo prebuild --clean` borra `android/local.properties`. Recreálo:
```bash
echo "sdk.dir=/usr/lib/android-sdk" > android/local.properties
```

### "BuildToolsApiClasspathEntrySnapshotTransform: IllegalArgumentException"

Cmdline-tools viejo (11.0). Usa 13.0:
```bash
sudo apt install google-android-cmdline-tools-13.0-installer
```

### "Toolchain installation does not provide the required capabilities: [JAVA_COMPILER]"

Tienes JRE, no JDK:
```bash
sudo apt install openjdk-21-jdk
```

### "Reanimated/Worklets version not compatible"

```bash
pnpm add react-native-reanimated@^3.19.5
pnpm install
npx expo prebuild --platform android --clean
```

Reanimated 3.19.x trae worklets incluido. No elimines el paquete `react-native-worklets` — nativewind lo necesita como plugin Babel. Solo desactiva su linking nativo.

### "google-services.json not found"

Asegúrate de que el archivo está en la raíz **y** en `android/app/`:
```bash
ls google-services.json android/app/google-services.json
```

### `expo prebuild` borra las optimizaciones

`expo prebuild --clean` regenera `android/gradle.properties` y `android/app/build.gradle`. Conserva estos archivos en git y reaplica los cambios después de cada prebuild. No toca `react-native.config.js`.

### Build falla por espacio en disco

```bash
cd android
./gradlew clean
rm -rf ~/.gradle/caches ~/.gradle/daemon
```

### ProGuard / R8 rompe Firebase o WebRTC en release (Play Store)

Si habilitas `minifyEnabled = true` en release, ProGuard puede ofuscar clases de Firebase y WebRTC.

**Solución:** Crea `android/app/proguard-rules.pro` con estas reglas:

```proguard
# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# React Native Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# WebRTC
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
```

Y en `android/gradle.properties`:
```properties
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

> **Importante**: prueba con ProGuard **después** de haber validado Firebase + P2P sin minificar. Si algo se rompe, las reglas de arriba suelen ser suficientes.

### R8 NullPointerException con play-services-auth

**Síntoma:** Build release muere con `R8: NullPointerException, NullPointer thrown while building report` apuntando a `com.google.android.gms.internal.play-services-auth`.

**Causa:** R8 minifier tiene un bug con algunas versiones de `play-services-auth` cuando coexisten Firebase y Google Play Services.

**Solución:** Deshabilitar minification en release (el APK sigue siendo funcional y representativo):

```groovy
// android/app/build.gradle — bloque release
release {
    shrinkResources false
    minifyEnabled false
}
```

Desde `gradle.properties` se controla así (default seguro):
```properties
android.enableMinifyInReleaseBuilds=false
android.enableShrinkResourcesInReleaseBuilds=false
```

Si **necesitas** minificar para Play Store, actualiza todos los Google Play Services a versions recientes donde R8 8.x+ no tenga el bug.

### `shrinkResources` también crashea con Firebase

**Síntoma:** Build release muere incluso con `minifyEnabled = false` pero `shrinkResources = true`.

**Causa:** Firebase y WebRTC traen recursos que el shrinker interpreta como "no usados" y al eliminarlos rompe referencias nativas en tiempo de ejecución.

**Solución:** Mantener ambos deshabilitados:
```groovy
release {
    shrinkResources false
    minifyEnabled false
}
```

### `expo run:android --variant release` crashea (preferir Gradle directo)

**Síntoma:** `npx expo run:android --variant release` falla con SIGSEGV en clang (C++) durante la compilación de `react-native-screens` o con `jest-worker` crash en Metro.

**Causa:** Expo CLI corre Metro bundler + compilación nativa simultáneamente, compitiendo por memoria y causando crashes en el GC de Java y en procesos C++.

**Solución:** Usar Gradle directamente, que separa el bundleo JS de la compilación nativa:
```bash
npx expo prebuild --platform android --clean
# luego
cd android && ./gradlew assembleRelease --no-daemon
```

El flag `--no-daemon` evita que el daemon de Gradle quede en estado inconsistente después de un crash.

### Build release exitoso (receta probada)

Después de iterar con todos los crashes, esta es la receta que **funciona**:

```bash
# 1. Prebuild limpio
npx expo prebuild --platform android --clean

# 2. Restaurar configs que prebuild sobreescribe
echo "sdk.dir=/usr/lib/android-sdk" > android/local.properties
cp google-services.json android/app/google-services.json

# 3. Verificar android/app/build.gradle:
#    - shrinkResources false
#    - minifyEnabled false (o enableMinifyInReleaseBuilds=false en gradle.properties)
#    - debuggableVariants = []

# 4. Build release directo con Gradle
cd android
./gradlew assembleRelease --no-daemon

# 5. APK listo
ls -lh app/build/outputs/apk/release/app-release.apk
# ~34 MB
```

---

## 4. Scripts útiles

En `package.json`:

```json
"scripts": {
  "build:android:debug": "cd android && ./gradlew clean assembleDebug --no-daemon",
  "build:android:release": "cd android && ./gradlew clean assembleRelease --no-daemon",
  "build:prebuild": "npx expo prebuild --platform android --clean",
  "build:full": "npx expo prebuild --platform android --clean && echo 'sdk.dir=/usr/lib/android-sdk' > android/local.properties && cp google-services.json android/app/ && cd android && ./gradlew assembleDebug --no-daemon",
  "build:eas:android": "eas build -p android --profile preview",
}
```
