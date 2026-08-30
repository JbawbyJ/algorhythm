const RATES = {
  JPY: 0.0067,
  EUR: 1.08,
  GBP: 1.27,
  USD: 1,
}

export function toUsd(amount, currency = 'USD') {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  const rate = RATES[String(currency || 'USD').toUpperCase()] ?? 1
  return Math.round(n * rate * 100) / 100
}
