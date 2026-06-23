#!/usr/bin/env bash
# USO: bash scripts/build-android-clean.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1. Clean prebuild (regenerar android/) ==="
CI=true npx expo prebuild --platform android --clean

echo "=== 2. Copiar google-services.json y keystore ==="
cp "$ROOT_DIR/google-services.json" "$ROOT_DIR/android/app/google-services.json"
mkdir -p "$ROOT_DIR/android/app"
cp "$ROOT_DIR/keystores/release.keystore" "$ROOT_DIR/android/app/release.keystore"

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

# 5a. apply plugin google-services al final del archivo (requisito de Firebase)
if ! grep -q "com.google.gms.google-services" "$APP_BUILD"; then
  sed -i '$ a\apply plugin: "com.google.gms.google-services"' "$APP_BUILD"
fi

# 5b. Agregar release signingConfig (prebuild lo borra) y usar ruta absoluta
if ! grep -q "signingConfigs.release" "$APP_BUILD"; then
  sed -i '/signingConfigs {/a\        release {\n            storeFile file("${projectRoot}\/keystores\/release.keystore")\n            storePassword '"'cieloapp'"'\n            keyAlias '"'cieloapp-release-key'"'\n            keyPassword '"'cieloapp'"'\n        }' "$APP_BUILD"
else
  sed -i "s|storeFile file('release.keystore')|storeFile file(\"\${projectRoot}/keystores/release.keystore\")|" "$APP_BUILD"
fi

# 5c. release build type usa release signing (prebuild deja signingConfigs.debug)
sed -i '/^[[:space:]]*release {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.debug/signingConfig signingConfigs.release/' "$APP_BUILD"

# 5d. debug build type usa debug signing
sed -i '/^[[:space:]]*debug {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.release/signingConfig signingConfigs.debug/' "$APP_BUILD"

echo "=== 6. Limpiar .cxx caches NDK ==="
rm -rf "$ROOT_DIR/node_modules/.pnpm/"*"/node_modules/"*"/android/.cxx" 2>/dev/null || true
rm -rf "$ROOT_DIR/android/app/.cxx"

echo "=== 7. Restaurar versionCode y versionName desde app.json ==="
VERSION=$(node -e "console.log(require('$ROOT_DIR/app.json').expo.version)")
VERSION_CODE=$(node -e "console.log(require('$ROOT_DIR/package.json').version.split('.').reduce((a,v,i)=>a+(i===0?10000:i===1?100:1)*parseInt(v),0))")
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$APP_BUILD"
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/" "$APP_BUILD"
echo "   versionName=$VERSION, versionCode=$VERSION_CODE"

echo "=== 8. Build APK release (minificado) ==="
cd "$ROOT_DIR/android"
MALLOC_CHECK_=0 ./gradlew assembleRelease

echo "=== Done ==="
echo "APK: $ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "# Instalar en emulador/dispositivo con adb:"
echo "source /home/devs/.bashrc && adb uninstall com.buscer.cieloapp && adb install $ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
