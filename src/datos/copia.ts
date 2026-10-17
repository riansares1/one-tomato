import { db } from './db'
import { guardarAjustes } from './ajustes'
import { aTexto, hoy } from '../logica/fechas'

// Formato del archivo de copia de seguridad
interface Copia {
  app: 'one-tomato'
  version: 1
  exportadoEl: string
  tablas: Record<string, unknown[]>
}

export async function crearCopia(): Promise<File> {
  const tablas: Record<string, unknown[]> = {}
  for (const tabla of db.tables) tablas[tabla.name] = await tabla.toArray()
  const copia: Copia = { app: 'one-tomato', version: 1, exportadoEl: new Date().toISOString(), tablas }
  const texto = JSON.stringify(copia, null, 2)
  return new File([texto], `one-tomato-copia-${aTexto(new Date())}.json`, { type: 'application/json' })
}

// En iPhone lo más cómodo es el menú Compartir (→ "Guardar en Archivos").
// Si no está disponible, se descarga el archivo.
export async function exportarCopia(): Promise<void> {
  const archivo = await crearCopia()
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de One Tomato' })
    } catch (e) {
      // Si cierras el menú sin elegir nada no es un error
      if ((e as Error).name === 'AbortError') return
      throw e
    }
  } else {
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.name
    a.click()
    URL.revokeObjectURL(url)
  }
  await guardarAjustes({ ultimaCopia: hoy() })
}

// Devuelve un resumen de lo que contiene, sin importar todavía
export async function leerCopia(archivo: File): Promise<{ copia: Copia; resumen: string }> {
  let datos: unknown
  try {
    datos = JSON.parse(await archivo.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const copia = datos as Copia
  if (copia?.app !== 'one-tomato' || typeof copia.tablas !== 'object') {
    throw new Error('Este archivo no es una copia de One Tomato.')
  }
  if (copia.version > 1) {
    throw new Error('La copia es de una versión más nueva de la app. Actualiza la app primero.')
  }
  const n = (t: string) => copia.tablas[t]?.length ?? 0
  const fecha = new Date(copia.exportadoEl).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  return { copia, resumen: `Copia del ${fecha}: ${n('productos')} productos, ${n('tuppers')} tuppers, ${n('recetas')} recetas y ${n('planes')} menús.` }
}

// Sustituye TODOS los datos actuales por los de la copia
export async function importarCopia(copia: Copia): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const tabla of db.tables) {
      await tabla.clear()
      const filas = copia.tablas[tabla.name]
      if (Array.isArray(filas)) await tabla.bulkAdd(filas)
    }
  })
}
