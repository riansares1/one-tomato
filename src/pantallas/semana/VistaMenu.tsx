import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { ChefHat } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, BotonSecundario } from '../../componentes/Campos'
import { db } from '../../datos/db'
import type { PlanSemanal, Tupper } from '../../datos/tipos'
import type { HuecoMenu, RecetaIA } from '../../ia/esquema'
import { fechaCorta, hoy } from '../../logica/fechas'
import { avisosDeHoy, etiquetaDia } from '../../logica/plan'
import { guardarComoFavorita } from '../../logica/recetas'
import DetalleReceta from '../recetas/DetalleReceta'
import EditarHueco from './EditarHueco'
import GuardarTupper from './GuardarTupper'

type Momento = 'comida' | 'cena'

export default function VistaMenu({ plan, onNuevaSemana, onPegarOtro }: { plan: PlanSemanal; onNuevaSemana: () => void; onPegarOtro: () => void }) {
  const aviso = useAviso()
  const misTuppers = useLiveQuery(() => db.tuppers.toArray(), [])
  const congelados = misTuppers?.filter((t) => t.zona === 'congelador')
  const [receta, setReceta] = useState<{ receta: RecetaIA; fecha?: string; momento?: Momento } | null>(null)
  const [editando, setEditando] = useState<{ fecha: string; momento: Momento } | null>(null)
  const { menu } = plan
  const h = hoy()
  const avisos = avisosDeHoy(plan, congelados ?? [])
  const sesionHecha = !!plan.sesion.completadaEl

  function tocar(fecha: string, momento: Momento, hueco: HuecoMenu) {
    const r = hueco.recetaId ? menu.recetas.find((x) => x.id === hueco.recetaId) : undefined
    if (r) setReceta({ receta: r, fecha, momento })
    else setEditando({ fecha, momento })
  }

  return (
    <div className="space-y-4">
      {/* Cabecera de la semana */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-tomate to-orange-400 p-5 text-white shadow-md">
        <p className="text-sm font-semibold text-white/80">Tu semana</p>
        <h2 className="text-2xl font-bold">
          Del {fechaCorta(menu.semana.desde)} al {fechaCorta(menu.semana.hasta)}
        </h2>
        <p className="mt-1 text-white/90">
          👩‍🍳 Cocinas el {etiquetaDia(menu.diaCocina)}
          {menu.sesionCocina.duracionTotalMin ? ` · unos ${menu.sesionCocina.duracionTotalMin} min` : ''}
        </p>
        {sesionHecha ? (
          <p className="mt-3 rounded-2xl bg-white/20 px-4 py-3 font-semibold">✅ Sesión de cocina hecha el {fechaCorta(plan.sesion.completadaEl!)}</p>
        ) : (
          <Link to="/cocinar" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-tomate shadow-sm">
            <ChefHat size={20} /> Empezar sesión de cocina
          </Link>
        )}
      </section>

      {avisos.map((a, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 text-sky-900 ring-1 ring-sky-200">
          <span className="text-2xl">❄️</span>
          <span>
            <b>Hoy:</b> {a}
          </span>
        </div>
      ))}

      {/* Días */}
      {menu.menu.map((dia) => {
        const esHoy = dia.fecha === h
        const pasado = dia.fecha < h
        return (
          <section key={dia.fecha} className={`rounded-3xl bg-tarjeta p-4 shadow-sm ring-1 ${esHoy ? 'ring-2 ring-tomate' : 'ring-black/5'} ${pasado ? 'opacity-55' : ''}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-lg font-bold capitalize">{etiquetaDia(dia.fecha)}</h3>
              {esHoy && <span className="rounded-full bg-tomate px-3 py-0.5 text-xs font-bold text-white">HOY</span>}
              {dia.fecha === menu.diaCocina && !esHoy && <span className="text-sm">👩‍🍳 día de cocina</span>}
            </div>
            <div className="space-y-2">
              {(['comida', 'cena'] as const).map((m) => (
                <TarjetaHueco key={m} momento={m} hueco={dia[m]} fecha={dia.fecha} plan={plan} reales={misTuppers ?? []} onTocar={() => tocar(dia.fecha, m, dia[m])} />
              ))}
            </div>
          </section>
        )
      })}

      {menu.recetas.length > 0 && (
        <section className="rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-3 text-lg font-bold">📖 Recetas de la semana</h3>
          <div className="flex flex-wrap gap-2">
            {menu.recetas.map((r) => (
              <button key={r.id} onClick={() => setReceta({ receta: r })} className="rounded-full bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900">
                {r.esRecetaAProbar ? '🆕 ' : ''}
                {r.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3 pt-2">
        <BotonSecundario onClick={onPegarOtro}>📋 Pegar un menú corregido</BotonSecundario>
        <BotonPrincipal onClick={onNuevaSemana}>📅 Planificar otra semana</BotonPrincipal>
      </div>

      {receta && (
        <DetalleReceta
          nombre={receta.receta.nombre}
          raciones={receta.receta.raciones}
          tiempoMin={receta.receta.tiempoMin}
          ingredientes={receta.receta.ingredientes}
          pasos={receta.receta.pasos}
          enlace={receta.receta.enlaceOrigen}
          onCerrar={() => setReceta(null)}
          arriba={<GuardarTupper plan={plan} plato={receta.receta.nombre} recetaId={receta.receta.id} />}
        >
          <BotonPrincipal
            onClick={async () => {
              const nueva = await guardarComoFavorita(receta.receta)
              aviso(nueva ? '⭐ Guardada en favoritas' : 'Ya estaba en favoritas')
            }}
          >
            ⭐ Guardar como favorita
          </BotonPrincipal>
          {receta.fecha && receta.momento && (
            <BotonSecundario
              onClick={() => {
                setEditando({ fecha: receta.fecha!, momento: receta.momento! })
                setReceta(null)
              }}
            >
              ✏️ Cambiar este plato
            </BotonSecundario>
          )}
        </DetalleReceta>
      )}
      {editando && <EditarHueco plan={plan} {...editando} onCerrar={() => setEditando(null)} />}
    </div>
  )
}

function TarjetaHueco({ momento, hueco, fecha, plan, reales, onTocar }: { momento: Momento; hueco: HuecoMenu; fecha: string; plan: PlanSemanal; reales: Tupper[]; onTocar: () => void }) {
  // ¿De qué tupper sale y dónde está guardado? Si ya hay un tupper real reservado, manda ese
  const real = hueco.tupperId ? reales.find((t) => t.id === hueco.tupperId) : undefined
  const propuesto = hueco.recetaId ? plan.menu.tuppersResultantes.find((t) => t.recetaId === hueco.recetaId && (t.paraComerEl === fecha || !t.paraComerEl)) : undefined
  const tupper = real ?? (hueco.tupperId ? undefined : propuesto)
  const vacio = !hueco.plato

  const origen =
    hueco.origen === 'fuera'
      ? { texto: 'Fuera de casa', emoji: '🍴', clase: 'bg-stone-100 text-stone-700' }
      : hueco.origen === 'tupper-existente'
        ? { texto: 'Tupper que ya tienes', emoji: '🥡', clase: 'bg-emerald-100 text-emerald-800' }
        : { texto: 'Se cocina nuevo', emoji: '🆕', clase: 'bg-orange-100 text-orange-800' }

  return (
    <button onClick={onTocar} className="flex w-full items-start gap-3 rounded-2xl bg-fondo p-3 text-left active:scale-[0.99]">
      <span className="mt-0.5 text-2xl">{momento === 'comida' ? '☀️' : '🌙'}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wide text-suave uppercase">{momento}</span>
        <span className={`block font-semibold leading-snug ${vacio ? 'text-suave italic' : ''}`}>{vacio ? 'Sin decidir · toca para añadir' : hueco.plato}</span>
        {!vacio && (
          <span className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${origen.clase}`}>
              {origen.emoji} {origen.texto}
            </span>
            {tupper && (
              <span className={`rounded-full px-2 py-0.5 ${tupper.zona === 'congelador' ? 'bg-sky-100 text-sky-800' : 'bg-teal-50 text-teal-800'}`}>
                {tupper.zona === 'congelador' ? '❄️ Congelador' : '🧊 Nevera'}
              </span>
            )}
            {hueco.paraLlevar && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">🎒 Para llevar</span>}
            {hueco.consumido ? (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">✓ Comido</span>
            ) : (
              real && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">🥡 Reservado</span>
            )}
          </span>
        )}
        {tupper?.zona === 'congelador' && tupper.pasarANeveraEl && <span className="mt-1 block text-xs text-sky-800">Pásalo a la nevera el {fechaCorta(tupper.pasarANeveraEl)}</span>}
        {hueco.tupperExistente && <span className="mt-1 block text-xs text-suave">{hueco.tupperExistente}</span>}
        {hueco.nota && <span className="mt-1 block text-xs text-suave">{hueco.nota}</span>}
      </span>
    </button>
  )
}
