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
# Verificar que tienes lo necesario
java -version                          # Java 17+
npx expo --version                     # Expo CLI
echo $ANDROID_HOME                     # debe apuntar al SDK
```

Si `ANDROID_HOME` no está definido, agrega esto a tu `~/.bashrc` o `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
```

### Build paso a paso

```bash
# 1. Limpiar cachés (opcional, recomendado si vienes de EAS)
npx expo prebuild --platform android --clean

# 2. Compilar APK debug
cd android
./gradlew assembleDebug

# 3. (Opcional) APK release (firmado con debug keystore)
./gradlew assembleRelease
```

### Salida

```text
android/app/build/outputs/apk/debug/app-debug.apk     # ~50-80 MB
android/app/build/outputs/apk/release/app-release.apk  # ~20-30 MB (minificado)
```

### Instalación en dispositivos

1. Saca el `.apk` del PC (USB, Google Drive, WhatsApp, etc.)
2. En cada Android: **Ajustes → Seguridad → Instalar apps desconocidas**
3. Toca el archivo APK → Instalar

### Notas

- La **primera compilación** descarga dependencias nativas (~15-20 min).
- Las siguientes usan caché local (~2-3 min).
- El APK debug muestra "React Native" en el splash y una barra roja de errores en dev.
- Para **Play Store** necesitas un keystore propio y modificar el signing en `android/app/build.gradle`.

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
2. Selecciona el proyecto `cielo-app`
3. Pestaña **Builds** → descarga el APK/IPA
4. Comparte el enlace de descarga con otros dispositivos

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

### "Native module RNFBAppModule not found"

El módulo nativo de Firebase no está linkeado.

**Causa:** Ejecutaste en Expo Go o en un build sin prebuild.

**Solución:** Usa un development build:
```bash
npx expo prebuild --platform android --clean
npx expo run:android
```
O build por EAS:
```bash
eas build -p android --profile development
```

### "google-services.json not found"

Asegúrate de que el archivo está en la raíz del proyecto:
```bash
ls google-services.json     # debe existir
```

### Build falla por espacio en disco

Los módulos nativos ocupan ~10 GB en `~/.gradle`:
```bash
# Limpiar caché de Gradle
cd android
./gradlew clean
rm -rf ~/.gradle/caches
```

### "react-native-webrtc" build error

Asegúrate de aprobar los builds en pnpm:
```bash
pnpm approve-builds @firebase/util protobufjs react-native-webrtc react-native-tcp-socket
```

### EAS build falla por falta de archivos

Los archivos `google-services.json` y `GoogleService-Info.plist` están en `.gitignore`. EAS Build no los tiene.

**Solución:** Súbelos manualmente en el dashboard de Expo (project → Secrets) o pásalos con un hook de `eas-build-pre-install`.

---

## 5. Scripts útiles

Agrega esto a `package.json` para acceso rápido:

```json
"scripts": {
  "build:android:debug": "cd android && ./gradlew assembleDebug",
  "build:android:release": "cd android && ./gradlew assembleRelease",
  "build:android:clean": "cd android && ./gradlew clean && ./gradlew assembleDebug",
  "build:prebuild": "npx expo prebuild --platform android --clean",
  "build:eas:android": "eas build -p android --profile preview",
  "build:eas:ios": "eas build -p ios --profile preview"
}
```

```bash
# Uso
npm run build:prebuild
npm run build:android:debug
```
