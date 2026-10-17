import { db } from '../datos/db'
import type { Producto, Tupper } from '../datos/tipos'

const clave = (nombre: string) => nombre.trim().toLowerCase()

// Guarda en la memoria de autocompletado lo último que sé de este producto
export async function recordarUsado(p: Producto) {
  await db.usados.put({
    clave: clave(p.nombre),
    nombre: p.nombre.trim(),
    marca: p.marca,
    categoria: p.categoria,
    unidad: p.unidad,
    zona: p.zona,
  })
}

// ¿Ya hay un producto igual (mismo nombre, zona y unidad) en el inventario?
export async function buscarDuplicado(p: Producto): Promise<Producto | undefined> {
  const mismos = await db.productos.where('zona').equals(p.zona).toArray()
  return mismos.find((o) => o.id !== p.id && clave(o.nombre) === clave(p.nombre) && o.unidad === p.unidad)
}

export async function guardarProducto(p: Producto) {
  await db.productos.put({ ...p, nombre: p.nombre.trim() })
  await recordarUsado(p)
}

// Suma la cantidad nueva al producto existente. Se queda con la caducidad más próxima.
export async function sumarA(existente: Producto, nuevo: Producto) {
  const fechas = [existente.caducidad, nuevo.caducidad].filter(Boolean) as string[]
  fechas.sort()
  const masProxima = fechas[0]
  const tipo = masProxima === existente.caducidad ? existente.caducidadTipo : nuevo.caducidadTipo
  await db.productos.update(existente.id, {
    cantidad: existente.cantidad + nuevo.cantidad,
    caducidad: masProxima,
    caducidadTipo: tipo,
  })
  await recordarUsado(nuevo)
}

export async function buscarSugerencias(texto: string) {
  const t = clave(texto)
  if (t.length < 2) return []
  const todos = await db.usados.toArray()
  return todos
    .filter((u) => u.clave.includes(t) && u.clave !== t)
    .sort((a, b) => Number(b.clave.startsWith(t)) - Number(a.clave.startsWith(t)) || a.clave.localeCompare(b.clave))
    .slice(0, 5)
}

export const borrarProducto = (id: string) => db.productos.delete(id)
export const restaurarProducto = (p: Producto) => db.productos.put(p)
export const borrarTupper = (id: string) => db.tuppers.delete(id)
export const restaurarTupper = (t: Tupper) => db.tuppers.put(t)
