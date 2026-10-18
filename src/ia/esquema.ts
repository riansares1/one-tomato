import { z } from 'zod'
import { diasEntre, sumarDias } from '../logica/fechas'

// Esquema del JSON que devuelve la IA. Es tolerante: rellena lo opcional
// y acepta pequeñas variaciones (null, textos en vez de números...).

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'debe ser una fecha AAAA-MM-DD')
const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null))
const numeroOpcional = z.preprocess(
  (v) => (typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v),
  z.number().nullish().transform((v) => (v == null || Number.isNaN(v) ? null : v)),
)

const hueco = z.object({
  plato: z.string().min(1, 'falta el nombre del plato'),
  origen: z.enum(['tupper-existente', 'nuevo', 'fuera'], { message: 'origen debe ser "tupper-existente", "nuevo" o "fuera"' }),
  recetaId: textoOpcional,
  tupperExistente: textoOpcional,
  paraLlevar: z.boolean().nullish().transform((v) => !!v),
  nota: textoOpcional,
  // Solo los usa la app (no la IA): tupper reservado para este hueco y si ya se comió
  tupperId: z.string().nullish(),
  consumido: z.boolean().optional(),
})

const ingrediente = z.object({
  nombre: z.string().min(1),
  cantidad: numeroOpcional,
  unidad: textoOpcional,
  deInventario: z.boolean().nullish().transform((v) => !!v),
})

const receta = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  raciones: numeroOpcional,
  tiempoMin: numeroOpcional,
  esRecetaAProbar: z.boolean().nullish().transform((v) => !!v),
  enlaceOrigen: textoOpcional,
  ingredientes: z.array(ingrediente).default([]),
  pasos: z.array(z.string()).default([]),
  conservacion: textoOpcional,
})

export const SECCIONES_VALIDAS = [
  'fruta-verdura',
  'carne',
  'pescado',
  'charcuteria-quesos',
  'lacteos-huevos',
  'panaderia',
  'despensa',
  'conservas',
  'congelados',
  'bebidas',
  'otros',
] as const

const itemCompra = z.object({
  nombre: z.string().min(1),
  cantidad: numeroOpcional,
  unidad: textoOpcional,
  // Si la IA se inventa una sección, va a "otros"
  seccion: z
    .string()
    .nullish()
    .transform((v) => ((SECCIONES_VALIDAS as readonly string[]).includes(v ?? '') ? v! : 'otros')),
})

const pasoSesion = z.object({
  orden: z.number(),
  texto: z.string().min(1),
  minutos: numeroOpcional,
  temporizador: z.boolean().nullish().transform((v) => !!v),
  recetaId: textoOpcional,
})

const tupperResultante = z.object({
  plato: z.string().min(1),
  recetaId: textoOpcional,
  raciones: z.preprocess((v) => (v == null ? 1 : Number(v)), z.number().min(1)),
  zona: z.enum(['nevera', 'congelador'], { message: 'zona debe ser "nevera" o "congelador"' }),
  estado: z.enum(['listo', 'casi']).nullish().transform((v) => v ?? 'listo'),
  falta: textoOpcional,
  paraComerEl: fecha.nullish().transform((v) => v ?? null),
  pasarANeveraEl: fecha.nullish().transform((v) => v ?? null),
})

// Los avisos pueden venir como texto o como { fecha, texto }
const aviso = z.union([
  z.string().transform((texto) => ({ fecha: null as string | null, texto })),
  z.object({ fecha: fecha.nullish().transform((v) => v ?? null), texto: z.string() }),
])

export const esquemaMenu = z.object({
  version: z.number().optional(),
  semana: z.object({ desde: fecha, hasta: fecha }),
  diaCocina: fecha,
  menu: z.array(z.object({ fecha, comida: hueco, cena: hueco })).min(1, 'el menú no tiene días'),
  recetas: z.array(receta).default([]),
  listaCompra: z.array(itemCompra).default([]),
  sesionCocina: z
    .object({ duracionTotalMin: numeroOpcional, pasos: z.array(pasoSesion).default([]) })
    .default({ duracionTotalMin: null, pasos: [] }),
  tuppersResultantes: z.array(tupperResultante).default([]),
  avisos: z.array(aviso).default([]),
})

export type MenuIA = z.infer<typeof esquemaMenu>
export type HuecoMenu = MenuIA['menu'][number]['comida']
export type RecetaIA = MenuIA['recetas'][number]

