import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { Check, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, BotonSecundario, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import Vacio from '../../componentes/Vacio'
import { db } from '../../datos/db'
import type { EstadoSesion, PlanSemanal, Tupper } from '../../datos/tipos'
import { fechaCorta } from '../../logica/fechas'
import { mostrarNumero } from '../../logica/numeros'
import { usePlanActual } from '../../logica/plan'
import { calcularRestas, terminarSesion, tuppersPendientes, type Resta } from '../../logica/sesion'

// ---- Sonido de alarma (Web Audio; se activa al tocar el primer "Empezar") ----
let audio: AudioContext | null = null
function prepararSonido() {
  audio ??= new AudioContext()
  if (audio.state === 'suspended') audio.resume()
}
function pitar() {
  if (!audio) return
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator()
    const vol = audio.createGain()
    osc.frequency.value = 880
    vol.gain.value = 0.25
    osc.connect(vol).connect(audio.destination)
    const t = audio.currentTime + i * 0.35
    osc.start(t)
    osc.stop(t + 0.2)
  }
}

const formatoTiempo = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Mantiene la pantalla encendida mientras cocinas (si el iPhone lo permite)
function usePantallaEncendida() {
  useEffect(() => {
    let bloqueo: WakeLockSentinel | null = null
    const pedir = () => navigator.wakeLock?.request('screen').then((b) => (bloqueo = b)).catch(() => {})
    pedir()
    const alVolver = () => document.visibilityState === 'visible' && pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      bloqueo?.release()
    }
  }, [])
}

export default function Sesion() {
  const plan = usePlanActual()
  usePantallaEncendida()
  if (plan === undefined) return null
  if (!plan) return <Vacio emoji="👩‍🍳" texto="No hay ningún menú todavía." detalle="Planifica la semana en la pestaña Semana y aquí tendrás los pasos para cocinar." />
  return <PasosSesion plan={plan} />
}

