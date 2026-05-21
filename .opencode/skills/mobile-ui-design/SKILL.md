---
name: mobile-ui-design
description: Design mobile-first interfaces for iOS and Android. Use when creating screens, choosing layouts, implementing navigation, or optimizing touch interactions for mobile apps.
---

# Mobile UI Design

Principios de diseño de interfaz para apps mobile (iOS/Android).

## Touch Targets
- **Mínimo 44x44px** para elementos interactivos (Apple HIG)
- Espaciado mínimo entre targets: 8px
- Botones primarios en tercio inferior de la pantalla
- Altura mínima de botones principales: 56px (uso nocturno)

## Layout patterns

### SafeArea + Scroll
```tsx
<SafeAreaView className="flex-1 bg-bg">
  <ScrollView className="flex-1 px-4 pt-2">
    {children}
  </ScrollView>
</SafeAreaView>
```

### Bottom action bar
Para pantallas con acciones primarias, fijar botón al fondo:
```tsx
<View className="flex-1">
  {/* contenido scrollable */}
  <View className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4">
    <Button className="w-full rounded-full" />
  </View>
</View>
```

## Navegación mobile

### Stack navigation (expo-router)
```tsx
// app/dashboard/index.tsx
<BigButton onPress={() => router.push('/logs/diaper/new')} />

// app/logs/diaper/new.tsx
<View className="flex-row items-center gap-3 py-4">
  <TouchableOpacity onPress={() => router.back()}>
    <Text>‹ Volver</Text>
  </TouchableOpacity>
</View>
```

### Tab navigation
Para apps con secciones principales, usar tabs:
- Tab 1: 💬 Chat (timeline principal)
- Tab 2: 📊 Stats
- Tab 3: ⚙️ Configuración

## Paleta de colores (Cielo App)
```css
bg:          '#0A0A0F'   /* fondo oscuro nocturno */
bgCard:      '#12121A'   /* tarjetas */
bgElevated:  '#1C1C2E'   /* elementos elevados */
textPrimary: '#F0EFF5'   /* texto principal */
textMuted:   '#6B6880'   /* texto secundario */
cielo:       '#7C5CBF'   /* púrpura principal */
pink:        '#FF6B9D'   /* rosa acento */
danger:      '#FF4757'   /* alertas médicas */
safe:        '#2ED573'   /* confirmación */
growth:      '#38BDF8'   /* módulo crecimiento */
```

## Diseño para uso nocturno
- Dark mode nativo: `"userInterfaceStyle": "dark"` en app.json
- Alto contraste entre fondo y texto
- Botones grandes (min 56px) para dedos somnolientos
- Inputs con placeholderTextColor visible

## Estados de componentes
```ts
const states = {
  default:  "Apariencia base",
  hover:    "Cambio sutil (no aplica en mobile táctil)",
  focus:    "Outline visible para keyboard users",
  active:   "Pressed state (active:scale-95)",
  disabled: "Opacidad reducida + no pointer events",
  loading:  "ActivityIndicator + disabled",
};
```
