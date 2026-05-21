/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Superficies ────────────────────────────────────────────────────
        surface:  { DEFAULT: '#FFF0F5', dark: '#1A1A2E' },
        card:     { DEFAULT: '#FFFFFF', dark: '#2A2A3E' },
        elevated: { DEFAULT: '#FFE4EE', dark: '#3A3A4E' },
        inputBg:  { DEFAULT: '#FFF0F5', dark: '#1A1A2E' },

        // ── Texto ──────────────────────────────────────────────────────────
        textBody:  { DEFAULT: '#2D1B26', dark: '#FFFFFF' },
        textMuted: { DEFAULT: '#9B7A88', dark: '#BBBBBB' },
        textDim:   { DEFAULT: '#9B7A88', dark: '#666666' },
        textOnAccent: { DEFAULT: '#FFFFFF', dark: '#FFFFFF' },

        // ── Acento ─────────────────────────────────────────────────────────
        accent:       { DEFAULT: '#FF8AB3', dark: '#FF8AB3' },
        accentStrong: { DEFAULT: '#FF5C9A', dark: '#FF5C9A' },
        accentLight:  { DEFAULT: '#FFB7D5', dark: '#3A1A2E' },

        // ── Header / Nav ───────────────────────────────────────────────────
        headerBg: { DEFAULT: '#FF8AB3', dark: '#1A1A2E' },

        // ── Burbujas de timeline ───────────────────────────────────────────
        bubbleOwn:   { DEFAULT: '#FFB7D5', dark: '#3A1A2E' },
        bubbleOther: { DEFAULT: '#FFFFFF', dark: '#2A2A3E' },

        // ── Estados ────────────────────────────────────────────────────────
        danger:  '#DC2626',
        safe:    '#16A34A',
        warning: '#F59E0B',
        whatsGreen: '#25D366',

        // ── Contextuales ────────────────────────────────────────────────────
        biological: {
          pee:   '#F5C842',
          poop:  '#8B5E3C',
        },
        feeding: {
          bottle:    '#A855F7',
          breast:    '#FF8AB3',
        },
        growth: '#0EA5E9',
      },
    },
  },
  plugins: [],
};
