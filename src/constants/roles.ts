// src/constants/roles.ts
export const ROLES = [
  { id: 'mama',   label: 'Mamá',       emoji: '👩' },
  { id: 'papa',   label: 'Papá',       emoji: '👨' },
  { id: 'abue',   label: 'Abue',       emoji: '👴' },
  { id: 'nanny',  label: 'Niñera',     emoji: '🧑‍🍼' },
  { id: 'bestie', label: 'Tío/Bestie', emoji: '🦸' },
] as const;
export type Role = typeof ROLES[number]['id'];
