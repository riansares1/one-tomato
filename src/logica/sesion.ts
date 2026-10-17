import { db, nuevoId } from '../datos/db'
import type { PlanSemanal, Producto, Tupper } from '../datos/tipos'
import { hoy } from './fechas'
import { convertir, normalizarUnidad } from './unidades'

const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/s\b/g, '') // plural simple: "huevos" → "huevo"
    .trim()

// Busca en el inventario el producto que corresponde a un ingrediente
// ("huevo" ↔ "Huevos camperos"). Si hay varios, el que caduca antes.
export function buscarEnInventario(nombre: string, productos: Producto[]): Producto | undefined {
  const n = normal(nombre)
  return productos
    .filter((p) => {
      const pn = normal(p.nombre)
      return pn.includes(n) || n.includes(pn)
    })
    .sort((a, b) => (a.caducidad ?? '9999').localeCompare(b.caducidad ?? '9999'))[0]
}

export interface Resta {
  clave: string
  ingrediente: string
  producto?: Producto
  restar: number // en la unidad del producto
  queda: number
  problema?: string
}

// Calcula qué restar del inventario (agrupando el mismo producto)
export function calcularRestas(plan: PlanSemanal, productos: Producto[]): Resta[] {
  const restas = new Map<string, Resta>()
  const sinProducto: Resta[] = []

  for (const receta of plan.menu.recetas) {
    for (const ing of receta.ingredientes) {
      if (!ing.deInventario) continue
      const producto = buscarEnInventario(ing.nombre, productos)
      if (!producto) {
        sinProducto.push({ clave: `${receta.id}-${ing.nombre}`, ingrediente: ing.nombre, restar: 0, queda: 0, problema: 'No lo encuentro en tu inventario' })
        continue
      }
      const previa = restas.get(producto.id)
      const yaRestado = previa?.restar ?? 0
      const unidad = normalizarUnidad(ing.unidad)
      let cantidad: number | null = null
      if (ing.cantidad != null && unidad) cantidad = convertir(ing.cantidad, unidad, producto.unidad)
      if (cantidad == null) {
        restas.set(producto.id, {
          clave: producto.id,
          ingrediente: previa ? `${previa.ingrediente}, ${ing.nombre}` : ing.nombre,
          producto,
          restar: yaRestado,
          queda: producto.cantidad - yaRestado,
          problema: previa?.problema ?? `No puedo convertir "${ing.cantidad ?? ''} ${ing.unidad ?? ''}" a ${producto.unidad}: revísalo a mano`,
        })
        continue
      }
      const total = yaRestado + cantidad
      restas.set(producto.id, {
        clave: producto.id,
        ingrediente: previa ? `${previa.ingrediente}, ${ing.nombre}` : ing.nombre,
        producto,
        restar: Math.min(total, producto.cantidad), // nunca por debajo de cero
        queda: Math.max(0, producto.cantidad - total),
        problema: previa?.problema,
      })
    }
  }
  return [...restas.values(), ...sinProducto]
}

export function tuppersDelPlan(plan: PlanSemanal): Tupper[] {
  return plan.menu.tuppersResultantes.map((t) => ({
    id: nuevoId(),
    plato: t.plato,
    raciones: t.raciones,
    preparadoEl: hoy(),
    zona: t.zona,
    estado: t.estado,
    falta: t.falta ?? undefined,
    pasarANeveraEl: t.pasarANeveraEl ?? undefined,
    planId: plan.id,
  }))
}

// Aplica el final de la sesión: todo o nada, y solo una vez por plan
export async function terminarSesion(planId: string, tuppers: Tupper[], restas: Resta[]): Promise<boolean> {
  return db.transaction('rw', db.planes, db.tuppers, db.productos, db.recetas, async () => {
    const plan = await db.planes.get(planId)
    if (!plan || plan.sesion.completadaEl) return false // ya se registró antes: no restamos dos veces

    await db.tuppers.bulkAdd(tuppers)
    for (const r of restas) {
      if (!r.producto || r.restar <= 0) continue
      const actual = await db.productos.get(r.producto.id)
      if (!actual) continue
      const queda = Math.max(0, actual.cantidad - r.restar)
      if (queda <= 0) await db.productos.delete(actual.id)
      else await db.productos.update(actual.id, { cantidad: Math.round(queda * 100) / 100 })
    }

    // Las recetas "quiero probar" cocinadas quedan pendientes de valorar
    const aProbar = await db.recetas.where('estado').equals('quiero-probar').toArray()
    for (const r of plan.menu.recetas.filter((x) => x.esRecetaAProbar)) {
      const coincide = aProbar.find((p) => (r.enlaceOrigen && p.enlace === r.enlaceOrigen) || normal(p.nombre) === normal(r.nombre))
      if (coincide) await db.recetas.update(coincide.id, { probadaEl: hoy() })
    }
    for (const id of plan.respuestas?.recetasAProbar ?? []) {
      const r = aProbar.find((p) => p.id === id)
      if (r) await db.recetas.update(r.id, { probadaEl: hoy() })
    }

    await db.planes.update(planId, { sesion: { ...plan.sesion, completadaEl: hoy() } })
    return true
  })
}
