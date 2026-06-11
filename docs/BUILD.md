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

## 1. Build APK local (sin EAS)

Compila en tu propia PC, sin subir nada a la nube.

### Prerrequisitos

```bash
java -version                          # Java 21+
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

> Usa **siempre** cmdline-tools >= 13.0. Versiones anteriores (11.0) no entienden el formato XML v4 de platform 36 y causan el error `BuildToolsApiClasspathEntrySnapshotTransform: IllegalArgumentException`.

#### Memoria y JDK

Añade esto a `android/gradle.properties` (ya incluido tras `expo prebuild`):

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC
org.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64
```

- `-Xmx4096m` evita OOM con AGP 8.11 (el default de 2048m se queda corto).
- `-XX:+UseParallelGC` evita el crash `SIGSEGV` del garbage collector G1GC con JDK 17.
- `org.gradle.java.home` fuerza JDK 21 (AGP 8.11 requiere Java 17+; Java 11 da error directo).

### Build paso a paso

```bash
# 1. Prebuild (genera android/ si no existe)
npx expo prebuild --platform android --clean

# 2. Re-crear local.properties (prebuild lo borra)
echo "sdk.dir=/usr/lib/android-sdk" > android/local.properties

# 3. Compilar
cd android
./gradlew assembleDebug

# 4. Release (opcional)
./gradlew assembleRelease
```

### Salida

```text
android/app/build/outputs/apk/debug/app-debug.apk       # ~237 MB (debug)
android/app/build/outputs/apk/release/app-release.apk   # ~20-30 MB (minificado)
```

### Instalación

1. Transfiere el APK al dispositivo (USB, Google Drive, WhatsApp, etc.)
2. En Android: **Ajustes → Seguridad → Instalar apps desconocidas**
3. Toca el APK → Instalar

### Notas

- **Primera compilación:** descarga ~2 GB de dependencias (Gradle, NDK, CMake, plataformas). Puede tardar 15-20 min.
- **Siguientes:** usa caché local, ~1-3 min.
- APK debug pesa ~237 MB (incluye símbolos y libs sin comprimir). El release es mucho más pequeño.
- El APK debug muestra "React Native" en el splash y una barra roja de errores en desarrollo.
- Para **Play Store** necesitas keystore propio y firmar en `android/app/build.gradle`.

---

## 2. Build por EAS (Expo Application Services)

Compila en servidores de Expo en la nube. No requiere Android Studio ni SDK local.

### Prerrequisitos

```bash
npm install -g eas-cli
eas login                            # con tu cuenta Expo
```

### Build APK (Android)

```bash
# APK debug (desarrollo, instala dev-client)
eas build -p android --profile development

# APK preview (internal distribution, para compartir)
eas build -p android --profile preview

# AAB para Play Store
eas build -p android --profile production
```

### Build IPA (iOS)

```bash
# Primera vez: configurar credenciales
eas credentials -p ios

# Build para TestFlight / distribución interna
eas build -p ios --profile preview

# Build para App Store
eas build -p ios --profile production
```

### Perfiles en eas.json

| Profile | Android | iOS | Uso |
|---|---|---|---|
| `development` | APK + dev-client | IPA + dev-client | Desarrollo en dispositivo |
| `preview` | APK internal | IPA internal | Compartir con testers |
| `production` | AAB (Play Store) | IPA (App Store) | Publicación oficial |

### Descargar el build

1. Ve a https://expo.dev/projects
2. Selecciona `cielo-app`
3. Pestaña **Builds** → descarga
4. Comparte el enlace con otros dispositivos

---

## 3. Perfiles y su propósito

| Perfil | Cámara | QR | Sync P2P | Firebase | SQLite |
|---|---|---|---|---|---|
| `development` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `preview` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `production` | ✅ | ✅ | ✅ | ✅ | ✅ |

Todos los perfiles incluyen módulos nativos (`react-native-webrtc`, `@react-native-firebase/database`, etc.).

---

## 4. Solución de problemas

### "SDK location not found"

`expo prebuild --clean` borra `android/local.properties`. Recreálo:

```bash
echo "sdk.dir=/usr/lib/android-sdk" > android/local.properties
```

### "BuildToolsApiClasspathEntrySnapshotTransform: IllegalArgumentException"

**Causa:** cmdline-tools viejo (11.0) no entiende XML v4 de platform 36. El transform de AGP falla al leer el `android.jar`.

**Solución:**
```bash
sudo apt install google-android-cmdline-tools-13.0-installer
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager --uninstall "platforms;android-36"
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager "platforms;android-36"
```

### "Toolchain installation does not provide the required capabilities: [JAVA_COMPILER]"

**Causa:** Tienes solo JRE, no JDK (falta `javac`).

**Solución:**
```bash
sudo apt install openjdk-21-jdk
```

Luego en `android/gradle.properties`:
```properties
org.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64
```

### "Android Gradle plugin requires Java 17 to run. You are currently using Java 11."

**Causa:** AGP 8.11 requiere Java 17+, Java 11 no es suficiente.

**Solución:** Instalar JDK 21+ y apuntar `org.gradle.java.home` en `gradle.properties`.

### Daemon JVM crash (SIGSEGV)

**Causa:** G1GC de Java 17 crashea con proyectos grandes. Se ve en `hs_err_pid*.log` con crash en `G1CMTask`.

**Solución:** En `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC
```

### "Native module RNFBAppModule not found"

El módulo nativo de Firebase no está linkeado. Usa un development build:
```bash
npx expo prebuild --platform android --clean
npx expo run:android
```
O build por EAS:
```bash
eas build -p android --profile development
```

### "NDK license not accepted"

```bash
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager --licenses
sudo /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager "ndk;27.1.12297006"
```

### "Reanimated/Worklets version not compatible"

Si ves `[Reanimated] Your installed version of React Native (0.81.5) is not compatible with installed version of Reanimated (4.x)`:

```bash
pnpm add react-native-reanimated@^3.19.5
pnpm remove react-native-worklets
pnpm install
npx expo prebuild --platform android --clean
```

Reanimated 4.x requiere RN 0.82+. Con RN 0.81.5 usa Reanimated 3.19.x (worklets viene incluido, no necesita el paquete separado).

### "google-services.json not found"

Asegúrate de que el archivo está en la raíz:
```bash
ls google-services.json
```

### Build falla por espacio en disco

Los módulos nativos ocupan ~10 GB en `~/.gradle`:
```bash
cd android
./gradlew clean
rm -rf ~/.gradle/caches ~/.gradle/daemon
```

### "react-native-webrtc" build error

```bash
pnpm approve-builds @firebase/util protobufjs react-native-webrtc react-native-tcp-socket
```

### EAS build falla por falta de archivos

`google-services.json` y `GoogleService-Info.plist` están en `.gitignore`. EAS no los tiene. Súbelos en el dashboard de Expo (project → Secrets) o usa un hook `eas-build-pre-install`.

---

## 5. Scripts útiles

En `package.json`:

```json
"scripts": {
  "build:android:debug": "cd android && ./gradlew assembleDebug",
  "build:android:release": "cd android && ./gradlew assembleRelease",
  "build:prebuild": "npx expo prebuild --platform android --clean",
  "build:eas:android": "eas build -p android --profile preview",
  "build:eas:ios": "eas build -p ios --profile preview"
}
```

```bash
npm run build:prebuild
npm run build:android:debug
```
