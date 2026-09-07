export function cssLength(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`

  const normalized = String(value).trim()
  return /^\d+(\.\d+)?$/.test(normalized) ? `${normalized}px` : normalized
}
