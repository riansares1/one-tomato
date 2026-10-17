import type { Unidad } from '../datos/tipos'
import { adivinarCategoria } from './caducidad'

// Consulta la base de datos gratuita y abierta Open Food Facts
// Documentación: https://openfoodfacts.github.io/openfoodfacts-server/api/

export interface DatosOFF {
  nombre: string
  marca?: string
  cantidad: number
  unidad: Unidad
  categoria: string
}

// Traduce las categorías de Open Food Facts a las de la app (la primera que coincida gana)
const MAPA_CATEGORIAS: [string, string][] = [
  ['en:frozen-foods', 'congelados'],
  ['en:eggs', 'huevos'],
  ['en:yogurts', 'yogur'],
  ['en:desserts', 'yogur'],
  ['en:butters', 'yogur'],
  ['en:cheeses', 'queso'],
  ['en:milks', 'leche'],
  ['en:plant-based-milk-alternatives', 'leche'],
  ['en:creams', 'leche'],
  ['en:hams', 'charcuteria'],
  ['en:sausages', 'carne-picada'],
  ['en:prepared-meats', 'charcuteria'],
  ['en:ground-meats', 'carne-picada'],
  ['en:meats', 'carne'],
  ['en:poultries', 'carne'],
  ['en:canned-foods', 'conservas'],
  ['en:canned-fishes', 'conservas'],
  ['en:fishes', 'pescado'],
  ['en:seafood', 'pescado'],
  ['en:breads', 'pan'],
  ['en:viennoiseries', 'pan'],
  ['en:pastas', 'secos'],
  ['en:rices', 'secos'],
  ['en:legumes', 'secos'],
  ['en:cereals-and-their-products', 'secos'],
  ['en:biscuits', 'secos'],
  ['en:sauces', 'salsas'],
  ['en:condiments', 'salsas'],
  ['en:vegetable-oils', 'salsas'],
  ['en:fresh-fruits', 'fruta'],
  ['en:fruits', 'fruta'],
  ['en:fresh-vegetables', 'verdura'],
  ['en:vegetables', 'verdura'],
  ['en:prepared-meals', 'cocinado'],
  ['en:dairies', 'yogur'],
]

function categoriaDesdeOFF(tags: string[], nombre: string): string {
  for (const [tag, cat] of MAPA_CATEGORIAS) if (tags.includes(tag)) return cat
  return adivinarCategoria(nombre)
}

// "6 x 125 g" → 6 ud; "1 l" → 1 l; "500 g" → 500 g; "12" → 12 ud
export function leerCantidad(texto?: string, numero?: number, unidadOFF?: string): { cantidad: number; unidad: Unidad } {
  const t = (texto ?? '').toLowerCase().replace(',', '.')
  const multipack = t.match(/(\d+)\s*[x×]\s*\d/)
  if (multipack) return { cantidad: Number(multipack[1]), unidad: 'ud' }
  const m = t.match(/([\d.]+)\s*(kg|g|gr|ml|cl|l|ud|uds|unidades|huevos)?\b/)
  if (m) {
    const n = Number(m[1])
    const u = m[2] ?? ''
    if (u === 'kg') return { cantidad: n, unidad: 'kg' }
    if (u === 'g' || u === 'gr') return { cantidad: n, unidad: 'g' }
    if (u === 'l') return { cantidad: n, unidad: 'l' }
    if (u === 'ml') return { cantidad: n, unidad: 'ml' }
    if (u === 'cl') return { cantidad: n * 10, unidad: 'ml' }
    if (n > 0) return { cantidad: n, unidad: 'ud' }
  }
  if (numero && unidadOFF) {
    const u = unidadOFF.toLowerCase()
    if (u === 'g' || u === 'ml') return { cantidad: numero, unidad: u }
  }
  return { cantidad: 1, unidad: 'ud' }
}

export class SinConexion extends Error {}

// Devuelve null si el producto no está en Open Food Facts
export async function buscarEnOFF(codigo: string): Promise<DatosOFF | null> {
  const campos = 'product_name,product_name_es,generic_name_es,brands,quantity,product_quantity,product_quantity_unit,categories_tags'
  let respuesta: Response
  try {
    respuesta = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${campos}`, {
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new SinConexion('No he podido conectar con Open Food Facts. ¿Tienes internet?')
  }
  if (respuesta.status === 404) return null
  if (!respuesta.ok) throw new SinConexion(`Open Food Facts no responde ahora mismo (error ${respuesta.status}).`)

  const datos = await respuesta.json()
  const p = datos?.product
  if (datos?.status !== 1 || !p) return null

  const nombre: string = (p.product_name_es || p.product_name || p.generic_name_es || '').trim()
  if (!nombre) return null
  const { cantidad, unidad } = leerCantidad(p.quantity, Number(p.product_quantity) || undefined, p.product_quantity_unit)
  return {
    nombre,
    marca: (p.brands ?? '').split(',')[0].trim() || undefined,
    cantidad,
    unidad,
    categoria: categoriaDesdeOFF(p.categories_tags ?? [], nombre),
  }
}
