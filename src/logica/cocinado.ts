import { db } from '../datos/db'
import type { PlanSemanal, Producto, Unidad } from '../datos/tipos'
import type { RecetaIA } from '../ia/esquema'
import { hoy } from './fechas'
import { buscarEnInventario } from './sesion'
import { guardarTuppers, nuevoTupper } from './tuppers'
import { convertir, normalizarUnidad } from './unidades'

// Para escribir lo gastado es más cómodo en gramos y mililitros:
// si el producto está en kg, se pregunta en g; si está en l, en ml.
export const unidadVista = (u: Unidad): Unidad => (u === 'kg' ? 'g' : u === 'l' ? 'ml' : u)

export interface Gasto {
  producto: Producto
  cantidad: number | null // en unidadVista(producto.unidad); null = sin rellenar
  marcado: boolean
  origen?: string // ingrediente de la receta del que sale
}

const comparable = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Propone qué se gastó: ingredientes de la receta que tienes en casa y,
// si no hay receta, productos cuyo nombre aparece en el plato
export function proponerGastos(productos: Producto[], plato: string, receta?: RecetaIA, yaDescontada = false): Gasto[] {
  const gastos = new Map<string, Gasto>()
  for (const ing of receta?.ingredientes ?? []) {
    const p = buscarEnInventario(ing.nombre, productos)
    if (!p) continue
    const u = normalizarUnidad(ing.unidad)
    const cantidad = ing.cantidad != null && u ? convertir(ing.cantidad, u, unidadVista(p.unidad)) : null
    const previo = gastos.get(p.id)
    gastos.set(p.id, {
      producto: p,
      cantidad: previo?.cantidad != null && cantidad != null ? previo.cantidad + cantidad : (cantidad ?? previo?.cantidad ?? null),
      marcado: !yaDescontada && (cantidad != null || !!previo?.marcado),
      origen: previo ? `${previo.origen}, ${ing.nombre}` : ing.nombre,
    })
  }
  if (!receta) {
    const palabras = comparable(plato).split(/\s+/).filter((w) => w.length > 3)
    for (const p of productos) {
      const nombre = comparable(p.nombre)
      if (palabras.some((w) => nombre.includes(w.replace(/s$/, '')))) gastos.set(p.id, { producto: p, cantidad: null, marcado: false })
    }
  }
  return [...gastos.values()]
}

export interface Cocinado {
  planId: string
  plato: string
  recetaId?: string | null
  fecha?: string // hueco del menú que se come ahora
  momento?: 'comida' | 'cena'
  comerAhora: number
  nevera: number
  congelador: number
  gastos: Gasto[]
}

// Registra que has cocinado un plato: resta ingredientes, crea tuppers y marca lo comido
export async function registrarCocinado(c: Cocinado): Promise<{ restados: string[] }> {
  const restados: string[] = []
  await db.transaction('rw', db.planes, db.tuppers, db.productos, async () => {
    // 1) Ingredientes gastados (nunca por debajo de cero)
    for (const g of c.gastos) {
      if (!g.marcado || !g.cantidad || g.cantidad <= 0) continue
      const actual = await db.productos.get(g.producto.id)
      if (!actual) continue
      const gastado = convertir(g.cantidad, unidadVista(actual.unidad), actual.unidad) ?? g.cantidad
      const queda = Math.round((actual.cantidad - gastado) * 1000) / 1000
      if (queda <= 0) await db.productos.delete(actual.id)
      else await db.productos.update(actual.id, { cantidad: queda })
      restados.push(actual.nombre)
    }

    const plan = await db.planes.get(c.planId)
    if (!plan) return

    // 2) El hueco de hoy queda como comido
    if (c.comerAhora > 0 && c.fecha && c.momento && c.fecha <= hoy()) {
      const menu = structuredClone(plan.menu)
      const dia = menu.menu.find((d) => d.fecha === c.fecha)
      if (dia && !dia[c.momento].tupperId) {
        dia[c.momento].consumido = true
        await db.planes.update(plan.id, { menu })
      }
    }

    // 3) Tuppers (se reservan solos para los próximos días de este plato)
    const propuestos = plan.menu.tuppersResultantes.map((t, i) => ({ t, i })).filter(({ t }) => c.recetaId && t.recetaId === c.recetaId)
    const descongelar = propuestos.find(({ t }) => t.zona === 'congelador' && t.pasarANeveraEl)?.t.pasarANeveraEl ?? undefined
    const base = { plato: c.plato, estado: 'listo' as const, planId: plan.id, recetaId: c.recetaId ?? undefined }
    const nuevos = [
      ...(c.nevera > 0 ? [nuevoTupper({ ...base, raciones: c.nevera, zona: 'nevera' })] : []),
      ...(c.congelador > 0 ? [nuevoTupper({ ...base, raciones: c.congelador, zona: 'congelador', pasarANeveraEl: descongelar })] : []),
    ]
    await guardarTuppers(plan.id, nuevos, (p: PlanSemanal) => ({
      // Los tuppers que proponía la IA para este plato ya están hechos, y sus ingredientes restados
      tuppersGuardados: [...new Set([...(p.sesion.tuppersGuardados ?? []), ...propuestos.map(({ i }) => i)])],
      recetasDescontadas: c.recetaId ? [...new Set([...(p.sesion.recetasDescontadas ?? []), c.recetaId])] : p.sesion.recetasDescontadas,
    }))
  })
  return { restados }
}
