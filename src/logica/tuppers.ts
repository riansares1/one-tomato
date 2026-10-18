import { db, nuevoId } from '../datos/db'
import type { PlanSemanal, Tupper } from '../datos/tipos'
import type { MenuIA } from '../ia/esquema'
import { hoy } from './fechas'

// Los tuppers del menú se "reservan": un hueco con tupperId tiene apartada una ración
// de ese tupper. Cuando pasa el día, la ración se da por comida y se resta del tupper.

type Hueco = MenuIA['menu'][number]['comida']

function* huecos(menu: MenuIA): Generator<{ fecha: string; hueco: Hueco }> {
  for (const d of menu.menu) {
    yield { fecha: d.fecha, hueco: d.comida }
    yield { fecha: d.fecha, hueco: d.cena }
  }
}

const comparable = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Cuántas raciones de cada tupper están apartadas en el menú (sin comer todavía)
export function reservas(plan: PlanSemanal | null | undefined): Map<string, number> {
  const r = new Map<string, number>()
  if (!plan) return r
  for (const { hueco } of huecos(plan.menu)) {
    if (hueco.tupperId && !hueco.consumido) r.set(hueco.tupperId, (r.get(hueco.tupperId) ?? 0) + 1)
  }
  return r
}

export const racionesLibres = (t: Tupper, res: Map<string, number>) => Math.max(0, t.raciones - (res.get(t.id) ?? 0))

// Reserva tuppers recién guardados para los huecos de su receta que aún no tienen tupper.
// Los de nevera cubren los primeros días; los del congelador, los siguientes.
function vincular(menu: MenuIA, nuevos: Tupper[], h: string) {
  const ordenados = [...nuevos].sort((a, b) => (a.zona === b.zona ? 0 : a.zona === 'nevera' ? -1 : 1))
  for (const t of ordenados) {
    let libres = t.raciones
    for (const { fecha, hueco } of huecos(menu)) {
      if (libres <= 0) break
      if (fecha < h || hueco.tupperId || hueco.consumido || hueco.origen !== 'nuevo') continue
      const mismaReceta = t.recetaId ? hueco.recetaId === t.recetaId : comparable(hueco.plato) === comparable(t.plato)
      if (!mismaReceta) continue
      hueco.tupperId = t.id
      libres--
    }
  }
}

// Al guardar un menú de la IA: los huecos "tupper-existente" se enlazan con tus tuppers reales
export async function enlazarTuppersExistentes(menu: MenuIA) {
  const tuppers = await db.tuppers.toArray()
  const usadas = new Map<string, number>()
  for (const { hueco } of huecos(menu)) {
    if (hueco.origen !== 'tupper-existente' || hueco.tupperId) continue
    const texto = comparable(`${hueco.plato} ${hueco.tupperExistente ?? ''}`)
    const t = tuppers.find((x) => texto.includes(comparable(x.plato)) && (usadas.get(x.id) ?? 0) < x.raciones)
    if (t) {
      hueco.tupperId = t.id
      usadas.set(t.id, (usadas.get(t.id) ?? 0) + 1)
    }
  }
}

// Crea tuppers de este plan y los reserva en el menú
export async function guardarTuppers(planId: string, nuevos: Tupper[], extra?: (plan: PlanSemanal) => Partial<PlanSemanal['sesion']>) {
  await db.transaction('rw', db.planes, db.tuppers, async () => {
    const plan = await db.planes.get(planId)
    if (!plan) return
    await db.tuppers.bulkAdd(nuevos)
    const menu = structuredClone(plan.menu)
    vincular(menu, nuevos, hoy())
    await db.planes.update(planId, { menu, sesion: { ...plan.sesion, ...extra?.(plan) } })
  })
}

// Resta las raciones reservadas de los días que ya pasaron (se da por hecho que te las comiste)
export async function consumirPasados() {
  await db.transaction('rw', db.planes, db.tuppers, async () => {
    const plan = await db.planes.orderBy('creadoEl').last()
    if (!plan) return
    const h = hoy()
    const menu = structuredClone(plan.menu)
    let cambios = false
    for (const { fecha, hueco } of huecos(menu)) {
      if (fecha >= h || !hueco.tupperId || hueco.consumido) continue
      await restarRacion(hueco.tupperId)
      hueco.consumido = true
      cambios = true
    }
    if (cambios) await db.planes.update(plan.id, { menu })
  })
}

async function restarRacion(tupperId: string) {
  const t = await db.tuppers.get(tupperId)
  if (!t) return
  if (t.raciones > 1) await db.tuppers.update(t.id, { raciones: t.raciones - 1 })
  else await db.tuppers.delete(t.id)
}

// "Me como 1 ración": si esa ración estaba reservada en el menú, la reserva se da por comida.
// Devuelve una función para deshacerlo.
export async function comerRacion(t: Tupper): Promise<() => Promise<void>> {
  const plan = await db.planes.orderBy('creadoEl').last()
  const menuAntes = plan ? structuredClone(plan.menu) : undefined
  await db.transaction('rw', db.planes, db.tuppers, async () => {
    if (plan) {
      const menu = structuredClone(plan.menu)
      const suyos = [...huecos(menu)].filter(({ hueco }) => hueco.tupperId === t.id && !hueco.consumido)
      const deHoy = suyos.find(({ fecha }) => fecha <= hoy())
      if (deHoy) deHoy.hueco.consumido = true
      // Si te la comes antes de tiempo y no quedan raciones para todas las reservas, se libera la primera
      else if (suyos.length >= t.raciones && suyos[0]) suyos[0].hueco.tupperId = null
      if (deHoy || suyos.length >= t.raciones) await db.planes.update(plan.id, { menu })
    }
    await restarRacion(t.id)
  })
  return async () => {
    await db.tuppers.put(t)
    if (plan && menuAntes) await db.planes.update(plan.id, { menu: menuAntes })
  }
}

export const nuevoTupper = (datos: Omit<Tupper, 'id' | 'preparadoEl'>): Tupper => ({ id: nuevoId(), preparadoEl: hoy(), ...datos })
