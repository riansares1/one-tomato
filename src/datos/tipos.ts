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
