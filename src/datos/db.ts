import Dexie, { type EntityTable } from 'dexie'
import type { Ajustes, ItemCompra, PlanSemanal, Producto, ProductoConocido, Receta, Tupper, Usado } from './tipos'

// Base de datos local del iPhone (IndexedDB), manejada con Dexie.
export const db = new Dexie('one-tomato') as Dexie & {
  productos: EntityTable<Producto, 'id'>
  tuppers: EntityTable<Tupper, 'id'>
  usados: EntityTable<Usado, 'clave'>
  productosConocidos: EntityTable<ProductoConocido, 'codigoBarras'>
  ajustes: EntityTable<Ajustes, 'id'>
  recetas: EntityTable<Receta, 'id'>
  planes: EntityTable<PlanSemanal, 'id'>
  compra: EntityTable<ItemCompra, 'id'>
}

db.version(1).stores({
  productos: 'id, zona, nombre, caducidad, codigoBarras',
  tuppers: 'id, zona',
  usados: 'clave',
  productosConocidos: 'codigoBarras',
  ajustes: 'id',
})

// Versión 2: recetas, planes semanales y lista de la compra
db.version(2).stores({
  recetas: 'id, estado',
  planes: 'id, creadoEl',
  compra: 'id, planId',
})

export const nuevoId = () => crypto.randomUUID()

// Pide al iPhone que no borre nuestros datos aunque le falte espacio
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
