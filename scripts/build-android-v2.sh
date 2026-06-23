#!/usr/bin/env bash
# USO: bash scripts/build-android-v2.sh
# Build APK release con firma estable (keystore fuera de android/)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_BUILD="$ROOT_DIR/android/app/build.gradle"

# MALLOC_CHECK_=0 evita el falso positivo de heap corruption
# en Clang 18 (NDK 27.1) al compilar C++20 en cache frío
export MALLOC_CHECK_=0

echo "========================================"
echo " Cielo App — Build Android Release v2"
echo "========================================"

echo ""
echo "=== 1. Regenerar android/ (prebuild clean) ==="
CI=true npx expo prebuild --platform android --clean

echo ""
echo "=== 2. Limpiar caches (.cxx, Metro) ==="
rm -rf "$ROOT_DIR/android/app/.cxx"
rm -rf "$ROOT_DIR/node_modules/.cache/metro"
echo "  ✓ .cxx eliminado"
echo "  ✓ cache de Metro eliminado"

echo ""
echo "=== 3. Copiar archivos sensibles a android/ ==="
# google-services.json
if [ ! -f "$ROOT_DIR/google-services.json" ]; then
  echo "ERROR: google-services.json no encontrado en $ROOT_DIR"
  exit 1
fi
cp "$ROOT_DIR/google-services.json" "$ROOT_DIR/android/app/google-services.json"
echo "  ✓ google-services.json"

# release keystore (firma estable)
if [ ! -f "$ROOT_DIR/keystores/release.keystore" ]; then
  echo "ERROR: release.keystore no encontrado en $ROOT_DIR/keystores/"
  exit 1
fi
cp "$ROOT_DIR/keystores/release.keystore" "$ROOT_DIR/android/app/release.keystore"
echo "  ✓ release.keystore"

echo ""
echo "=== 4. Configurar gradle.properties ==="
sed -i 's/^expo.useLegacyPackaging=.*/expo.useLegacyPackaging=true/' \
  "$ROOT_DIR/android/gradle.properties"
echo "  ✓ useLegacyPackaging=true"

echo ""
echo "=== 5. Parchear android/build.gradle (classpath Firebase) ==="
BUILD_ROOT="$ROOT_DIR/android/build.gradle"
if ! grep -q "google-services" "$BUILD_ROOT"; then
  sed -i '/kotlin-gradle-plugin/a\    classpath('\''com.google.gms:google-services:4.4.2'\'')' "$BUILD_ROOT"
  echo "  ✓ classpath google-services agregado"
else
  echo "  ✓ classpath google-services ya existe"
fi

echo ""
echo "=== 6. Parchear android/app/build.gradle ==="
# 6a. apply plugin google-services al final
if ! grep -q "com.google.gms.google-services" "$APP_BUILD"; then
  sed -i '$ a\apply plugin: "com.google.gms.google-services"' "$APP_BUILD"
  echo "  ✓ apply plugin google-services agregado"
else
  echo "  ✓ apply plugin google-services ya existe"
fi

# 6b. Agregar release signingConfig (prebuild lo borra)
if ! grep -q "signingConfigs.release" "$APP_BUILD"; then
  sed -i '/signingConfigs {/a\        release {\n            storeFile file("${projectRoot}\/keystores\/release.keystore")\n            storePassword '\''cieloapp'\''\n            keyAlias '\''cieloapp-release-key'\''\n            keyPassword '\''cieloapp'\''\n        }' "$APP_BUILD"
  echo "  ✓ release signingConfig agregado"
else
  sed -i "s|storeFile file('release.keystore')|storeFile file(\"\${projectRoot}/keystores/release.keystore\")|" "$APP_BUILD"
  echo "  ✓ release signingConfig actualizado (ruta absoluta)"
fi

# 6c. release build type usa release signing
sed -i '/^[[:space:]]*release {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.debug/signingConfig signingConfigs.release/' "$APP_BUILD"

# 6d. debug build type usa debug signing (por si el sed anterior lo piso)
sed -i '/^[[:space:]]*debug {/,/^[[:space:]]*}/s/signingConfig signingConfigs\.release/signingConfig signingConfigs.debug/' "$APP_BUILD"
echo "  ✓ build types configurados"

echo ""
echo "=== 7. Restaurar versionName y versionCode ==="
VERSION=$(node -e "console.log(require('$ROOT_DIR/app.json').expo.version)")
VERSION_CODE=$(node -e "console.log(require('$ROOT_DIR/package.json').version.split('.').reduce((a,v,i)=>a+(i===0?10000:i===1?100:1)*parseInt(v),0))")
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$APP_BUILD"
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/" "$APP_BUILD"
echo "  ✓ app version: $VERSION (code $VERSION_CODE)"

echo ""
echo "=== 8. Build APK release (pase 1: popular cache C++) ==="
cd "$ROOT_DIR/android"
# El pase 1 puede fallar (Clang 18 crash en cache frío), pero popula .cxx
# para que el pase 2 compile exitosamente
set +e
MALLOC_CHECK_=0 ./gradlew assembleRelease
BUILD_EXIT=$?
set -e

if [ $BUILD_EXIT -ne 0 ]; then
  echo ""
  echo "=== Pase 1 falló (esperado con cache frío). Reintentando... ==="
  echo "=== 8b. Build APK release (pase 2: cache C++ caliente) ==="
  MALLOC_CHECK_=0 ./gradlew assembleRelease
fi

APK="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

echo ""
echo "=== Build completo ==="
echo "APK: $APK"
echo ""

# Intentar instalar en dispositivo conectado
if command -v adb &>/dev/null; then
  echo "=== Instalando en dispositivo... ==="
  # Verificar si hay dispositivo conectado
  if adb devices | grep -q "device$"; then
    # Probar con -r (reemplazar)
    echo "  Intentando adb install -r..."
    if adb install -r "$APK" 2>&1; then
      echo "  ✓ App actualizada (adb install -r)"
    else
      echo "  Falló install -r. Probando desinstalar + instalar..."
      echo "  $ adb uninstall com.buscer.cieloapp && adb install $APK"
      adb uninstall com.buscer.cieloapp && adb install "$APK"
    fi
  else
    echo "  No se detectó dispositivo ADB conectado."
    echo "  Instalación manual:"
    echo "  adb install -r $APK"
    echo "  ó (si falla por firma):"
    echo "  adb uninstall com.buscer.cieloapp && adb install $APK"
  fi
else
  echo "Instalación manual:"
  echo "source /home/devs/.bashrc && adb install -r $APK"
  echo "ó (si falla por firma):"
  echo "adb uninstall com.buscer.cieloapp && adb install $APK"
fi

echo ""
echo "=== Done ==="
