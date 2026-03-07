// Paleta Cielo App — UI estilo WhatsApp, rosa/bebé
export const colors = {
  // Fondos
  bg:          '#FFF0F5',
  bgCard:      '#FFFFFF',
  bgElevated:  '#FFE4EE',
  bgInput:     '#FFE4EE',

  // Texto
  textPrimary: '#2D1B26',
  textMuted:   '#9B7A88',

  // Marca
  cielo:       '#FF5C9A',
  cieloLight:  '#FFB7D5',
  header:      '#FF8AB3',

  // Burbujas
  bubbleOut:   '#FFB7D5',
  bubbleIn:    '#FFFFFF',

  // Acciones rápidas
  bottle:      '#A855F7',
  diaper:      '#F59E0B',

  // Toma activa
  tomaActive:  '#FFF3E0',
  tomaBorder:  '#FFB74D',
  tomaText:    '#E65100',

  // Estados
  danger:      '#DC2626',
  safe:        '#16A34A',
  whatsGreen:  '#25D366',

  // Biológicos
  pee:         '#F5C842',
  poop:        '#8B5E3C',

  // Crecimiento
  growth:      '#0EA5E9',
} as const;

export type ColorKey = keyof typeof colors;
