import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import { useAviso } from '../../componentes/Aviso'
import { db, nuevoId } from '../../datos/db'
import type { Tupper } from '../../datos/tipos'
import { hoy } from '../../logica/fechas'
import { borrarTupper, restaurarTupper } from '../../logica/inventario'

interface Props {
  tupper?: Tupper
  onCerrar: () => void
}

export default function FormTupper({ tupper, onCerrar }: Props) {
  const aviso = useAviso()
  const editando = !!tupper

  const [plato, setPlato] = useState(tupper?.plato ?? '')
  const [raciones, setRaciones] = useState(tupper?.raciones ?? 1)
  const [preparadoEl, setPreparadoEl] = useState(tupper?.preparadoEl ?? hoy())
  const [zona, setZona] = useState<Tupper['zona']>(tupper?.zona ?? 'nevera')
  const [estado, setEstado] = useState<Tupper['estado']>(tupper?.estado ?? 'listo')
  const [falta, setFalta] = useState(tupper?.falta ?? '')

  async function guardar() {
    // Si pasa del congelador a la nevera, empieza a descongelarse hoy
    let enNeveraDesde = tupper?.enNeveraDesde
    if (zona === 'congelador') enNeveraDesde = undefined
    else if (tupper?.zona === 'congelador') enNeveraDesde = hoy()

    await db.tuppers.put({
      ...tupper,
      id: tupper?.id ?? nuevoId(),
      plato: plato.trim(),
      raciones,
      preparadoEl: preparadoEl || hoy(),
      zona,
      estado,
      falta: estado === 'casi' ? falta.trim() || undefined : undefined,
      enNeveraDesde,
    })
    aviso(editando ? 'Cambios guardados' : `Tupper de ${plato.trim()} añadido`)
    onCerrar()
  }

  async function borrar() {
    if (!tupper) return
    await borrarTupper(tupper.id)
    aviso(`Tupper de ${tupper.plato} borrado`, () => restaurarTupper(tupper))
    onCerrar()
  }

  return (
    <Hoja titulo={editando ? 'Editar tupper' : 'Nuevo tupper'} onCerrar={onCerrar}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (plato.trim()) guardar()
        }}
      >
        <Campo etiqueta="Plato">
          <input className={claseEntrada} value={plato} onChange={(e) => setPlato(e.target.value)} placeholder="Ej.: lentejas con verduras" />
        </Campo>

        <div className="flex gap-4">
          <Campo grupo etiqueta="Raciones">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRaciones((r) => Math.max(1, r - 1))}
                className="flex size-12 items-center justify-center rounded-2xl border border-stone-200 bg-tarjeta active:bg-stone-100"
                aria-label="Una ración menos"
              >
                <Minus size={20} />
              </button>
              <span className="w-8 text-center text-xl font-bold">{raciones}</span>
              <button
                type="button"
                onClick={() => setRaciones((r) => r + 1)}
                className="flex size-12 items-center justify-center rounded-2xl border border-stone-200 bg-tarjeta active:bg-stone-100"
                aria-label="Una ración más"
              >
                <Plus size={20} />
              </button>
            </div>
          </Campo>
          <div className="flex-1">
            <Campo etiqueta="Preparado el">
              <input type="date" className={`${claseEntrada} min-h-12`} value={preparadoEl} onChange={(e) => setPreparadoEl(e.target.value)} />
            </Campo>
          </div>
        </div>

        <Campo grupo etiqueta="¿Dónde está?">
          <Selector
            opciones={[
              { valor: 'nevera', texto: '🧊 Nevera' },
              { valor: 'congelador', texto: '❄️ Congelador' },
            ]}
            valor={zona}
            onCambio={setZona}
          />
        </Campo>

        <Campo grupo etiqueta="Estado">
          <Selector
            opciones={[
              { valor: 'listo', texto: '✅ Listo' },
              { valor: 'casi', texto: '⏳ Casi listo' },
            ]}
            valor={estado}
            onCambio={setEstado}
          />
        </Campo>

        {estado === 'casi' && (
          <Campo etiqueta="¿Qué le falta?">
            <input className={claseEntrada} value={falta} onChange={(e) => setFalta(e.target.value)} placeholder="Ej.: añadir fideos, 5 min" />
          </Campo>
        )}

        <BotonPrincipal type="submit" disabled={!plato.trim()}>
          {editando ? 'Guardar cambios' : 'Añadir tupper'}
        </BotonPrincipal>
        {editando && (
          <BotonSecundario type="button" onClick={borrar} className="text-red-600">
            <Trash2 size={18} /> Borrar
          </BotonSecundario>
        )}
      </form>
    </Hoja>
  )
}
