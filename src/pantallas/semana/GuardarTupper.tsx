import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { db } from '../../datos/db'
import type { PlanSemanal, Tupper } from '../../datos/tipos'
import { fechaCorta } from '../../logica/fechas'
import { guardarTupperDeReceta, tupperPropuesto } from '../../logica/sesion'
import { nuevoTupper } from '../../logica/tuppers'

// Mientras cocinas: mete en la nevera o el congelador lo que vas terminando
export default function GuardarTupper({ plan, plato, recetaId }: { plan: PlanSemanal; plato: string; recetaId?: string | null }) {
  const aviso = useAviso()
  const [raciones, setRaciones] = useState(1)
  const guardadosDelPlato = useLiveQuery(
    () => db.tuppers.filter((t) => t.planId === plan.id && (recetaId ? t.recetaId === recetaId : t.plato === plato)).toArray(),
    [plan.id, recetaId, plato],
  )

  const guardados = new Set(plan.sesion.tuppersGuardados ?? [])
  const propuestos = plan.menu.tuppersResultantes.map((t, i) => ({ t, i })).filter(({ t }) => recetaId && t.recetaId === recetaId)
  const receta = plan.menu.recetas.find((r) => r.id === recetaId)
  const restaPendiente = !!receta?.ingredientes.some((i) => i.deInventario) && !(plan.sesion.recetasDescontadas ?? []).includes(receta.id) && !plan.sesion.completadaEl

  async function guardar(tupper: Tupper, indice?: number) {
    const { restados } = await guardarTupperDeReceta(plan.id, tupper, indice)
    const donde = tupper.zona === 'nevera' ? 'en la nevera 🧊' : 'en el congelador ❄️'
    aviso(`Tupper guardado ${donde}${restados.length ? ` · restado: ${restados.join(', ')}` : ''}`)
  }

  const otro = (zona: Tupper['zona']) =>
    guardar(nuevoTupper({ plato: receta?.nombre ?? plato, raciones, zona, estado: 'listo', planId: plan.id, recetaId: recetaId ?? undefined }))

  return (
    <section className="space-y-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-200">
      <h3 className="font-bold">🥡 Guardar en tuppers</h3>

      {propuestos.map(({ t, i }) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3">
          <span className="flex-1 text-sm">
            <b>{t.zona === 'nevera' ? '🧊 Nevera' : '❄️ Congelador'}</b> · {t.raciones} {t.raciones === 1 ? 'ración' : 'raciones'}
            {t.paraComerEl && <span className="block text-xs text-suave">para el {fechaCorta(t.paraComerEl)}</span>}
          </span>
          {guardados.has(i) ? (
            <span className="text-sm font-semibold text-emerald-700">✓ Guardado</span>
          ) : (
            <button onClick={() => guardar(tupperPropuesto(plan, i), i)} className="rounded-xl bg-tomate px-3 py-2 text-sm font-semibold text-white">
              Guardar
            </button>
          )}
        </div>
      ))}

      <div className="space-y-2 rounded-xl bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-semibold">{propuestos.length ? 'Otro tupper' : 'Nuevo tupper'}</span>
          <button onClick={() => setRaciones((r) => Math.max(1, r - 1))} className="rounded-lg bg-stone-100 p-2" aria-label="Menos raciones">
            <Minus size={16} />
          </button>
          <span className="w-16 text-center text-sm font-bold">
            {raciones} {raciones === 1 ? 'ración' : 'rac.'}
          </span>
          <button onClick={() => setRaciones((r) => r + 1)} className="rounded-lg bg-stone-100 p-2" aria-label="Más raciones">
            <Plus size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => otro('nevera')} className="min-h-11 rounded-xl bg-teal-50 font-semibold text-teal-900 ring-1 ring-teal-200">
            🧊 A la nevera
          </button>
          <button onClick={() => otro('congelador')} className="min-h-11 rounded-xl bg-sky-50 font-semibold text-sky-900 ring-1 ring-sky-200">
            ❄️ Al congelador
          </button>
        </div>
      </div>

      {!!guardadosDelPlato?.length && (
        <p className="text-sm text-emerald-800">
          Ya en tu cocina: {guardadosDelPlato.map((t) => `${t.raciones} rac. en ${t.zona}`).join(' · ')}
        </p>
      )}
      {restaPendiente && <p className="text-xs text-suave">Al guardar el primer tupper se restan de tu inventario los ingredientes de esta receta que tenías en casa.</p>}
    </section>
  )
}
