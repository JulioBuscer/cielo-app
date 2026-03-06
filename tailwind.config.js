/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // ← Requerido por NativeWind v4
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg:          '#0A0A0F',
        bgCard:      '#12121A',
        bgElevated:  '#1C1C2E',
        textPrimary: '#F0EFF5',
        textMuted:   '#6B6880',
        cielo:       '#7C5CBF',
        cieloLight:  '#E2C1FF',
        pink:        '#FF6B9D',
        pee:         '#F5C842',
        poop:        '#8B5E3C',
        danger:      '#FF4757',
        safe:        '#2ED573',
        growth:      '#38BDF8',
      },
    },
  },
  plugins: [],
};
