import Dexie, { type EntityTable } from 'dexie'
import type { Ajustes, Producto, ProductoConocido, Tupper, Usado } from './tipos'

// Base de datos local del iPhone (IndexedDB), manejada con Dexie.
// Las tablas de recetas, planes y compra se añadirán en la fase 3.
export const db = new Dexie('one-tomato') as Dexie & {
  productos: EntityTable<Producto, 'id'>
  tuppers: EntityTable<Tupper, 'id'>
  usados: EntityTable<Usado, 'clave'>
  productosConocidos: EntityTable<ProductoConocido, 'codigoBarras'>
  ajustes: EntityTable<Ajustes, 'id'>
}

db.version(1).stores({
  productos: 'id, zona, nombre, caducidad, codigoBarras',
  tuppers: 'id, zona',
  usados: 'clave',
  productosConocidos: 'codigoBarras',
  ajustes: 'id',
})

export const nuevoId = () => crypto.randomUUID()

// Pide al iPhone que no borre nuestros datos aunque le falte espacio
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
