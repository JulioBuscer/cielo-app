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
        // ── Fondo general (rosa muy suave)
        bg:          '#FFF0F5',
        bgCard:      '#FFFFFF',
        bgElevated:  '#FFE4EE',
        bgInput:     '#FFE4EE',

        // ── Texto
        textPrimary: '#2D1B26',
        textMuted:   '#9B7A88',

        // ── Marca
        cielo:       '#FF5C9A',   // rosa fuerte — acento principal
        cieloLight:  '#FFB7D5',   // rosa suave — burbujas propias
        header:      '#FF8AB3',   // rosa medio — header/barra

        // ── Burbujas
        bubbleOut:   '#FFB7D5',   // burbujas del usuario activo
        bubbleIn:    '#FFFFFF',   // burbujas del otro cuidador

        // ── Acciones rápidas
        bottle:      '#A855F7',   // morado — biberón
        diaper:      '#F59E0B',   // ámbar — pañal

        // ── Toma activa
        tomaActive:  '#FFF3E0',
        tomaBorder:  '#FFB74D',
        tomaText:    '#E65100',

        // ── Estados
        danger:      '#DC2626',
        safe:        '#16A34A',
        whatsGreen:  '#25D366',   // verde de WhatsApp para enviar

        // ── Biológicos
        pee:         '#F5C842',
        poop:        '#8B5E3C',

        // ── Crecimiento
        growth:      '#0EA5E9',
      },
    },
  },
  plugins: [],
};