// Saca el JSON aunque venga con texto alrededor o dentro de ```json ... ```
export function extraerJSON(texto: string): string {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidato = bloque ? bloque[1] : texto
  const inicio = candidato.indexOf('{')
  const fin = candidato.lastIndexOf('}')
  if (inicio === -1 || fin <= inicio) throw new Error('No encuentro ningún bloque JSON en el texto pegado. ¿Has copiado la respuesta completa de la IA?')
  return candidato.slice(inicio, fin + 1)
}

// Traduce la ruta de un error ("menu.2.cena.plato") a algo legible
function rutaLegible(ruta: PropertyKey[], datos: unknown): string {
  const partes: string[] = []
  let actual: unknown = datos
  for (let i = 0; i < ruta.length; i++) {
    const p = ruta[i]
    const anterior = ruta[i - 1]
    if (typeof p === 'number') {
      const elemento = (actual as unknown[])?.[p] as Record<string, unknown> | undefined
      if (anterior === 'menu') partes.push(`día ${elemento?.fecha ?? p + 1}`)
      else if (anterior === 'recetas') partes.push(`receta "${elemento?.nombre ?? p + 1}"`)
      else partes.push(`elemento ${p + 1}`)
    } else {
      partes.push(String(p))
    }
    actual = (actual as Record<PropertyKey, unknown>)?.[p]
  }
  return partes.join(' → ')
}

export interface ResultadoLectura {
  menu?: MenuIA
  errores: string[]
  avisos: string[]
}

export function leerMenu(texto: string): ResultadoLectura {
  if (!texto.trim()) return { errores: ['No hay nada pegado.'], avisos: [] }

  let datos: unknown
  try {
    const json = extraerJSON(texto)
    try {
      datos = JSON.parse(json)
    } catch {
      // A veces las comillas llegan "tipográficas" (“ ”); probamos a arreglarlas
      datos = JSON.parse(json.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))
    }
  } catch (e) {
    const msg = (e as Error).message
    return {
      errores: [msg.startsWith('No encuentro') ? msg : `El JSON está mal formado (${msg}). Suele pasar si la respuesta se cortó: pide a la IA que lo repita completo.`],
      avisos: [],
    }
  }

  const r = esquemaMenu.safeParse(datos)
  if (!r.success) {
    const errores = r.error.issues.slice(0, 8).map((i) => {
      const donde = rutaLegible(i.path, datos)
      const msg = i.code === 'invalid_type' && i.input === undefined ? 'falta este campo' : i.message
      return donde ? `${donde}: ${msg}` : msg
    })
    return { errores, avisos: [] }
  }

  const menu = r.data
  const errores: string[] = []
  const avisos: string[] = []
  const { desde, hasta } = menu.semana

  if (diasEntre(desde, hasta) < 0) errores.push(`La semana termina (${hasta}) antes de empezar (${desde}).`)

  const fechas = new Set<string>()
  for (const dia of menu.menu) {
    if (fechas.has(dia.fecha)) errores.push(`El día ${dia.fecha} aparece dos veces en el menú.`)
    fechas.add(dia.fecha)
    if (dia.fecha < desde || dia.fecha > hasta) avisos.push(`El día ${dia.fecha} está fuera de la semana ${desde} a ${hasta}.`)
  }
  for (let f = desde; f <= hasta && diasEntre(desde, hasta) < 15; f = sumarDias(f, 1)) {
    if (!fechas.has(f)) avisos.push(`Falta el día ${f} en el menú.`)
  }
  menu.menu.sort((a, b) => a.fecha.localeCompare(b.fecha))

  const ids = new Set(menu.recetas.map((r) => r.id))
  for (const dia of menu.menu) {
    for (const [momento, h] of [['comida', dia.comida], ['cena', dia.cena]] as const) {
      if (h.recetaId && !ids.has(h.recetaId)) errores.push(`La ${momento} del ${dia.fecha} usa la receta "${h.recetaId}", que no está en "recetas".`)
    }
  }

  // Seguridad alimentaria
  for (const t of menu.tuppersResultantes) {
    if (t.zona === 'nevera' && t.paraComerEl && diasEntre(menu.diaCocina, t.paraComerEl) > 4) {
      avisos.push(`"${t.plato}" va a la nevera pero se come el ${t.paraComerEl}, más de 4 días después de cocinar. Mejor congelarlo.`)
    }
    if (t.zona === 'congelador' && !t.pasarANeveraEl) {
      avisos.push(`"${t.plato}" va al congelador pero no dice qué día pasarlo a la nevera.`)
    }
  }

  return { menu: errores.length ? undefined : menu, errores, avisos }
}
