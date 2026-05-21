# Depuración Android — ADB WiFi + scrcpy

## Requisitos

| Herramienta | Linux | Windows |
|---|---|---|
| **scrcpy** | `sudo apt install scrcpy` | Descargar de [scrcpy-win](https://github.com/Genymobile/scrcpy/releases) |
| **ADB** | `sudo apt install adb` | Viene con Android Studio o [platform-tools](https://developer.android.com/studio/releases/platform-tools) |

---

## 1. Conectar por USB (primera vez)

1. Activar **Opciones de Desarrollador** en el teléfono:
   - Ajustes → Acerca del teléfono → Número de compilación (tocar 7 veces)
2. Activar **Depuración USB**
3. Conectar cable USB
4. Aceptar la huella digital en el teléfono
5. Verificar:

```bash
adb devices
# Debe mostrar algo como: 0123456789ABCDEF   device
```

---

## 2. Obtener IP del teléfono

Con el teléfono conectado por USB y en el mismo WiFi:

```bash
# Linux / macOS
adb shell ip -f inet addr show wlan0 | grep -oP 'inet \K[\d.]+'

# Windows PowerShell
adb shell ip -f inet addr show wlan0 | Select-String -Pattern 'inet (\d+\.\d+\.\d+\.\d+)' | % { $_.Matches.Groups[1].Value }

# O en cualquier OS (alternativa):
adb shell "ip addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2"
```

---

## 3. Cambiar a modo WiFi

```bash
adb tcpip 5555
# Desconectar el cable USB
adb connect <IP_DEL_TELEFONO>:5555   # ej: adb connect 192.168.1.100:5555
adb devices
# Debe mostrar: 192.168.1.100:5555   device
```

---

## 4. Espejar pantalla

```bash
# Básico
scrcpy

# Con calidad ajustada (recomendado para WiFi)
scrcpy --max-size 1024 --bit-rate 4M

# Sin bordes
scrcpy --window-borderless

# Solo lectura (no tocar desde el PC)
scrcpy --no-control

# Ayuda completa
scrcpy --help
```

---

## 5. Correr la app

```bash
npx expo start
```

Escanear el QR con **Expo Go** desde el teléfono espejado.

> Si el QR no se escanea bien desde scrcpy, usa `npx expo start --lan` y escribe la URL manualmente en Expo Go (aparece como `exp://192.168.x.x:8081`).

---

## 6. Volver a modo USB

```bash
adb disconnect <IP>:5555
# O simplemente:
adb kill-server
# Luego conectar cable USB normalmente
```

---

## Script rápido (Linux)

```bash
# Guardar como connect-phone.sh
IP=$(adb shell ip -f inet addr show wlan0 | grep -oP 'inet \K[\d.]+')
adb tcpip 5555
echo "Desconecta el USB y presiona Enter..."
read
adb connect $IP:5555
scrcpy --max-size 1024 --bit-rate 4M
```
