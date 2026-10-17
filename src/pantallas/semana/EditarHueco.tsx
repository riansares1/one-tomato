import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import { db } from '../../datos/db'
import type { PlanSemanal } from '../../datos/tipos'
import type { HuecoMenu } from '../../ia/esquema'
import { cambiarHueco, etiquetaDia, huecoVacio } from '../../logica/plan'

// Cambiar a mano lo que comes en un momento del día
export default function EditarHueco({ plan, fecha, momento, onCerrar }: { plan: PlanSemanal; fecha: string; momento: 'comida' | 'cena'; onCerrar: () => void }) {
  const aviso = useAviso()
  const tuppers = useLiveQuery(() => db.tuppers.toArray(), [])
  const actual = plan.menu.menu.find((d) => d.fecha === fecha)?.[momento] ?? huecoVacio()
  const [h, setH] = useState<HuecoMenu>(actual)
  const cambiar = (c: Partial<HuecoMenu>) => setH((x) => ({ ...x, ...c }))

  async function guardar() {
    await cambiarHueco(plan, fecha, momento, { ...h, plato: h.plato.trim() })
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
            onCambio={(origen) => cambiar({ origen, recetaId: origen === 'nuevo' ? h.recetaId : null })}
          />
        </Campo>
        {h.origen === 'tupper-existente' && !!tuppers?.length && (
          <div className="flex flex-wrap gap-2">
            {tuppers.map((t) => (
              <button
                key={t.id}
                onClick={() => cambiar({ plato: t.plato, tupperExistente: `${t.plato} (preparado ${t.preparadoEl})` })}
                className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
              >
                🥡 {t.plato}
              </button>
            ))}
          </div>
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
      </div>
    </Hoja>
  )
}
