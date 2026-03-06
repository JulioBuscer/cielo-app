/** Genera un ID único sin depender de crypto.randomUUID() (no disponible en Hermes) */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) +
         Math.random().toString(36).slice(2, 10) +
         Date.now().toString(36);
}
