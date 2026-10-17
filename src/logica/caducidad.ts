import type { DuracionesCategoria, Tupper, Zona } from '../datos/tipos'
import { diasEntre, hoy, sumarDias } from './fechas'

export interface Categoria {
  id: string
  nombre: string
  emoji: string
  zonaHabitual: Zona
  // Palabras que, si aparecen en el nombre, indican esta categoría
  palabras: string[]
}

export const CATEGORIAS: Categoria[] = [
  { id: 'fruta', nombre: 'Fruta', emoji: '🍎', zonaHabitual: 'despensa', palabras: ['manzana', 'platano', 'naranja', 'pera', 'mandarina', 'uva', 'fresa', 'kiwi', 'melon', 'sandia', 'limon', 'aguacate', 'melocoton', 'piña', 'fruta', 'frutos rojos', 'arandano'] },
  { id: 'verdura', nombre: 'Verdura y hortalizas', emoji: '🥦', zonaHabitual: 'nevera', palabras: ['tomate', 'lechuga', 'cebolla', 'ajo', 'zanahoria', 'calabacin', 'pimiento', 'pepino', 'brocoli', 'espinaca', 'patata', 'berenjena', 'champiñon', 'seta', 'puerro', 'coliflor', 'judia verde', 'calabaza', 'ensalada', 'rucula', 'canonigo', 'apio', 'verdura', 'boniato'] },
  { id: 'carne', nombre: 'Carne fresca', emoji: '🥩', zonaHabitual: 'nevera', palabras: ['pollo', 'pechuga', 'muslo', 'ternera', 'cerdo', 'lomo', 'filete', 'chuleta', 'pavo', 'cordero', 'conejo', 'solomillo', 'costilla', 'carne'] },
  { id: 'carne-picada', nombre: 'Carne picada y salchichas', emoji: '🍔', zonaHabitual: 'nevera', palabras: ['picada', 'hamburguesa', 'salchicha', 'albondiga', 'longaniza'] },
  { id: 'pescado', nombre: 'Pescado y marisco', emoji: '🐟', zonaHabitual: 'nevera', palabras: ['salmon', 'merluza', 'bacalao', 'atun fresco', 'dorada', 'lubina', 'gamba', 'langostino', 'sepia', 'calamar', 'mejillon', 'pescado', 'emperador', 'boqueron', 'sardina'] },
  { id: 'charcuteria', nombre: 'Charcutería', emoji: '🥓', zonaHabitual: 'nevera', palabras: ['jamon', 'chorizo', 'salchichon', 'fuet', 'pavo en lonchas', 'bacon', 'beicon', 'mortadela', 'lomo embuchado', 'york', 'loncha'] },
  { id: 'queso', nombre: 'Queso', emoji: '🧀', zonaHabitual: 'nevera', palabras: ['queso', 'mozzarella', 'parmesano', 'burrata', 'requeson'] },
  { id: 'leche', nombre: 'Leche y bebidas vegetales', emoji: '🥛', zonaHabitual: 'despensa', palabras: ['leche', 'bebida de avena', 'bebida de soja', 'bebida de almendra', 'nata'] },
  { id: 'yogur', nombre: 'Yogures y postres lácteos', emoji: '🥣', zonaHabitual: 'nevera', palabras: ['yogur', 'kefir', 'natillas', 'flan', 'cuajada', 'skyr', 'mantequilla'] },
  { id: 'huevos', nombre: 'Huevos', emoji: '🥚', zonaHabitual: 'nevera', palabras: ['huevo'] },
  { id: 'pan', nombre: 'Pan y bollería', emoji: '🍞', zonaHabitual: 'despensa', palabras: ['pan', 'baguette', 'barra', 'tortita', 'wrap', 'tortilla de trigo', 'bolleria', 'croissant', 'bizcocho'] },
  { id: 'secos', nombre: 'Pasta, arroz, legumbres secas', emoji: '🍝', zonaHabitual: 'despensa', palabras: ['pasta', 'macarron', 'espagueti', 'fideo', 'arroz', 'lenteja', 'garbanzo', 'alubia', 'quinoa', 'cuscus', 'harina', 'avena', 'cereal', 'azucar', 'sal', 'galleta'] },
  { id: 'conservas', nombre: 'Conservas y botes', emoji: '🥫', zonaHabitual: 'despensa', palabras: ['lata', 'conserva', 'bote', 'atun', 'tomate frito', 'tomate triturado', 'garbanzos cocidos', 'lentejas cocidas', 'maiz', 'aceituna', 'pimiento del piquillo'] },
  { id: 'salsas', nombre: 'Salsas y condimentos', emoji: '🫙', zonaHabitual: 'despensa', palabras: ['salsa', 'mayonesa', 'ketchup', 'mostaza', 'pesto', 'aceite', 'vinagre', 'especia', 'oregano', 'pimenton', 'caldo', 'soja'] },
  { id: 'congelados', nombre: 'Congelados', emoji: '🧊', zonaHabitual: 'congelador', palabras: ['congelad', 'helado', 'pizza'] },
  { id: 'cocinado', nombre: 'Comida cocinada', emoji: '🍲', zonaHabitual: 'nevera', palabras: ['sobras', 'cocinado', 'guiso', 'hummus', 'gazpacho'] },
  { id: 'otros', nombre: 'Otros', emoji: '🛒', zonaHabitual: 'despensa', palabras: [] },
]

