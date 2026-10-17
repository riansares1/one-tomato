import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import Hoja from '../../componentes/Hoja'
import type { Ingrediente } from '../../datos/tipos'
import { mostrarNumero } from '../../logica/numeros'
import { dominio } from '../../logica/recetas'

interface Props {
  nombre: string
  raciones?: number | null
  tiempoMin?: number | null
  ingredientes?: (Ingrediente & { deInventario?: boolean })[]
  pasos?: string[]
  enlace?: string | null
  nota?: string | null
  onCerrar: () => void
  children?: ReactNode // botones de acción
}

// Ficha de una receta: ingredientes, pasos y enlace original
export default function DetalleReceta({ nombre, raciones, tiempoMin, ingredientes, pasos, enlace, nota, onCerrar, children }: Props) {
  return (
    <Hoja titulo={nombre} onCerrar={onCerrar}>
      <div className="space-y-5">
        {(raciones || tiempoMin) && (
          <div className="flex gap-2 text-sm">
            {raciones ? <span className="rounded-full bg-stone-100 px-3 py-1">🍽️ {raciones} {raciones === 1 ? 'ración' : 'raciones'}</span> : null}
            {tiempoMin ? <span className="rounded-full bg-stone-100 px-3 py-1">⏱️ {tiempoMin} min</span> : null}
          </div>
        )}

        {enlace && (
          <a href={enlace} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-tarjeta p-3 font-semibold text-tomate ring-1 ring-black/5">
            <ExternalLink size={18} /> Ver original ({dominio(enlace)})
          </a>
        )}

        {nota && <p className="rounded-2xl bg-amber-50 p-3 text-sm whitespace-pre-line text-amber-900">{nota}</p>}

        {!!ingredientes?.length && (
          <section>
            <h3 className="mb-2 font-bold">Ingredientes</h3>
            <ul className="space-y-1.5">
              {ingredientes.map((i, n) => (
                <li key={n} className="flex items-baseline gap-2">
                  <span className="text-tomate">•</span>
                  <span className="flex-1">
                    {i.cantidad != null && <b>{mostrarNumero(i.cantidad)} {i.unidad ?? ''} </b>}
                    {i.nombre}
                  </span>
                  {i.deInventario && <span className="text-xs text-emerald-700">en casa</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!pasos?.length && (
          <section>
            <h3 className="mb-2 font-bold">Pasos</h3>
            <ol className="space-y-3">
              {pasos.map((p, n) => (
                <li key={n} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tomate text-sm font-bold text-white">{n + 1}</span>
                  <span className="pt-0.5">{p}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {children && <div className="space-y-3 pt-2">{children}</div>}
      </div>
    </Hoja>
  )
}
