import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import { db, nuevoId } from '../../datos/db'
import type { Ingrediente, Receta } from '../../datos/tipos'
import { hoy } from '../../logica/fechas'
import { leerNumero, mostrarNumero } from '../../logica/numeros'
import { tipoDeEnlace } from '../../logica/recetas'

interface Props {
  receta?: Receta
  inicial?: Partial<Receta>
  onCerrar: () => void
}

// "200 g lentejas" ⇄ { cantidad: 200, unidad: 'g', nombre: 'lentejas' }
const ingredienteATexto = (i: Ingrediente) => [i.cantidad != null ? mostrarNumero(i.cantidad) : '', i.unidad ?? '', i.nombre].filter(Boolean).join(' ')
function textoAIngrediente(linea: string): Ingrediente {
  const m = linea.match(/^([\d.,]+)\s*(g|kg|ml|l|ud|uds)?\s+(.+)$/i)
  if (!m) return { nombre: linea }
  return { cantidad: leerNumero(m[1]), unidad: m[2]?.toLowerCase() ?? 'ud', nombre: m[3] }
}

export default function FormReceta({ receta, inicial, onCerrar }: Props) {
  const aviso = useAviso()
  const base = receta ?? inicial
  const [nombre, setNombre] = useState(base?.nombre ?? '')
  const [enlace, setEnlace] = useState(base?.enlace ?? '')
  const [tipo, setTipo] = useState<'web' | 'video'>(base?.tipoEnlace ?? (base?.enlace ? tipoDeEnlace(base.enlace) : 'web'))
  const [nota, setNota] = useState(base?.nota ?? '')
  const [ingredientes, setIngredientes] = useState((base?.ingredientes ?? []).map(ingredienteATexto).join('\n'))
  const [pasos, setPasos] = useState((base?.pasos ?? []).join('\n'))
  const estado = base?.estado ?? 'quiero-probar'
  const conDetalle = estado === 'favorita' || !!base?.ingredientes?.length

  async function guardar() {
    const lineas = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean)
    const datos: Receta = {
      ...receta,
      id: receta?.id ?? nuevoId(),
      creadaEl: receta?.creadaEl ?? hoy(),
      estado,
      nombre: nombre.trim(),
      enlace: enlace.trim() || undefined,
      tipoEnlace: enlace.trim() ? tipo : undefined,
      nota: nota.trim() || undefined,
      ingredientes: conDetalle ? lineas(ingredientes).map(textoAIngrediente) : receta?.ingredientes,
      pasos: conDetalle ? lineas(pasos) : receta?.pasos,
    }
    await db.recetas.put(datos)
    aviso(receta ? 'Receta guardada' : `Añadida: ${datos.nombre}`)
    onCerrar()
  }

  async function borrar() {
    if (!receta) return
    await db.recetas.delete(receta.id)
    aviso(`Borrada: ${receta.nombre}`, () => db.recetas.put(receta))
    onCerrar()
  }

  return (
    <Hoja titulo={receta ? 'Editar receta' : estado === 'favorita' ? 'Nueva favorita' : 'Quiero probar'} onCerrar={onCerrar}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (nombre.trim()) guardar()
        }}
      >
        <Campo etiqueta="Nombre">
          <input className={claseEntrada} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: pollo al curry" />
        </Campo>
        <Campo etiqueta="Enlace (opcional)">
          <input
            className={claseEntrada}
            value={enlace}
            inputMode="url"
            autoCapitalize="off"
            onChange={(e) => {
              setEnlace(e.target.value)
              setTipo(tipoDeEnlace(e.target.value))
            }}
            placeholder="https://…"
          />
        </Campo>
        {enlace && (
          <Campo grupo etiqueta="Tipo">
            <Selector
              opciones={[
                { valor: 'web', texto: '🌐 Web' },
                { valor: 'video', texto: '🎬 Vídeo' },
              ]}
              valor={tipo}
              onCambio={setTipo}
            />
          </Campo>
        )}
        <Campo
          etiqueta={tipo === 'video' && enlace ? 'Descripción del vídeo o ingredientes principales' : 'Nota (opcional)'}
          ayuda={tipo === 'video' && enlace ? 'La IA no puede ver vídeos: pega aquí la descripción o apunta lo principal.' : undefined}
        >
          <textarea className={`${claseEntrada} resize-none`} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
        {conDetalle && (
          <>
            <Campo etiqueta="Ingredientes (uno por línea)">
              <textarea className={`${claseEntrada} resize-none`} rows={4} value={ingredientes} onChange={(e) => setIngredientes(e.target.value)} placeholder={'200 g lentejas\n1 zanahoria'} />
            </Campo>
            <Campo etiqueta="Pasos (uno por línea)">
              <textarea className={`${claseEntrada} resize-none`} rows={4} value={pasos} onChange={(e) => setPasos(e.target.value)} />
            </Campo>
          </>
        )}
        <BotonPrincipal type="submit" disabled={!nombre.trim()}>
          Guardar
        </BotonPrincipal>
        {receta && (
          <BotonSecundario type="button" onClick={borrar} className="text-red-600">
            <Trash2 size={18} /> Borrar
          </BotonSecundario>
        )}
      </form>
    </Hoja>
  )
}
