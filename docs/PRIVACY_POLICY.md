# Política de Privacidad — Cielo App

**Última actualización:** Marzo 2025
**Vigencia:** Esta política aplica a todas las versiones de Cielo App.

---

## 1. Quién somos

Cielo App es desarrollada por **Buscer** (en adelante "el desarrollador"). Esta aplicación fue creada para ayudar a cuidadores a registrar el bienestar de bebés de forma privada y sin conexión a internet.

Contacto: [TU EMAIL AQUÍ]

---

## 2. Principio de privacidad por diseño

Cielo App fue construida desde cero con privacidad como principio rector, no como característica adicional. **No existe ningún servidor que reciba tus datos personales o los de tu bebé.**

---

## 3. Datos que recopilamos

### 3.1 Datos que TÚ introduces en la app

| Dato | Dónde se guarda | Sale del dispositivo |
|---|---|---|
| Nombre y rol del cuidador | SQLite local | ❌ Nunca |
| Nombre y fecha de nacimiento del bebé | SQLite local | ❌ Nunca |
| Registros de pañal (intensidad, color, alertas) | SQLite local | ❌ Nunca |
| Registros de alimentación | SQLite local | ❌ Nunca |
| Registros de peso y estatura | SQLite local | ❌ Nunca |
| Fotografías de pañales | Sandbox privado del dispositivo | ❌ Nunca* |
| Notas de texto libre | SQLite local | ❌ Nunca |

*Las fotografías solo salen del dispositivo si **tú** decides compartir un reporte manualmente usando el botón "Compartir".

### 3.2 Datos que NO recopilamos

- ❌ No recopilamos nombre, email ni contraseña (no existe registro)
- ❌ No usamos cookies ni identificadores de publicidad
- ❌ No usamos Google Analytics, Firebase Analytics ni ningún SDK de telemetría
- ❌ No accedemos a tu galería de fotos (solo a la cámara, cuando tú lo autorizas)
- ❌ No enviamos notificaciones push sin tu consentimiento explícito

---

## 4. Almacenamiento de fotografías

Las fotografías tomadas desde Cielo App se guardan exclusivamente en el directorio privado de la aplicación (`documentDirectory/cielo/diapers/`). Este directorio:

- **No es accesible** por otras aplicaciones instaladas en el dispositivo
- **No aparece** en la galería ni en la aplicación de Fotos del sistema
- **Se elimina** automáticamente cuando desinstales la app (dependiendo del SO)
- **Puedes eliminar** fotos individuales o todas desde la configuración de la app

---

## 5. Compartir reportes

Cuando usas la función "Compartir Reporte":

1. El reporte (texto + foto opcional) se genera **localmente en tu dispositivo**
2. Se abre el **Share Sheet nativo del sistema operativo** (Android/iOS)
3. **Tú decides** a quién envías el reporte y por qué canal (WhatsApp, email, etc.)
4. Cielo App no tiene conocimiento ni control sobre lo que haces con el reporte una vez compartido

---

## 6. Permisos que solicitamos

| Permiso | Para qué | Cuándo |
|---|---|---|
| `CAMERA` | Tomar foto del pañal | Solo cuando presionas "Agregar Evidencia" |
| `MEDIA_LIBRARY` (lectura) | NO se solicita | Nunca |
| `INTERNET` | NO se solicita en MVP offline | Nunca en versión offline |

---

## 7. Menores de edad

Esta aplicación está diseñada para ser usada **por** adultos cuidadores para registrar información **sobre** bebés. No recopilamos ni almacenamos datos en servidores de personas menores de edad.

---

## 8. Retención y eliminación de datos

Todos tus datos viven en tu dispositivo. Para eliminarlos:

- **Eliminar todo:** Desinstala la aplicación
- **Eliminar fotos:** Ve a Configuración → Almacenamiento → Eliminar todas las fotos
- **Eliminar un registro:** Desliza el registro en el historial y presiona eliminar

---

## 9. Cambios a esta política

Si en versiones futuras implementamos funciones que requieran enviar datos a un servidor (ej: sincronización entre dispositivos), actualizaremos esta política y te notificaremos dentro de la app antes de activar dicha función. **Siempre será opt-in, nunca obligatorio.**

---

## 10. Contacto

Para preguntas sobre privacidad:
📧 juliobuscer@gmail.com

Para reporte de vulnerabilidades de seguridad, ver `SECURITY.md`.

---

*Esta política está escrita en lenguaje claro y sin términos legales innecesarios. Cielo App no tiene abogados corporativos porque no los necesita: simplemente no recopilamos tus datos.*
