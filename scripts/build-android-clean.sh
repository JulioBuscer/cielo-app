#!/usr/bin/env bash
# USO: bash scripts/build-android-clean.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1. Clean prebuild (regenerar android/) ==="
npx expo prebuild --platform android --clean

echo "=== 2. Copiar google-services.json y regenerar keystore ==="
cp "$ROOT_DIR/google-services.json" "$ROOT_DIR/android/app/google-services.json"
if [ ! -f "$ROOT_DIR/android/app/release.keystore" ]; then
  keytool -genkey -v -keystore "$ROOT_DIR/android/app/release.keystore" \
    -alias cieloapp-release-key -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass cieloapp -keypass cieloapp \
    -dname "CN=Cielo App, OU=Development, O=Buscer, L=Unknown, ST=Unknown, C=CL"
fi

echo "=== 3. Asegurar useLegacyPackaging en gradle.properties ==="
sed -i 's/^expo.useLegacyPackaging=.*/expo.useLegacyPackaging=true/' \
  "$ROOT_DIR/android/gradle.properties"

echo "=== 4. Agregar Firebase Google Services plugin a android/build.gradle ==="
BUILD_ROOT="$ROOT_DIR/android/build.gradle"
if ! grep -q "google-services" "$BUILD_ROOT"; then
  sed -i '/kotlin-gradle-plugin/a\    classpath('\''com.google.gms:google-services:4.4.2'\'')' "$BUILD_ROOT"
fi

echo "=== 5. Parchear android/app/build.gradle ==="
APP_BUILD="$ROOT_DIR/android/app/build.gradle"

# 5a. apply plugin google-services (solo si no existe, tras com.facebook.react)
if ! grep -q "com.google.gms.google-services" "$APP_BUILD"; then
  sed -i '/com.facebook.react$/a\apply plugin: "com.google.gms.google-services"' "$APP_BUILD"
fi

# 5b. release signingConfigs (solo si no existe)
if ! grep -q "signingConfigs.release" "$APP_BUILD"; then
  sed -i '/signingConfigs {/a\        release {\n            storeFile file('\''release.keystore'\'')\n            storePassword '\''cieloapp'\''\n            keyAlias '\''cieloapp-release-key'\''\n            keyPassword '\''cieloapp'\''\n        }' "$APP_BUILD"
fi

# 5c. release build type usa release signing (solo la linea del bloque release)
sed -i '/^[[:space:]]*release {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.debug/signingConfig signingConfigs.release/' "$APP_BUILD"

# 5d. debug build type usa debug signing (por si el sed anterior lo piso)
sed -i '/^[[:space:]]*debug {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.release/signingConfig signingConfigs.debug/' "$APP_BUILD"

echo "=== 6. Limpiar .cxx caches NDK ==="
rm -rf "$ROOT_DIR/node_modules/.pnpm/"*"/node_modules/"*"/android/.cxx" 2>/dev/null || true
rm -rf "$ROOT_DIR/android/app/.cxx"

echo "=== 7. Build APK release (minificado) ==="
cd "$ROOT_DIR/android"
MALLOC_CHECK_=0 ./gradlew assembleRelease

echo "=== Done ==="
echo "APK: $ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "# Instalar en emulador/dispositivo con adb:"
echo "# (primero desinstalar si ya existe con otra firma)"
echo "source /home/devs/.bashrc && adb uninstall com.buscer.cieloapp && adb install $ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
