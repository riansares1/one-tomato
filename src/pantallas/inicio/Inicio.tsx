import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { ChefHat } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { useAjustes } from '../../datos/ajustes'
import { db } from '../../datos/db'
import { caducidadTupper, categoria, ESTILO_URGENCIA, urgencia } from '../../logica/caducidad'
import { diasEntre, hoy, relativa, sumarDias } from '../../logica/fechas'
import { comidasDelDia, etiquetaDia, usePlanActual } from '../../logica/plan'
import BotonComido from '../semana/BotonComido'
import LoHeCocinado from '../semana/LoHeCocinado'
import type { PlanSemanal } from '../../datos/tipos'
import { useState } from 'react'
import { valorar } from '../../logica/recetas'

const tarjeta = 'rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5'

export default function Inicio() {
  const ajustes = useAjustes()
  const aviso = useAviso()
  const plan = usePlanActual()
  const [cocinando, setCocinando] = useState<Cocinando | null>(null)
  const productos = useLiveQuery(() => db.productos.toArray(), [])
  const tuppers = useLiveQuery(() => db.tuppers.toArray(), [])
  const pendientes = useLiveQuery(() => db.recetas.where('estado').equals('quiero-probar').filter((r) => !!r.probadaEl).toArray(), [])
  if (!productos || !tuppers || plan === undefined) return null

  const h = hoy()
  const manana = sumarDias(h, 1)

  // Lo que caduca en 3 días o menos (o ya ha caducado)
  const pronto = [
    ...productos.map((p) => ({ id: p.id, nombre: p.nombre, emoji: categoria(p.categoria).emoji, cad: p.caducidad, zona: p.zona as string })),
    ...tuppers.map((t) => ({ id: t.id, nombre: `Tupper de ${t.plato}`, emoji: '🥡', cad: caducidadTupper(t, ajustes.duraciones), zona: 'tuppers' })),
  ]
    .filter((x) => ['caducado', 'urgente', 'pronto'].includes(urgencia(x.cad)))
    .sort((a, b) => (a.cad ?? '').localeCompare(b.cad ?? ''))

  // Tuppers del congelador que toca pasar a la nevera (hoy, mañana o atrasados)
  const descongelar = tuppers.filter((t) => t.zona === 'congelador' && t.pasarANeveraEl && t.pasarANeveraEl <= manana)
  const avisosIA = (plan?.menu.avisos ?? []).filter((a) => a.fecha === h)

  const planVigente = plan && plan.hasta >= h ? plan : null
  const tocaCocinar = !!planVigente?.menu.diaCocina && !planVigente.sesion.completadaEl && planVigente.menu.diaCocina <= h && planVigente.menu.sesionCocina.pasos.length > 0
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const sinCopiaReciente = !ajustes.ultimaCopia || diasEntre(ajustes.ultimaCopia, h) > 30
  const hayDatos = productos.length + tuppers.length > 0

  async function pasarANevera(id: string, plato: string) {
    await db.tuppers.update(id, { zona: 'nevera', enNeveraDesde: hoy() })
    aviso(`«${plato}» en la nevera para descongelar`)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-suave first-letter:uppercase">{fecha}</p>
        <h1 className="text-3xl font-bold">¡Hola! 🍅</h1>
      </div>

      {tocaCocinar && (
        <Link to="/cocinar" className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-tomate to-orange-400 p-5 text-white shadow-md">
          <ChefHat size={36} />
          <span>
            <span className="block text-lg font-bold">¡Hoy toca cocinar!</span>
            <span className="text-white/90">Abre la sesión de cocina con los pasos</span>
          </span>
        </Link>
      )}

      {(descongelar.length > 0 || avisosIA.length > 0) && (
        <section className="space-y-2 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-200">
          <h2 className="font-bold text-sky-900">❄️ Del congelador a la nevera</h2>
          {descongelar.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="flex-1 text-sky-900">
                <b>{t.plato}</b> {t.pasarANeveraEl! < h ? '(¡atrasado!)' : t.pasarANeveraEl === h ? 'hoy' : 'mañana'}
              </span>
              <button onClick={() => pasarANevera(t.id, t.plato)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-sky-900 ring-1 ring-sky-200">
                Hecho
              </button>
            </div>
          ))}
          {avisosIA.map((a, i) => (
            <p key={i} className="text-sky-900">
              • {a.texto}
            </p>
          ))}
        </section>
      )}

      {planVigente ? (
        <section className={tarjeta}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">🍽️ Qué como</h2>
            <Link to="/semana" className="text-sm font-semibold text-tomate">
              Ver semana
            </Link>
          </div>
          {planVigente.desde > manana ? (
            <p className="text-suave">Tu menú empieza el {etiquetaDia(planVigente.desde)}.</p>
          ) : (
            <>
              <Dia titulo="Hoy" fecha={h} plan={planVigente} onCocinar={setCocinando} />
              <div className="my-3 border-t border-stone-100" />
              <Dia titulo="Mañana" fecha={manana} plan={planVigente} onCocinar={setCocinando} />
            </>
          )}
          {!planVigente.sesion.completadaEl && planVigente.menu.diaCocina === manana && (
            <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm text-orange-900">👩‍🍳 Mañana toca cocinar. ¿Tienes ya la compra hecha?</p>
          )}
        </section>
      ) : (
        <Link to="/semana" className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-tomate to-orange-400 p-5 text-white shadow-md">
          <span className="text-4xl">📅</span>
          <span>
            <span className="block text-lg font-bold">Planificar la semana</span>
            <span className="text-white/90">{plan ? 'Tu menú anterior ya terminó' : 'Responde unas preguntas y prepara tu menú'}</span>
          </span>
        </Link>
      )}

      {pendientes?.map((r) => (
        <div key={r.id} className="rounded-3xl bg-orange-50 p-4 ring-1 ring-orange-200">
          <p className="font-semibold">¿Qué tal te salió «{r.nombre}»?</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => valorar(r, true).then(() => aviso('¡A favoritas! ⭐'))} className="min-h-12 flex-1 rounded-2xl bg-tomate font-semibold text-white">
              😋 Me gustó
            </button>
            <button onClick={() => valorar(r, false).then(() => aviso('Archivada'))} className="min-h-12 flex-1 rounded-2xl bg-tarjeta font-semibold ring-1 ring-black/5">
              😕 No me convenció
            </button>
          </div>
        </div>
      ))}

      <section className={tarjeta}>
        <h2 className="mb-3 text-lg font-bold">⏰ Caduca pronto</h2>
        {pronto.length === 0 ? (
          <p className="text-suave">{hayDatos ? 'Nada caduca en los próximos 3 días. ¡Bien!' : 'Añade lo que tienes en tu cocina y aquí verás lo que hay que gastar primero.'}</p>
        ) : (
          <ul className="space-y-2">
            {pronto.map((x) => {
              const u = urgencia(x.cad)
              return (
                <li key={x.id}>
                  <Link to={`/cocina?zona=${x.zona}`} className={`flex items-center gap-3 rounded-2xl p-3 ${ESTILO_URGENCIA[u].fondo}`}>
                    <span className="text-2xl">{x.emoji}</span>
                    <span className="flex-1 truncate font-medium">{x.nombre}</span>
                    <span className={`text-sm font-semibold ${ESTILO_URGENCIA[u].texto}`}>{u === 'caducado' ? 'caducado' : relativa(x.cad!)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Link to="/cocina" className={`flex items-center gap-4 ${tarjeta} active:scale-[0.99]`}>
        <span className="text-4xl">🥫</span>
        <span>
          <span className="block text-lg font-bold">Mi cocina</span>
          <span className="text-suave">
            {productos.length} productos · {tuppers.length} tuppers
          </span>
        </span>
      </Link>

      {sinCopiaReciente && hayDatos && (
        <Link to="/ajustes" className="block rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          💾 {ajustes.ultimaCopia ? 'Hace más de un mes que no guardas una copia de seguridad.' : 'Aún no has guardado ninguna copia de seguridad.'} <b>Hazla en Ajustes</b> (te lleva 10 segundos).
        </Link>
      )}
      {cocinando && planVigente && <LoHeCocinado plan={planVigente} {...cocinando} onCerrar={() => setCocinando(null)} />}
    </div>
  )
}

type Cocinando = { plato: string; recetaId?: string | null; fecha: string; momento: 'comida' | 'cena' }

function Dia({ titulo, fecha, plan, onCocinar }: { titulo: string; fecha: string; plan: PlanSemanal; onCocinar: (c: Cocinando) => void }) {
  const dia = comidasDelDia(plan, fecha)
  if (!dia) return <p className="text-suave">{titulo}: no está en el menú.</p>
  const fila = (emoji: string, momento: 'comida' | 'cena') => {
    const h = dia[momento]
    return (
      <div className="flex gap-2 py-0.5">
        <span>{emoji}</span>
        <span className={`flex-1 ${h.plato ? '' : 'text-suave italic'} ${h.consumido ? 'text-suave' : ''}`}>
          {h.plato || 'Sin decidir'}
          {h.origen === 'tupper-existente' && <span className="text-sm text-emerald-700"> · 🥡 tupper</span>}
          {h.tupperId && h.origen === 'nuevo' && <span className="text-sm text-emerald-700"> · 🥡 en tupper</span>}
          {h.paraLlevar && <span className="text-sm text-violet-700"> · 🎒 para llevar</span>}
        </span>
        <BotonComido planId={plan.id} fecha={fecha} momento={momento} hueco={h} onCocinar={() => onCocinar({ plato: h.plato, recetaId: h.recetaId, fecha, momento })} />
      </div>
    )
  }
  return (
    <div>
      <p className="mb-1 text-sm font-bold tracking-wide text-suave uppercase">{titulo}</p>
      {fila('☀️', 'comida')}
      {fila('🌙', 'cena')}
    </div>
  )
}
