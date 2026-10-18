import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import { db } from '../../datos/db'
import type { PlanSemanal } from '../../datos/tipos'
import type { HuecoMenu } from '../../ia/esquema'
import { cambiarHueco, etiquetaDia, huecoVacio } from '../../logica/plan'
import { racionesLibres, reservas } from '../../logica/tuppers'
import GuardarTupper from './GuardarTupper'

// Cambiar a mano lo que comes en un momento del día
export default function EditarHueco({ plan, fecha, momento, onCerrar }: { plan: PlanSemanal; fecha: string; momento: 'comida' | 'cena'; onCerrar: () => void }) {
  const aviso = useAviso()
  const tuppers = useLiveQuery(() => db.tuppers.toArray(), [])
  const actual = plan.menu.menu.find((d) => d.fecha === fecha)?.[momento] ?? huecoVacio()
  const [h, setH] = useState<HuecoMenu>(actual)
  const cambiar = (c: Partial<HuecoMenu>) => setH((x) => ({ ...x, ...c }))

  // Raciones libres de cada tupper, sin contar la que reserva este mismo hueco
  const res = reservas(plan)
  if (actual.tupperId && !actual.consumido) res.set(actual.tupperId, (res.get(actual.tupperId) ?? 1) - 1)

  async function guardar() {
    const final: HuecoMenu = { ...h, plato: h.plato.trim() }
    if (final.origen !== 'tupper-existente') final.tupperId = null // al quitar el tupper, la ración vuelve a estar libre
    if (final.tupperId !== actual.tupperId) final.consumido = false
    await cambiarHueco(plan, fecha, momento, final)
    aviso('Menú actualizado')
    onCerrar()
  }

  return (
    <Hoja titulo={`${momento === 'comida' ? '☀️ Comida' : '🌙 Cena'} del ${etiquetaDia(fecha)}`} onCerrar={onCerrar}>
      <div className="space-y-5">
        <Campo grupo etiqueta="¿De dónde sale?">
          <Selector
            opciones={[
              { valor: 'nuevo', texto: '🆕 Nuevo' },
              { valor: 'tupper-existente', texto: '🥡 Tupper' },
              { valor: 'fuera', texto: '🍴 Fuera' },
            ]}
            valor={h.origen}
            onCambio={(origen) =>
              cambiar({ origen, recetaId: origen === 'nuevo' ? h.recetaId : null, tupperId: origen === 'tupper-existente' ? h.tupperId : null, plato: origen === 'fuera' && !h.plato ? (momento === 'comida' ? 'Como fuera' : 'Ceno fuera') : h.plato })
            }
          />
        </Campo>
        {h.origen === 'tupper-existente' && (
          <Campo grupo etiqueta="¿Qué tupper?">
            {!tuppers?.length ? (
              <p className="text-sm text-suave">No tienes tuppers guardados en Mi cocina.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tuppers.map((t) => {
                  const libres = racionesLibres(t, res)
                  const elegido = h.tupperId === t.id
                  return (
                    <button
                      key={t.id}
                      disabled={!libres && !elegido}
                      onClick={() => cambiar({ tupperId: t.id, plato: t.plato, tupperExistente: `${t.plato} (preparado ${t.preparadoEl})` })}
                      className={`rounded-2xl px-3 py-2 text-left text-sm font-semibold disabled:opacity-40 ${elegido ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900'}`}
                    >
                      🥡 {t.plato}
                      <span className="block text-xs font-normal">
                        {t.zona === 'congelador' ? '❄️' : '🧊'} {libres} {libres === 1 ? 'libre' : 'libres'} de {t.raciones}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Campo>
        )}
        <Campo etiqueta="Plato">
          <input className={claseEntrada} value={h.plato} onChange={(e) => cambiar({ plato: e.target.value })} placeholder="Ej.: ensalada de pasta" />
        </Campo>
        <label className="flex items-center gap-3 rounded-2xl bg-tarjeta p-4 ring-1 ring-black/5">
          <input type="checkbox" className="size-6 accent-tomate" checked={h.paraLlevar} onChange={(e) => cambiar({ paraLlevar: e.target.checked })} />
          <span className="font-semibold">🎒 Para llevar (uni)</span>
        </label>
        <Campo etiqueta="Nota (opcional)">
          <input className={claseEntrada} value={h.nota ?? ''} onChange={(e) => cambiar({ nota: e.target.value || null })} />
        </Campo>
        <BotonPrincipal onClick={guardar}>Guardar</BotonPrincipal>
        {actual.origen === 'nuevo' && actual.plato && <GuardarTupper plan={plan} plato={actual.plato} recetaId={actual.recetaId} />}
      </div>
    </Hoja>
  )
}
