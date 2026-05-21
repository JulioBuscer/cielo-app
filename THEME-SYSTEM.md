# 🎨 SISTEMA DE TEMA — Tokens semánticos + Claro/Oscuro

> **Propósito:** Unificar todos los colores hardcodeados en un sistema de tokens semánticos con variantes light/dark, detectando automáticamente la preferencia del SO y permitiendo toggle manual en settings.
>
> 🔗 **Plan maestro:** [`PLAN_V5.md`](./PLAN_V5.md)

---

## 📐 Diseño del sistema

### Tailwind config — Tokens semánticos

```js
// tailwind.config.js
colors: {
  // Superficies
  surface:  { DEFAULT: '#FFF0F5', dark: '#1A1A2E' },
  card:     { DEFAULT: '#FFFFFF', dark: '#2A2A3E' },
  elevated: { DEFAULT: '#FFE4EE', dark: '#3A3A4E' },
  input:    { DEFAULT: '#FFF0F5', dark: '#1A1A2E' },

  // Texto
  textBody:  { DEFAULT: '#2D1B26', dark: '#FFFFFF' },
  textMuted: { DEFAULT: '#9B7A88', dark: '#BBBBBB' },
  textDim:   { DEFAULT: '#9B7A88', dark: '#888888' },

  // Acento
  accent:       { DEFAULT: '#FF8AB3', dark: '#FF8AB3' },
  accentStrong: { DEFAULT: '#FF5C9A', dark: '#FF5C9A' },
  accentLight:  { DEFAULT: '#FFB7D5', dark: '#3A1A2E' },

  // Estados
  danger:  '#DC2626',
  safe:    '#16A34A',
  warning: '#F59E0B',
}
```

Uso en componentes:
```tsx
<View className="bg-surface dark:bg-surface-dark">
  <Text className="text-textBody dark:text-textBody-dark">Hola</Text>
</View>
```

### ThemeProvider

- Lee `useColorScheme()` de React Native (detección automática)
- Lee `theme_mode` de AsyncStorage (toggle manual: `'system' | 'light' | 'dark'`)
- Aplica clase `dark` al contenedor root via `className`
- Expone `useThemeContext()` → `{ mode, isDark, toggleMode() }`

### Settings toggle

- En `app/settings/catalogs.tsx` (o pantalla de settings unificada):
  - Opción "Tema del sistema" (automático)
  - Opción "Claro" / "Oscuro" manual

---

## 🗂️ Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `tailwind.config.js` | Definir tokens semánticos con variantes dark |
| `src/hooks/useTheme.ts` | Contexto + provider + hook |
| `app/_layout.tsx` | Wrapper con ThemeProvider + className dinámico |
| `app/settings/catalogs.tsx` | Agregar toggle de tema |
| `app/logs/diaper/new.tsx` | Migrar a tokens |
| `app/logs/event/[id].tsx` | Migrar a tokens |
| `app/dashboard/index.tsx` | Migrar a tokens |
| (progresivo) | + resto de screens |

---

## 🧩 Estrategia de migración

No reescribir todo de golpe. Por cada pantalla que toquemos:

1. Identificar todos los colores hardcodeados
2. Reemplazar con clases Tailwind usando tokens semánticos
3. Verificar que funcione en ambos modos (claro/oscuro)

Orden:
1. `app/settings/` — la primera, porque tiene el toggle
2. `app/logs/diaper/new.tsx` — la que más tocamos
3. `app/logs/event/[id].tsx` — detalle de evento
4. `app/dashboard/` — timeline principal
5. `src/components/ui/` — componentes base
6. Resto de screens
