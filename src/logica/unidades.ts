import type { Unidad } from '../datos/tipos'

// Convierte textos de unidad que pueda escribir la IA a las de la app
export function normalizarUnidad(u?: string | null): Unidad | null {
  const t = (u ?? '').trim().toLowerCase().replace(/\.$/, '')
  if (['g', 'gr', 'gramo', 'gramos'].includes(t)) return 'g'
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(t)) return 'kg'
  if (['ml', 'mililitro', 'mililitros'].includes(t)) return 'ml'
  if (['l', 'litro', 'litros'].includes(t)) return 'l'
  if (['', 'ud', 'uds', 'u', 'unidad', 'unidades', 'pieza', 'piezas'].includes(t)) return 'ud'
  return null // cucharadas, dientes, pizcas... no se pueden restar con precisión
}

// Pasa una cantidad de una unidad a otra. Devuelve null si no son compatibles.
export function convertir(cantidad: number, de: Unidad, a: Unidad): number | null {
  if (de === a) return cantidad
  const factores: Record<string, number> = { 'kg>g': 1000, 'g>kg': 0.001, 'l>ml': 1000, 'ml>l': 0.001 }
  const f = factores[`${de}>${a}`]
  return f ? cantidad * f : null
}
