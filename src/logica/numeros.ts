// Convierte "1,5" o "1.5" en 1.5 (el teclado del iPhone en español usa coma)
export function leerNumero(texto: string): number {
  const n = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const mostrarNumero = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
