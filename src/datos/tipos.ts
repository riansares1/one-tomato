// Las "fichas" que guarda la app. Las fechas van como texto 'AAAA-MM-DD'.

export type Zona = 'despensa' | 'nevera' | 'congelador'
export type Unidad = 'ud' | 'g' | 'kg' | 'ml' | 'l'

export interface Producto {
  id: string
  nombre: string
  marca?: string
  cantidad: number
  unidad: Unidad
  zona: Zona
  categoria: string
  caducidad?: string
  caducidadTipo: 'real' | 'estimada'
  codigoBarras?: string
  anadidoEl: string
}

export interface Tupper {
  id: string
  plato: string
  raciones: number
  preparadoEl: string
  zona: 'nevera' | 'congelador'
  estado: 'listo' | 'casi'
  falta?: string
  // Día en que pasó del congelador a la nevera (para descongelar)
  enNeveraDesde?: string
  pasarANeveraEl?: string
  planId?: string
  recetaId?: string
}

// Memoria de lo que he usado alguna vez, para el autocompletado
export interface Usado {
  clave: string // nombre en minúsculas
  nombre: string
  marca?: string
  categoria: string
  unidad: Unidad
  zona: Zona
}

// Memoria de correcciones por código de barras (fase 2)
export interface ProductoConocido {
  codigoBarras: string
  nombre: string
  marca?: string
  cantidad: number
  unidad: Unidad
  categoria: string
  zona: Zona
  origen: 'openfoodfacts' | 'corregido' | 'manual'
}

// Días que dura cada tipo de alimento en cada zona
export type DuracionesCategoria = Record<Zona, number>

export interface Ajustes {
  id: 'ajustes'
  gustos: string
  noComo: string
  alergias: string
  equipamiento: string
  numTuppers: number
  diaCocina: string
  duraciones: Record<string, DuracionesCategoria>
  instruccionesIA: string
  ultimaCopia?: string
}

// ---- Recetas ----

export interface Ingrediente {
  nombre: string
  cantidad?: number | null
  unidad?: string | null
}

export interface Receta {
  id: string
  nombre: string
  estado: 'quiero-probar' | 'favorita' | 'archivada'
  enlace?: string
  tipoEnlace?: 'web' | 'video'
  nota?: string
  raciones?: number
  ingredientes?: Ingrediente[]
  pasos?: string[]
  creadaEl: string
  // Día en que la cocinaste (para preguntarte qué tal)
  probadaEl?: string
}

// ---- Plan semanal ----

export interface RespuestasAsistente {
  desde: string
  hasta: string
  diaCocina: string | null // null = esta semana no cocino
  diasUni: string[]
  fuera: { fecha: string; comida: boolean; cena: boolean }[]
  tiempo: string
  antojos: string
  recetasAProbar: string[] // ids de recetas "quiero probar"
  notas: string
}

export interface EstadoSesion {
  pasosHechos: number[]
  // Hora (ms) en que termina cada temporizador en marcha, o ms restantes si está en pausa
  temporizadores: Record<number, { fin?: number; restante?: number }>
  completadaEl?: string
  // Tuppers propuestos por la IA que ya guardaste (por su posición) y recetas cuyos ingredientes ya se restaron
  tuppersGuardados?: number[]
  recetasDescontadas?: string[]
}

export interface PlanSemanal {
  id: string
  creadoEl: string
  desde: string
  hasta: string
  respuestas?: RespuestasAsistente
  menu: import('../ia/esquema').MenuIA
  sesion: EstadoSesion
}

export interface ItemCompra {
  id: string
  planId?: string
  nombre: string
  cantidad?: number | null
  unidad?: string | null
  seccion: string
  comprado: boolean
}
