# Guía de Contribución — Cielo App

¡Gracias por tu interés en contribuir a Cielo App! 🌙

---

## ⚠️ Lee esto primero: licencia y uso comercial

Cielo App está bajo **GNU GPL v3 con términos adicionales** (ver `LICENSE`). Al contribuir:

- Tu contribución también quedará bajo GPL v3
- **Firmas un CLA implícito**: aceptas que el desarrollador principal (Buscer) puede incluir tu contribución en versiones comerciales futuras de Cielo App
- Si no aceptas esto, no envíes un Pull Request

---

## ¿Qué tipo de contribuciones se aceptan?

✅ **Bienvenidas:**
- Corrección de bugs reportados en Issues
- Mejoras de rendimiento (especialmente en queries SQLite)
- Mejoras de accesibilidad
- Traducciones (el proyecto actualmente es en español)
- Documentación
- Tests

⚠️ **Discutir primero (abre un Issue antes):**
- Nuevas features grandes
- Cambios al schema de la DB (impactan migraciones)
- Cambios al sistema de privacidad/permisos
- Integración de nuevas librerías

❌ **No se aceptan:**
- Integraciones con servicios de telemetría o analytics
- Cambios que requieran acceso a internet en la versión offline
- Código que suba datos del usuario a servidores externos

---

## Proceso para contribuir

1. **Fork** el repositorio
2. **Crea una rama** con nombre descriptivo: `fix/diaper-log-timestamp` o `feat/feeding-timer`
3. **Haz tus cambios** siguiendo las convenciones del proyecto
4. **Corre la app** y verifica que no hay regresiones
5. **Abre un Pull Request** con descripción clara de qué cambió y por qué

---

## Convenciones de código

- **TypeScript estricto**: no uses `any` sin justificación
- **Componentes funcionales** con hooks, sin clases
- **NativeWind** para estilos, no `StyleSheet` inline (excepto para valores dinámicos)
- **Drizzle ORM** para todas las queries, no SQL crudo en los hooks
- **Nombres en inglés** para código, nombres en español para UI/UX

---

## Stack técnico (para contexto)

Expo SDK 54 · React Native · TypeScript · expo-sqlite + Drizzle ORM · TanStack Query · NativeWind v4 · expo-router

---

## Reportar bugs

Usa el template de Issues en `.github/ISSUE_TEMPLATE/bug_report.md`

Para **vulnerabilidades de seguridad**, ver `SECURITY.md` (no abras un Issue público).

---

*Por Cielo. 🌙*
