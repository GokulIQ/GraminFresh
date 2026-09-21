const LIQUID_UNITS = new Set(['500 ml', '500ml', 'ml', 'ltr', 'liter', 'litre', 'l'])

export function isHalfLitreProduct(unit) {
  return LIQUID_UNITS.has(String(unit || '').trim().toLowerCase())
}

// Every liquid product is sold in 500 ml packs. Older products may still
// store "Litre" as their unit, so normalize that label for customers.
export function getDisplayUnit(unit) {
  if (isHalfLitreProduct(unit)) return '500 ml'
  if (String(unit || '').trim().toLowerCase() === 'kg') return '0.5 Kg'
  return unit || 'Unit'
}

// Products recorded as Kg or Litre are priced per full unit in the catalogue.
// Customers buy them in 500 g / 500 ml packs, so show the matching pack price.
export function getPackPrice(price, unit) {
  const normalizedUnit = String(unit || '').trim().toLowerCase()
  const fullUnitPrice = Number(price) || 0
  return normalizedUnit === 'kg' || ['ltr', 'liter', 'litre', 'l'].includes(normalizedUnit)
    ? fullUnitPrice / 2
    : fullUnitPrice
}

export function getQuantityLabel(unit, quantity) {
  const normalizedQuantity = Math.max(1, Number(quantity) || 1)
  const normalizedUnit = String(unit || '').trim().toLowerCase()

  if (normalizedUnit === 'kg' || normalizedUnit === '0.5 kg' || normalizedUnit === '0.5kg') {
    return `${normalizedQuantity * 0.5} Kg`
  }

  if (isHalfLitreProduct(unit)) {
    const millilitres = normalizedQuantity * 500
    if (millilitres === 500) return '500 ml'
    return `${millilitres / 1000} L`
  }

  return `${normalizedQuantity} ${getDisplayUnit(unit)}`
}
