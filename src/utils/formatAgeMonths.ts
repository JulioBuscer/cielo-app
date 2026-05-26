export function formatAgeMonths(decimalMonths: number): string {
  if (decimalMonths < 0.1) return "Recién nacida/o";
  const wholeMonths = Math.floor(decimalMonths);
  const remainderDays = (decimalMonths - wholeMonths) * 30.44;
  const weeks = Math.round(remainderDays / 7);
  if (weeks === 0) {
    if (wholeMonths === 0) return "< 1 mes";
    if (wholeMonths === 1) return "1 mes";
    return `${wholeMonths} meses`;
  }
  if (weeks === 1) return `${wholeMonths}m 1s`;
  return `${wholeMonths}m ${weeks}s`;
}
