# Reporte de Vulnerabilidades de Seguridad — Cielo App

## ⚠️ NO abras un Issue público para reportar vulnerabilidades de seguridad

Si encontraste una vulnerabilidad de seguridad en Cielo App, por favor **no la divulgues públicamente** hasta que haya sido corregida.

---

## Cómo reportar

Envía un email a: **juliobuscer@gmail.com**

**Asunto:** `[SECURITY] Descripción breve de la vulnerabilidad`

**Incluye en el reporte:**
1. Descripción de la vulnerabilidad
2. Pasos para reproducirla
3. Impacto potencial
4. Tu propuesta de solución (si tienes una)
5. Si quieres ser acreditado en el fix

---

## Tiempo de respuesta

- Confirmación de recepción: **48 horas**
- Evaluación inicial: **5 días hábiles**
- Fix y release: depende de la severidad (días a semanas)

---

## Alcance

Son vulnerabilidades relevantes para Cielo App:
- Acceso no autorizado a datos almacenados en el dispositivo
- Bypass del sistema de licencias/pagos (cuando exista)
- Fugas de datos en funciones de compartir reportes
- Vulnerabilidades en dependencias críticas (expo-sqlite, drizzle-orm)

No son vulnerabilidades en el alcance actual:
- Ataques que requieren acceso físico al dispositivo desbloqueado
- Vulnerabilidades en el sistema operativo Android/iOS

---

## Créditos

Los investigadores que reporten vulnerabilidades válidas serán acreditados en el `CHANGELOG.md` del release que las corrija, a menos que prefieran permanecer anónimos.

---

*Cielo App maneja datos sensibles de bebés. La seguridad es una prioridad.*
