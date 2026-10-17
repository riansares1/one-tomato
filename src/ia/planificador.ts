import { leerAjustes } from '../datos/ajustes'
import { db } from '../datos/db'
import type { RespuestasAsistente } from '../datos/tipos'
import { leerMenu, type ResultadoLectura } from './esquema'
import { generarPrompt, type ContextoPlan } from './prompt'

// "Enchufe" común para planificar con IA.
// Hoy solo existe el puente manual (copiar y pegar en Claude, ChatGPT o Gemini).
// En el futuro se puede añadir, por ejemplo, un PuenteAPI que llame directamente
// a una IA y devuelva el mismo ResultadoLectura, sin cambiar el resto de la app.
export interface PlanificadorIA {
  nombre: string
  // Paso 1: preparar la petición
  prepararPeticion(contexto: ContextoPlan): string
  // Paso 2: interpretar la respuesta
  leerRespuesta(texto: string): ResultadoLectura
}

export const PuenteManual: PlanificadorIA = {
  nombre: 'Copiar y pegar',
  prepararPeticion: generarPrompt,
  leerRespuesta: leerMenu,
}

// Reúne tus datos y prepara el texto para la IA
export async function prepararPrompt(respuestas: RespuestasAsistente): Promise<string> {
  const [productos, tuppers, recetas, ajustes] = await Promise.all([db.productos.toArray(), db.tuppers.toArray(), db.recetas.toArray(), leerAjustes()])
  return PuenteManual.prepararPeticion({
    respuestas,
    productos,
    tuppers,
    ajustes,
    favoritas: recetas.filter((r) => r.estado === 'favorita'),
    aProbar: recetas.filter((r) => respuestas.recetasAProbar.includes(r.id)),
  })
}
