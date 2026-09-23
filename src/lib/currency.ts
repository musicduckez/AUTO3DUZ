export function formatSom(value: number): string {
  const n = Math.round(value);
  return `${n.toLocaleString('ru-RU')} so'm`;
}

export function shortSom(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} mln`;
  }
  return formatSom(value);
}
