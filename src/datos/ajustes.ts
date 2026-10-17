import { useLiveQuery } from 'dexie-react-hooks'
import { DURACIONES_POR_DEFECTO } from '../logica/caducidad'
import { db } from './db'
import type { Ajustes } from './tipos'

export const AJUSTES_POR_DEFECTO: Ajustes = {
  id: 'ajustes',
  gustos: '',
  noComo: '',
  alergias: '',
  equipamiento: 'Vitrocerámica, horno, microondas',
  numTuppers: 8,
  diaCocina: 'domingo',
  duraciones: DURACIONES_POR_DEFECTO,
  instruccionesIA: '',
}

// Mezcla lo guardado con los valores por defecto (por si añadimos campos nuevos)
function completar(guardado?: Ajustes): Ajustes {
  return {
    ...AJUSTES_POR_DEFECTO,
    ...guardado,
    duraciones: { ...DURACIONES_POR_DEFECTO, ...guardado?.duraciones },
  }
}

export async function leerAjustes(): Promise<Ajustes> {
  return completar(await db.ajustes.get('ajustes'))
}

export async function guardarAjustes(cambios: Partial<Ajustes>) {
  const actuales = await leerAjustes()
  await db.ajustes.put({ ...actuales, ...cambios, id: 'ajustes' })
}

export function useAjustes(): Ajustes {
  return useLiveQuery(() => leerAjustes(), [], AJUSTES_POR_DEFECTO)
}
