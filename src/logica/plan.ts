import { useLiveQuery } from 'dexie-react-hooks'
import { db, nuevoId } from '../datos/db'
import type { PlanSemanal, RespuestasAsistente } from '../datos/tipos'
import type { HuecoMenu, MenuIA } from '../ia/esquema'
import { deTexto, hoy, sumarDias } from './fechas'
import { consumirPasados, enlazarTuppersExistentes } from './tuppers'

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const nombreDia = (f: string) => DIAS[deTexto(f).getDay()]

export const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// "lunes 19"
export const etiquetaDia = (f: string) => `${nombreDia(f)} ${deTexto(f).getDate()}`

// Próxima vez que toca tu día de cocina (hoy incluido)
export function proximoDiaCocina(diaCocina: string): string {
  const objetivo = DIAS.indexOf(diaCocina.normalize('NFC'))
  let f = hoy()
  for (let i = 0; i < 7; i++) {
    if (deTexto(f).getDay() === objetivo) return f
    f = sumarDias(f, 1)
  }
  return hoy()
}

export function fechasEntre(desde: string, hasta: string): string[] {
  const r: string[] = []
  for (let f = desde; f <= hasta && r.length < 31; f = sumarDias(f, 1)) r.push(f)
  return r
}

// El plan más reciente
export function usePlanActual(): PlanSemanal | null | undefined {
  return useLiveQuery(async () => (await db.planes.orderBy('creadoEl').last()) ?? null, [])
}

export const huecoVacio = (): HuecoMenu => ({ plato: '', origen: 'nuevo', recetaId: null, tupperExistente: null, paraLlevar: false, nota: null })

// Menú en blanco para rellenar a mano, sin IA
export function menuEnBlanco(r: Pick<RespuestasAsistente, 'desde' | 'hasta' | 'diaCocina' | 'diasUni' | 'fuera'>): MenuIA {
  return {
    version: 1,
    semana: { desde: r.desde, hasta: r.hasta },
    diaCocina: r.diaCocina,
    menu: fechasEntre(r.desde, r.hasta).map((fecha) => {
      const fuera = r.fuera.find((f) => f.fecha === fecha)
      const comida = huecoVacio()
      const cena = huecoVacio()
      if (fuera?.comida) Object.assign(comida, { plato: 'Como fuera', origen: 'fuera' })
      if (fuera?.cena) Object.assign(cena, { plato: 'Ceno fuera', origen: 'fuera' })
      if (r.diasUni.includes(fecha)) comida.paraLlevar = true
      return { fecha, comida, cena }
    }),
    recetas: [],
    listaCompra: [],
    sesionCocina: { duracionTotalMin: null, pasos: [] },
    tuppersResultantes: [],
    avisos: [],
  }
}

// Guarda un plan nuevo y sustituye la lista de la compra por la suya
export async function guardarPlan(menu: MenuIA, respuestas?: RespuestasAsistente): Promise<string> {
  const id = nuevoId()
  // Antes de cambiar de menú, se dan por comidas las raciones reservadas de días pasados
  await consumirPasados()
  // Los "tupper que ya tienes" del menú se enlazan con tus tuppers reales
  await enlazarTuppersExistentes(menu)
  await db.transaction('rw', db.planes, db.compra, async () => {
    await db.planes.add({
      id,
      creadoEl: new Date().toISOString(),
      desde: menu.semana.desde,
      hasta: menu.semana.hasta,
      respuestas,
      menu,
      sesion: { pasosHechos: [], temporizadores: {} },
    })
    // Lo que añadiste a mano y no has comprado se conserva
    const anteriores = await db.compra.toArray()
    await db.compra.bulkDelete(anteriores.filter((i) => i.planId || i.comprado).map((i) => i.id))
    await db.compra.bulkAdd(
      menu.listaCompra.map((i) => ({ id: nuevoId(), planId: id, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, seccion: i.seccion, comprado: false })),
    )
  })
  return id
}

export async function cambiarHueco(plan: PlanSemanal, fecha: string, momento: 'comida' | 'cena', hueco: HuecoMenu) {
  const menu = structuredClone(plan.menu)
  const dia = menu.menu.find((d) => d.fecha === fecha)
  if (!dia) return
  dia[momento] = hueco
  await db.planes.update(plan.id, { menu })
}

// Qué toca comer un día concreto según el plan
export function comidasDelDia(plan: PlanSemanal | null | undefined, fecha: string) {
  return plan?.menu.menu.find((d) => d.fecha === fecha)
}

// Avisos que tocan hoy: descongelar tuppers y recordatorios de la IA
export function avisosDeHoy(plan: PlanSemanal | null | undefined, tuppersCongelados: { plato: string; pasarANeveraEl?: string }[]): string[] {
  const h = hoy()
  const lista = tuppersCongelados.filter((t) => t.pasarANeveraEl && t.pasarANeveraEl <= h).map((t) => `Pasa «${t.plato}» del congelador a la nevera`)
  for (const a of plan?.menu.avisos ?? []) if (a.fecha === h && !lista.includes(a.texto)) lista.push(a.texto)
  return lista
}
