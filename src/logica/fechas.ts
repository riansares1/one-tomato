// Utilidades de fechas. Trabajamos con texto 'AAAA-MM-DD' en hora local.

export function aTexto(fecha: Date): string {
  const a = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function deTexto(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export const hoy = () => aTexto(new Date())

export function sumarDias(texto: string, dias: number): string {
  const f = deTexto(texto)
  f.setDate(f.getDate() + dias)
  return aTexto(f)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((deTexto(hasta).getTime() - deTexto(desde).getTime()) / 86_400_000)
}

// "12 nov"
export function fechaCorta(texto: string): string {
  return deTexto(texto).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')
}

// "hoy", "mañana", "en 5 días", "hace 2 días"
export function relativa(texto: string): string {
  const d = diasEntre(hoy(), texto)
  if (d === 0) return 'hoy'
  if (d === 1) return 'mañana'
  if (d === -1) return 'ayer'
  return d > 0 ? `en ${d} días` : `hace ${-d} días`
}
