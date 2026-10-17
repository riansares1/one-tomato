import type { Zona } from '../datos/tipos'
import { adivinarCategoria, categoria } from './caducidad'

// Secciones del supermercado, en el orden en que sueles recorrer Mercadona
export const SECCIONES: { id: string; nombre: string; emoji: string }[] = [
  { id: 'fruta-verdura', nombre: 'Fruta y verdura', emoji: '🥬' },
  { id: 'carne', nombre: 'Carne', emoji: '🥩' },
  { id: 'pescado', nombre: 'Pescado y marisco', emoji: '🐟' },
  { id: 'charcuteria-quesos', nombre: 'Charcutería y quesos', emoji: '🧀' },
  { id: 'lacteos-huevos', nombre: 'Lácteos y huevos', emoji: '🥛' },
  { id: 'panaderia', nombre: 'Panadería', emoji: '🥖' },
  { id: 'despensa', nombre: 'Despensa', emoji: '🍝' },
  { id: 'conservas', nombre: 'Conservas', emoji: '🥫' },
  { id: 'congelados', nombre: 'Congelados', emoji: '🧊' },
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🧃' },
  { id: 'otros', nombre: 'Otros', emoji: '🛒' },
]

export const seccion = (id: string) => SECCIONES.find((s) => s.id === id) ?? SECCIONES[SECCIONES.length - 1]

// Categoría de alimento más probable para algo comprado en una sección
const CATEGORIA_POR_SECCION: Record<string, string> = {
  'fruta-verdura': 'verdura',
  carne: 'carne',
  pescado: 'pescado',
  'charcuteria-quesos': 'charcuteria',
  'lacteos-huevos': 'yogur',
  panaderia: 'pan',
  despensa: 'secos',
  conservas: 'conservas',
  congelados: 'congelados',
  bebidas: 'otros',
  otros: 'otros',
}

// Grupos de categorías compatibles con cada sección (para afinar la adivinanza)
const COMPATIBLES: Record<string, string[]> = {
  'fruta-verdura': ['fruta', 'verdura'],
  carne: ['carne', 'carne-picada'],
  'charcuteria-quesos': ['charcuteria', 'queso'],
  'lacteos-huevos': ['leche', 'yogur', 'huevos', 'queso'],
  despensa: ['secos', 'salsas', 'conservas', 'otros'],
}

export function categoriaDeCompra(nombre: string, seccionId: string): string {
  const adivinada = adivinarCategoria(nombre)
  const compatibles = COMPATIBLES[seccionId]
  if (adivinada !== 'otros' && (!compatibles || compatibles.includes(adivinada))) return adivinada
  return CATEGORIA_POR_SECCION[seccionId] ?? adivinada
}

export function zonaDeCompra(categoriaId: string, seccionId: string): Zona {
  if (seccionId === 'congelados') return 'congelador'
  return categoria(categoriaId).zonaHabitual
}

// Para ítems añadidos a mano a la lista: sección según lo que parece
const SECCION_POR_CATEGORIA: Record<string, string> = {
  fruta: 'fruta-verdura',
  verdura: 'fruta-verdura',
  carne: 'carne',
  'carne-picada': 'carne',
  pescado: 'pescado',
  charcuteria: 'charcuteria-quesos',
  queso: 'charcuteria-quesos',
  leche: 'lacteos-huevos',
  yogur: 'lacteos-huevos',
  huevos: 'lacteos-huevos',
  pan: 'panaderia',
  secos: 'despensa',
  salsas: 'despensa',
  conservas: 'conservas',
  congelados: 'congelados',
}

export const adivinarSeccion = (nombre: string) => SECCION_POR_CATEGORIA[adivinarCategoria(nombre)] ?? 'otros'
