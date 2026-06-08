# Configuración de Firebase RTDB para señalización P2P

Este proyecto usa **Firebase Realtime Database** únicamente como relay de señalización para el intercambio de SDP + ICE candidates entre dispositivos. Los datos de la aplicación **nunca** pasan por Firebase — viajan directamente entre dispositivos vía WebRTC DataChannel con cifrado E2E (tweetnacl secretbox).

---

## 1. Crear cuenta y proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **Crear un proyecto** (o **Add project**)
4. Ingresa el nombre: `Cielo App` (o el que prefieras)
5. **Desactiva Google Analytics** (no es necesario y evita consentimiento GDPR)
6. Haz clic en **Crear proyecto**
7. Espera a que se provisione (unos segundos)

> Plan **Spark** (gratuito): 1GB almacenado, 10GB/mes descargados. Más que suficiente para señalización.

## 2. Activar Realtime Database

1. En el menú lateral, ve a **Build** → **Realtime Database**
2. Haz clic en **Crear base de datos**
3. Selecciona una ubicación (elige la más cercana a tus usuarios, ej. `us-central1`)
4. En **Reglas de seguridad**, selecciona **Modo de prueba** (empezar en modo prueba, luego restringir)
5. Haz clic en **Habilitar**

### Reglas de seguridad recomendadas

Una vez configurado el relay en la app, cambia las reglas a:

```json
{
  "rules": {
    "sessions": {
      ".read": false,
      ".write": false,
      "$sessionId": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".indexOn": ["createdAt"]
      }
    }
  }
}
```

Para el MVP en modo prueba (mientras desarrollas), puedes usar:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 3. Registrar la app en Firebase

### Android

1. En la pantalla de inicio del proyecto, haz clic en **Android** (icono `</>`)
2. **Package name:** `com.buscer.cieloapp` (debe coincidir con `app.json`)
3. **App nickname:** `Cielo App Android` (opcional)
4. **Debug signing certificate SHA-1:** déjalo vacío (solo necesario para Google Sign-In)
5. Haz clic en **Registrar app**
6. **Descargar** `google-services.json`
7. Coloca el archivo en la raíz del proyecto: `cielo-app/google-services.json`
8. Haz clic en **Siguiente** y **Omitir** los pasos del SDK (lo instalaremos con npm)
9. Ve a **Configuración del proyecto** → **General** → **Tus aplicaciones** para verificar

### iOS

1. En la pantalla de inicio del proyecto, haz clic en **iOS** (icono `</>`)
2. **iOS bundle ID:** `com.buscer.cieloapp` (debe coincidir con `app.json` → `expo.ios.bundleIdentifier`)
3. **App nickname:** `Cielo App iOS` (opcional)
4. **App Store ID:** déjalo vacío
5. Haz clic en **Registrar app**
6. **Descargar** `GoogleService-Info.plist`
7. Coloca el archivo en la raíz del proyecto: `cielo-app/GoogleService-Info.plist`
8. Haz clic en **Siguiente** y **Omitir** los pasos del SDK

### Web (opcional, solo para desarrollo)

No es necesario para la app móvil.

## 4. Configurar app.json

Agrega el plugin de `expo-build-properties` con la dependencia de Firebase si no está ya configurado. En `app.json`, dentro de `expo.plugins`, asegúrate de tener:

```json
[
  "expo-build-properties",
  {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
]
```

## 5. Instalar dependencias

```bash
npx expo install @react-native-firebase/app @react-native-firebase/database
```

## 6. Verificar la instalación

Crea un archivo `src/firebase.ts` de prueba:

```typescript
import { Platform } from 'react-native';
import database from '@react-native-firebase/database';

const DB_PATH = 'sessions';

export async function createSession(sessionId: string, data: object) {
  const ref = database().ref(`${DB_PATH}/${sessionId}`);
  await ref.set(data);
}

export function listenSession(sessionId: string, callback: (data: any) => void) {
  const ref = database().ref(`${DB_PATH}/${sessionId}`);
  const listener = ref.on('value', (snapshot) => {
    callback(snapshot.val());
  });
  return () => ref.off('value', listener);
}

export async function cleanupSession(sessionId: string) {
  await database().ref(`${DB_PATH}/${sessionId}`).remove();
}
```

Luego corre `npx tsc --noEmit` para verificar tipos.

## 7. Integración con el sistema de sincronización

Cuando el relay de Firebase esté implementado (Fase 3 del roadmap), el flujo será:

1. **Host:** escribe su SDP offer + ICE candidates en `sessions/{sessionId}`
2. **Join:** escucha cambios en `sessions/{sessionId}`, obtiene el offer y responde con su answer
3. **Host:** recibe el answer, completa el handshake WebRTC
4. **Ambos:** cierran la sesión en Firebase y usan WebRTC DataChannel para los datos

Esto reemplaza el TCP signaling actual, permitiendo sincronización entre cualquier red (WiFi, datos móviles, distintas ciudades).

## 8. Build con Firebase

### Desarrollo local
```bash
npx expo run:android   # Android
npx expo run:ios       # iOS
```

### EAS Build (producción)
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Asegúrate de que `google-services.json` y `GoogleService-Info.plist` estén incluidos en el build. EAS los incluye automáticamente si están en la raíz.

## Solución de problemas comunes

| Problema | Solución |
|---|---|
| `google-services.json` no encontrado | Verifica que esté en la raíz del proyecto y que `app.json` apunte a `"./google-services.json"` |
| Error de compilación Android: `package com.google.firebase` | Asegúrate de que `expo-build-properties` tenga `{ "android": { "googleServicesFile": "./google-services.json" } }` |
| Firebase dice "Permission denied" | Revisa las reglas de RTDB en la consola de Firebase |
| No se ven las sesiones en la consola | Revisa que la ruta `sessions/` sea correcta en tu código |
| `@react-native-firebase/database` no se linkea | Corre `npx expo prebuild --clean` y luego build de nuevo |

## Recursos

- [Firebase Console](https://console.firebase.google.com)
- [Pricing: Spark plan](https://firebase.google.com/pricing) (gratuito)
- [React Native Firebase docs](https://rnfirebase.io/database/usage)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
