# 🌙 Cielo App

> _Crianza sin distracciones. Privacidad total._

Cielo App es una aplicación móvil de seguimiento de cuidado de bebés construida con React Native + Expo. Diseñada para cuidadores que necesitan registrar información rápidamente, especialmente a las 3am.

---

## ✨ Features

- **💩 Poop-O-Meter** — Registra pañales con intensidad visual 1-5, color, consistencia y alertas médicas (sangre, mucosidad, diarrea)
- **🍼 Registro de tomas** — Lactancia (izquierda/derecha, minutos) y fórmula (ml)
- **📏 Curva de crecimiento** — Peso, estatura y circunferencia cefálica con historial
- **📋 Reportes compartibles** — Genera reportes listos para WhatsApp o el médico
- **📸 Evidencia visual** — Foto privada almacenada solo en tu dispositivo
- **🌙 Dark mode nativo** — Diseñado para uso nocturno real

---

## 🔒 Privacidad por diseño

**Tus datos nunca salen de tu dispositivo.**

- Sin registro ni login
- Sin telemetría ni analytics
- Sin acceso a tu galería (solo cámara, cuando tú lo activas)
- Las fotos viven en el sandbox privado de la app
- Sin servidor: 100% offline-first

Ver [Política de Privacidad](./docs/PRIVACY_POLICY.md) completa.

---

## 🛠 Stack técnico

| Tecnología                   | Uso                         |
| ---------------------------- | --------------------------- |
| Expo SDK 54 + React Native   | Base                        |
| TypeScript                   | Lenguaje                    |
| expo-sqlite + Drizzle ORM    | Base de datos local         |
| TanStack Query v5            | Cache y estado del servidor |
| NativeWind v4 + Tailwind CSS | Estilos                     |
| expo-router                  | Navegación file-based       |

---

## 🚀 Instalación para desarrollo

### Requisitos

- Node.js 18+
- Expo CLI
- Android Studio (para emulador) o dispositivo Android físico

```bash
# Clonar el repositorio
git clone https://github.com/juliobuscer/cielo-app.git
cd cielo-app

# Instalar dependencias
npx expo install
npm install --legacy-peer-deps

# Iniciar en desarrollo
npx expo start --clear
```

> ⚠️ Usar `--legacy-peer-deps` es necesario por un conflicto de peer deps de React 19.

---

## 📄 Licencia

Cielo App está bajo **GNU General Public License v3** con términos adicionales de uso comercial.

**En resumen:**

- ✅ Puedes ver, estudiar y modificar el código
- ✅ Puedes distribuirlo si mantienes la misma licencia GPL v3
- ❌ No puedes usarlo con fines comerciales sin permiso escrito del autor
- ❌ No puedes replicar el sistema de licencias/pagos

Ver [LICENSE](./LICENSE) para el texto completo.

Para licencias comerciales:juliobuscer@gmail.com

---

## 💙 Apoyar el proyecto

Cielo App es gratis. Si te es útil, puedes apoyar su desarrollo:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Apoyar%20a%20Buscer-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/juliobuscer)

---

## 🤝 Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de abrir un Pull Request.

Para reportar bugs o vulnerabilidades de seguridad, ver [SECURITY.md](./SECURITY.md).

---

_Hecho para los que velan de noche. Por Cielo. 🌙_
