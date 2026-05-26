let _is24h: boolean | null = null;

export function is24hFormat(): boolean {
  if (_is24h !== null) return _is24h;
  try {
    const test = new Date(2024, 0, 1, 14, 30).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    _is24h = !test.includes("PM") && !test.includes("AM") && !test.includes("p. m.") && !test.includes("a. m.");
  } catch {
    _is24h = true;
  }
  return _is24h;
}

export function timeOptions(): Intl.DateTimeFormatOptions {
  return { hour: "2-digit", minute: "2-digit", hour12: !is24hFormat() };
}