// Días típicos que dura cada categoría en cada zona (editable en Ajustes)
export const DURACIONES_POR_DEFECTO: Record<string, DuracionesCategoria> = {
  fruta: { despensa: 6, nevera: 12, congelador: 240 },
  verdura: { despensa: 4, nevera: 7, congelador: 240 },
  carne: { despensa: 0, nevera: 3, congelador: 120 },
  'carne-picada': { despensa: 0, nevera: 2, congelador: 90 },
  pescado: { despensa: 0, nevera: 2, congelador: 90 },
  charcuteria: { despensa: 0, nevera: 7, congelador: 60 },
  queso: { despensa: 0, nevera: 21, congelador: 120 },
  leche: { despensa: 90, nevera: 5, congelador: 60 },
  yogur: { despensa: 0, nevera: 21, congelador: 60 },
  huevos: { despensa: 21, nevera: 28, congelador: 120 },
  pan: { despensa: 3, nevera: 6, congelador: 90 },
  secos: { despensa: 365, nevera: 365, congelador: 365 },
  conservas: { despensa: 730, nevera: 4, congelador: 90 },
  salsas: { despensa: 180, nevera: 30, congelador: 90 },
  congelados: { despensa: 0, nevera: 2, congelador: 180 },
  cocinado: { despensa: 0, nevera: 4, congelador: 90 },
  otros: { despensa: 30, nevera: 7, congelador: 90 },
}

// Una vez descongelada, la comida cocinada conviene tomarla en 1-2 días
const DIAS_TRAS_DESCONGELAR = 2

export const categoria = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1]

const sinAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Adivina la categoría a partir del nombre ("pechuga de pollo" → carne)
export function adivinarCategoria(nombre: string): string {
  const n = sinAcentos(nombre)
  let mejor = { id: 'otros', largo: 0 }
  for (const c of CATEGORIAS) {
    for (const p of c.palabras) {
      // Gana la palabra más larga, así "tomate frito" vence a "tomate"
      if (n.includes(sinAcentos(p)) && p.length > mejor.largo) mejor = { id: c.id, largo: p.length }
    }
  }
  return mejor.id
}

export function estimarCaducidad(
  categoriaId: string,
  zona: Zona,
  duraciones: Record<string, DuracionesCategoria>,
  desde = hoy(),
): string {
  const tabla = duraciones[categoriaId] ?? DURACIONES_POR_DEFECTO[categoriaId] ?? DURACIONES_POR_DEFECTO.otros
  return sumarDias(desde, tabla[zona])
}

export function caducidadTupper(t: Tupper, duraciones: Record<string, DuracionesCategoria>): string {
  if (t.zona === 'nevera' && t.enNeveraDesde) return sumarDias(t.enNeveraDesde, DIAS_TRAS_DESCONGELAR)
  return estimarCaducidad('cocinado', t.zona, duraciones, t.preparadoEl)
}

export type Urgencia = 'caducado' | 'urgente' | 'pronto' | 'semana' | 'bien' | 'sin-fecha'

export function urgencia(caducidad?: string): Urgencia {
  if (!caducidad) return 'sin-fecha'
  const d = diasEntre(hoy(), caducidad)
  if (d < 0) return 'caducado'
  if (d <= 1) return 'urgente'
  if (d <= 3) return 'pronto'
  if (d <= 7) return 'semana'
  return 'bien'
}

// Clases de color para cada nivel de urgencia
export const ESTILO_URGENCIA: Record<Urgencia, { punto: string; texto: string; fondo: string }> = {
  caducado: { punto: 'bg-red-600', texto: 'text-red-700', fondo: 'bg-red-50' },
  urgente: { punto: 'bg-red-500', texto: 'text-red-600', fondo: 'bg-red-50' },
  pronto: { punto: 'bg-orange-400', texto: 'text-orange-700', fondo: 'bg-orange-50' },
  semana: { punto: 'bg-amber-300', texto: 'text-amber-700', fondo: 'bg-tarjeta' },
  bien: { punto: 'bg-emerald-400', texto: 'text-emerald-700', fondo: 'bg-tarjeta' },
  'sin-fecha': { punto: 'bg-stone-300', texto: 'text-suave', fondo: 'bg-tarjeta' },
}
