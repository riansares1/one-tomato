import { db, nuevoId } from '../datos/db'
import type { Receta } from '../datos/tipos'
import type { RecetaIA } from '../ia/esquema'
import { hoy } from './fechas'

const DOMINIOS_VIDEO = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'facebook.com', 'fb.watch', 'pinterest.', 'pin.it']

export function tipoDeEnlace(url: string): 'web' | 'video' {
  return DOMINIOS_VIDEO.some((d) => url.toLowerCase().includes(d)) ? 'video' : 'web'
}

export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Saca el primer enlace de un texto (al compartir desde TikTok viene con más texto)
export function extraerEnlace(texto: string): { enlace: string; resto: string } | null {
  const m = texto.match(/https?:\/\/[^\s<>"]+/i)
  if (!m) return null
  const resto = texto.replace(m[0], '').trim()
  return { enlace: m[0].replace(/[).,]+$/, ''), resto }
}

// En webs, el nombre suele estar en la dirección: /receta-de-lentejas-con-chorizo → "Lentejas con chorizo"
export function nombreDesdeEnlace(url: string): string {
  if (tipoDeEnlace(url) === 'video') return ''
  try {
    const partes = new URL(url).pathname.split('/').filter(Boolean)
    const ultima = (partes[partes.length - 1] ?? '').replace(/\.(html?|php)$/, '').replace(/[-_]\d+$/, '')
    const texto = decodeURIComponent(ultima)
      .replace(/[-_]+/g, ' ')
      .replace(/^receta(s)? (de )?/i, '')
      .trim()
    if (!texto || /^\d+$/.test(texto)) return ''
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  } catch {
    return ''
  }
}

// Para comparar nombres sin fijarse en mayúsculas ni tildes
const comparable = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const esLaMisma = (a: Pick<Receta, 'nombre' | 'enlace'>, b: Pick<Receta, 'nombre' | 'enlace'>) =>
  comparable(a.nombre) === comparable(b.nombre) || (!!a.enlace && a.enlace === b.enlace)

// Guarda una receta del menú de la IA como favorita (si no estaba ya)
export async function guardarComoFavorita(r: RecetaIA): Promise<boolean> {
  const todas = await db.recetas.toArray()
  const misma = todas.find((x) => esLaMisma(x, { nombre: r.nombre, enlace: r.enlaceOrigen ?? undefined }))
  const datos: Partial<Receta> = {
    nombre: r.nombre,
    raciones: r.raciones ?? undefined,
    ingredientes: r.ingredientes.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad })),
    pasos: r.pasos,
    enlace: r.enlaceOrigen ?? misma?.enlace,
  }
  if (misma) {
    if (misma.estado === 'favorita') return false
    await db.recetas.update(misma.id, { ...datos, estado: 'favorita', probadaEl: undefined })
    return true
  }
  await db.recetas.add({ id: nuevoId(), estado: 'favorita', creadaEl: hoy(), ...datos } as Receta)
  return true
}

export async function valorar(receta: Receta, gusto: boolean) {
  if (gusto) {
    // Si ya la guardaste como favorita desde el menú, no la duplicamos
    const favoritas = await db.recetas.where('estado').equals('favorita').toArray()
    const yaEsta = favoritas.find((f) => esLaMisma(f, receta))
    if (yaEsta) {
      await db.recetas.update(yaEsta.id, { enlace: yaEsta.enlace ?? receta.enlace, tipoEnlace: yaEsta.tipoEnlace ?? receta.tipoEnlace, nota: yaEsta.nota ?? receta.nota })
      await db.recetas.delete(receta.id)
      return
    }
  }
  await db.recetas.update(receta.id, { estado: gusto ? 'favorita' : 'archivada', probadaEl: undefined })
}