function PasosSesion({ plan }: { plan: PlanSemanal }) {
  const pasos = [...plan.menu.sesionCocina.pasos].sort((a, b) => a.orden - b.orden)
  const sesion = plan.sesion
  const [ahora, setAhora] = useState(() => Date.now())
  const [terminando, setTerminando] = useState(false)
  const yaSonaron = useRef(new Set<number>())
  const hechos = new Set(sesion.pasosHechos)
  const nombreReceta = (id: string | null) => plan.menu.recetas.find((r) => r.id === id)?.nombre

  const guardar = (s: Partial<EstadoSesion>) => db.planes.update(plan.id, { sesion: { ...sesion, ...s } })

  // Un "tic" por segundo mientras haya temporizadores en marcha
  const enMarcha = Object.entries(sesion.temporizadores).filter(([, t]) => t.fin)
  useEffect(() => {
    if (!enMarcha.length) return
    const i = window.setInterval(() => setAhora(Date.now()), 500)
    return () => window.clearInterval(i)
  }, [enMarcha.length])

  // Pitar cuando un temporizador llega a cero
  useEffect(() => {
    for (const [orden, t] of enMarcha) {
      if (t.fin && t.fin <= ahora && !yaSonaron.current.has(Number(orden))) {
        yaSonaron.current.add(Number(orden))
        pitar()
      }
    }
  })

  function empezar(orden: number, minutos: number) {
    prepararSonido()
    const t = sesion.temporizadores[orden]
    const restante = t?.restante ?? minutos * 60_000
    yaSonaron.current.delete(orden)
    setAhora(Date.now())
    guardar({ temporizadores: { ...sesion.temporizadores, [orden]: { fin: Date.now() + restante } } })
  }
  function pausar(orden: number) {
    const t = sesion.temporizadores[orden]
    if (!t?.fin) return
    guardar({ temporizadores: { ...sesion.temporizadores, [orden]: { restante: Math.max(0, t.fin - Date.now()) } } })
  }
  function reiniciar(orden: number) {
    const resto = { ...sesion.temporizadores }
    delete resto[orden]
    yaSonaron.current.delete(orden)
    guardar({ temporizadores: resto })
  }
  function marcar(orden: number) {
    const nuevos = hechos.has(orden) ? sesion.pasosHechos.filter((o) => o !== orden) : [...sesion.pasosHechos, orden]
    const temporizadores = { ...sesion.temporizadores }
    if (!hechos.has(orden)) delete temporizadores[orden] // al terminar un paso, su temporizador se para
    guardar({ pasosHechos: nuevos, temporizadores })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5">
        <p className="font-semibold">
          {hechos.size} de {pasos.length} pasos
          {plan.menu.sesionCocina.duracionTotalMin ? <span className="text-suave"> · unos {plan.menu.sesionCocina.duracionTotalMin} min en total</span> : null}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-tomate transition-all" style={{ width: `${pasos.length ? (hechos.size / pasos.length) * 100 : 0}%` }} />
        </div>
        <p className="mt-2 text-xs text-suave">La pantalla se mantiene encendida. Los temporizadores suenan con la app abierta: sube el volumen.</p>
      </section>

      {pasos.length === 0 && (
        <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">Este menú no tiene pasos de cocina. Cocina a tu aire y, al terminar, pulsa «He terminado» para crear los tuppers.</p>
      )}

      <ol className="space-y-2.5">
        {pasos.map((p) => {
          const hecho = hechos.has(p.orden)
          const t = sesion.temporizadores[p.orden]
          const restante = t?.fin ? t.fin - ahora : (t?.restante ?? (p.minutos ?? 0) * 60_000)
          const sonando = !!t?.fin && restante <= 0
          const receta = nombreReceta(p.recetaId)
          return (
            <li key={p.orden} className={`rounded-2xl p-4 shadow-sm ring-1 transition ${sonando ? 'animate-pulse bg-red-50 ring-red-300' : hecho ? 'bg-stone-100 ring-black/5' : 'bg-tarjeta ring-black/5'}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => marcar(p.orden)}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-bold ${hecho ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-tomate text-tomate'}`}
                  aria-label={hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {hecho ? <Check size={20} strokeWidth={3} /> : p.orden}
                </button>
                <div className={`flex-1 ${hecho ? 'text-suave line-through' : ''}`}>
                  <p className="leading-snug">{p.texto}</p>
                  {receta && <p className="mt-1 text-xs font-semibold text-orange-800">{receta}</p>}
                </div>
              </div>
              {!!p.minutos && !hecho && (
                <div className="mt-3 flex items-center gap-2 pl-12">
                  <span className={`min-w-16 text-2xl font-bold tabular-nums ${sonando ? 'text-red-600' : t?.fin ? 'text-tomate' : ''}`}>{sonando ? '¡Ya!' : formatoTiempo(restante)}</span>
                  {sonando ? (
                    <button onClick={() => marcar(p.orden)} className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 font-semibold text-white">
                      Hecho
                    </button>
                  ) : t?.fin ? (
                    <button onClick={() => pausar(p.orden)} className="flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-2.5 font-semibold">
                      <Pause size={18} /> Pausar
                    </button>
                  ) : (
                    <button onClick={() => empezar(p.orden, p.minutos!)} className="flex items-center gap-1 rounded-xl bg-tomate px-3 py-2.5 font-semibold text-white">
                      <Play size={18} /> {t?.restante != null ? 'Seguir' : 'Empezar'}
                    </button>
                  )}
                  {t && (
                    <button onClick={() => reiniciar(p.orden)} className="rounded-xl bg-stone-100 p-2.5" aria-label="Reiniciar temporizador">
                      <RotateCcw size={18} />
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {sesion.completadaEl ? (
        <div className="rounded-2xl bg-emerald-50 p-4 text-center text-emerald-800">
          ✅ Sesión registrada el {fechaCorta(sesion.completadaEl)}: tuppers creados e inventario actualizado.{' '}
          <Link to="/cocina?zona=tuppers" className="font-semibold underline">
            Ver tuppers
          </Link>
        </div>
      ) : (
        <BotonPrincipal onClick={() => setTerminando(true)}>🎉 He terminado</BotonPrincipal>
      )}

      {terminando && <Terminar plan={plan} onCerrar={() => setTerminando(false)} />}
    </div>
  )
}

// Resumen final: tuppers que se crean y lo que se resta del inventario
function Terminar({ plan, onCerrar }: { plan: PlanSemanal; onCerrar: () => void }) {
  const aviso = useAviso()
  const navegar = useNavigate()
  const productos = useLiveQuery(() => db.productos.toArray(), [])
  const [tuppers, setTuppers] = useState<(Tupper & { incluir: boolean })[]>(() => tuppersPendientes(plan).map(({ tupper }) => ({ ...tupper, incluir: true })))
  const yaGuardados = plan.sesion.tuppersGuardados?.length ?? 0
  const [quitadas, setQuitadas] = useState<Set<string>>(new Set())
  if (!productos) return null

  const restas = calcularRestas(plan, productos)
  const cambiarTupper = (n: number, c: Partial<Tupper & { incluir: boolean }>) => setTuppers((ts) => ts.map((t, i) => (i === n ? { ...t, ...c } : t)))

  async function confirmar() {
    const elegidos: Tupper[] = tuppers.filter((t) => t.incluir).map((t) => {
      const copia: Partial<typeof t> = { ...t }
      delete copia.incluir
      return copia as Tupper
    })
    const aRestar = restas.filter((r: Resta) => r.producto && !r.problema && !quitadas.has(r.clave))
    const hecho = await terminarSesion(plan.id, elegidos, aRestar)
    aviso(hecho ? `¡Buen trabajo! ${elegidos.length} tuppers guardados 🥡` : 'Esta sesión ya estaba registrada: no he cambiado nada.')
    onCerrar()
    navegar('/cocina?zona=tuppers')
  }

  return (
    <Hoja titulo="¡A guardar!" onCerrar={onCerrar}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 font-bold">🥡 Tuppers que se crean</h3>
          {yaGuardados > 0 && <p className="mb-2 text-sm text-emerald-700">✓ {yaGuardados} {yaGuardados === 1 ? 'tupper ya guardado' : 'tuppers ya guardados'} desde Semana.</p>}
          {tuppers.length === 0 && <p className="text-sm text-suave">{yaGuardados ? 'No quedan tuppers por guardar.' : 'El menú no indica tuppers. Puedes añadirlos después en Mi cocina.'}</p>}
          <ul className="space-y-2">
            {tuppers.map((t, n) => (
              <li key={t.id} className={`space-y-2 rounded-2xl bg-tarjeta p-3 ring-1 ring-black/5 ${t.incluir ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="size-5 accent-tomate" checked={t.incluir} onChange={(e) => cambiarTupper(n, { incluir: e.target.checked })} />
                  <span className="flex-1 font-semibold">{t.plato}</span>
                  <button onClick={() => cambiarTupper(n, { raciones: Math.max(1, t.raciones - 1) })} className="rounded-lg bg-stone-100 p-1.5" aria-label="Menos raciones">
                    <Minus size={16} />
                  </button>
                  <span className="w-5 text-center font-bold">{t.raciones}</span>
                  <button onClick={() => cambiarTupper(n, { raciones: t.raciones + 1 })} className="rounded-lg bg-stone-100 p-1.5" aria-label="Más raciones">
                    <Plus size={16} />
                  </button>
                </div>
                <Selector
                  opciones={[
                    { valor: 'nevera', texto: '🧊 Nevera' },
                    { valor: 'congelador', texto: '❄️ Congelador' },
                  ]}
                  valor={t.zona}
                  onCambio={(zona) => cambiarTupper(n, { zona })}
                />
                {t.estado === 'casi' && <p className="text-xs text-amber-800">⏳ Casi listo: {t.falta}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-bold">📦 Se resta de tu inventario</h3>
          <p className="mb-2 text-xs text-suave">Aproximado. Desmarca lo que no quieras tocar.</p>
          {restas.length === 0 && <p className="text-sm text-suave">Nada que restar{plan.sesion.recetasDescontadas?.length ? ' (lo de las recetas que ya guardaste se restó entonces)' : ''}.</p>}
          <ul className="space-y-1.5">
            {restas.map((r) => {
              const activa = !r.problema && !quitadas.has(r.clave)
              return (
                <li key={r.clave} className="flex items-start gap-2 rounded-xl bg-tarjeta p-2.5 text-sm ring-1 ring-black/5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-tomate"
                    disabled={!!r.problema}
                    checked={activa}
                    onChange={() =>
                      setQuitadas((q) => {
                        const n = new Set(q)
                        if (n.has(r.clave)) n.delete(r.clave)
                        else n.add(r.clave)
                        return n
                      })
                    }
                  />
                  <span className="flex-1">
                    {r.producto ? (
                      <>
                        <b>{r.producto.nombre}</b>: {mostrarNumero(r.producto.cantidad)} → {r.queda <= 0 ? 'se acaba' : `${mostrarNumero(r.queda)}`} {r.queda > 0 ? r.producto.unidad : ''}
                      </>
                    ) : (
                      <b>{r.ingrediente}</b>
                    )}
                    {r.problema && <span className="block text-xs text-amber-700">{r.problema}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <BotonPrincipal onClick={confirmar}>Guardar tuppers y actualizar</BotonPrincipal>
        <BotonSecundario onClick={onCerrar}>Todavía no</BotonSecundario>
      </div>
    </Hoja>
  )
}
