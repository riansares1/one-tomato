import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useAjustes } from '../../datos/ajustes'
import { db } from '../../datos/db'
import { caducidadTupper, categoria, ESTILO_URGENCIA, urgencia } from '../../logica/caducidad'
import { diasEntre, hoy, relativa } from '../../logica/fechas'

export default function Inicio() {
  const ajustes = useAjustes()
  const productos = useLiveQuery(() => db.productos.toArray(), [])
  const tuppers = useLiveQuery(() => db.tuppers.toArray(), [])
  if (!productos || !tuppers) return null

  // Lo que caduca en 3 días o menos (o ya ha caducado)
  const pronto = [
    ...productos.map((p) => ({ id: p.id, nombre: p.nombre, emoji: categoria(p.categoria).emoji, cad: p.caducidad, zona: p.zona as string })),
    ...tuppers.map((t) => ({ id: t.id, nombre: `Tupper de ${t.plato}`, emoji: '🥡', cad: caducidadTupper(t, ajustes.duraciones), zona: 'tuppers' })),
  ]
    .filter((x) => ['caducado', 'urgente', 'pronto'].includes(urgencia(x.cad)))
    .sort((a, b) => (a.cad ?? '').localeCompare(b.cad ?? ''))

  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const sinCopiaReciente = !ajustes.ultimaCopia || diasEntre(ajustes.ultimaCopia, hoy()) > 14
  const hayDatos = productos.length + tuppers.length > 0

  return (
    <div className="space-y-5">
      <div>
        <p className="text-suave first-letter:uppercase">{fecha}</p>
        <h1 className="text-3xl font-bold">¡Hola! 🍅</h1>
      </div>

      <section className="rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5">
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
                    <span className={`text-sm font-semibold ${ESTILO_URGENCIA[u].texto}`}>
                      {u === 'caducado' ? 'caducado' : relativa(x.cad!)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Link to="/cocina" className="flex items-center gap-4 rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5 active:scale-[0.99]">
        <span className="text-4xl">🥫</span>
        <span>
          <span className="block text-lg font-bold">Mi cocina</span>
          <span className="text-suave">
            {productos.length} productos · {tuppers.length} tuppers
          </span>
        </span>
      </Link>

      <div className="rounded-3xl border-2 border-dashed border-stone-300 p-5 text-center text-suave">
        📅 Planificar la semana llega en la fase 3
      </div>

      {sinCopiaReciente && hayDatos && (
        <Link to="/ajustes" className="block rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          💾 {ajustes.ultimaCopia ? 'Hace tiempo que no guardas una copia de seguridad.' : 'Aún no has guardado ninguna copia de seguridad.'}{' '}
          <b>Hazla en Ajustes.</b>
        </Link>
      )}
    </div>
  )
}
