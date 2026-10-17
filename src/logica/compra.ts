import { db, nuevoId } from '../datos/db'
import type { DuracionesCategoria, ItemCompra, Producto, Unidad, Zona } from '../datos/tipos'
import { estimarCaducidad } from './caducidad'
import { hoy } from './fechas'
import { buscarDuplicado, recordarUsado } from './inventario'
import { categoriaDeCompra, zonaDeCompra } from './secciones'
import { normalizarUnidad } from './unidades'

// Propuesta de producto para algo comprado (editable antes de confirmar)
export function productoDeCompra(item: ItemCompra, duraciones: Record<string, DuracionesCategoria>): Producto {
  const cat = categoriaDeCompra(item.nombre, item.seccion)
  const zona: Zona = zonaDeCompra(cat, item.seccion)
  const unidad: Unidad = normalizarUnidad(item.unidad) ?? 'ud'
  const cantidad = unidad === 'ud' && !normalizarUnidad(item.unidad) ? 1 : (item.cantidad ?? 1)
  return {
    id: nuevoId(),
    nombre: item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1),
    cantidad,
    unidad,
    zona,
    categoria: cat,
    caducidad: estimarCaducidad(cat, zona, duraciones),
    caducidadTipo: 'estimada',
    anadidoEl: hoy(),
  }
}

// Pasa los productos comprados al inventario (sumando si ya existían)
// y los quita de la lista de la compra
export async function pasarAInventario(pares: { item: ItemCompra; producto: Producto }[]) {
  await db.transaction('rw', db.productos, db.usados, db.compra, async () => {
    for (const { item, producto } of pares) {
      const existente = await buscarDuplicado(producto)
      if (existente) {
        const fechas = [existente.caducidad, producto.caducidad].filter(Boolean).sort() as string[]
        await db.productos.update(existente.id, {
          cantidad: existente.cantidad + producto.cantidad,
          caducidad: fechas[0],
          caducidadTipo: fechas[0] === existente.caducidad ? existente.caducidadTipo : producto.caducidadTipo,
        })
      } else {
        await db.productos.add(producto)
      }
      await recordarUsado(producto)
      await db.compra.delete(item.id)
    }
  })
}
