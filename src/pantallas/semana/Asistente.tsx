import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import { leerAjustes } from '../../datos/ajustes'
import { db } from '../../datos/db'
import type { Ajustes, RespuestasAsistente } from '../../datos/tipos'
import { hoy, sumarDias } from '../../logica/fechas'
import { etiquetaDia, fechasEntre, mayuscula, proximoDiaCocina } from '../../logica/plan'

const TIEMPOS = ['1 hora', '2 horas', '3 horas', 'Más de 3 horas']

interface Props {
  inicial?: RespuestasAsistente // respuestas previas (al volver desde el paso de la IA)
  onPlanificarIA: (r: RespuestasAsistente) => void
  onAMano: (r: RespuestasAsistente) => void
  onCancelar?: () => void
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 font-semibold transition ${activo ? 'bg-tomate text-white shadow-sm' : 'bg-tarjeta text-texto ring-1 ring-black/5'}`}
    >
      {children}
    </button>
  )
}

// Preguntas antes de planificar cada semana, una pantalla por pregunta
export default function Asistente(props: Props) {
  // Esperamos a tener tus ajustes para proponer bien el día de cocina
  const ajustes = useLiveQuery(() => leerAjustes(), [])
  return ajustes ? <Preguntas {...props} ajustes={ajustes} /> : null
}

function Preguntas({ inicial, onPlanificarIA, onAMano, onCancelar, ajustes }: Props & { ajustes: Ajustes }) {
  const aProbar = useLiveQuery(() => db.recetas.where('estado').equals('quiero-probar').toArray(), [])
  const [paso, setPaso] = useState(inicial ? 5 : 0)
  const [r, setR] = useState<RespuestasAsistente>(() => {
    if (inicial) return inicial
    const desde = hoy()
    return { diaCocina: proximoDiaCocina(ajustes.diaCocina), desde, hasta: sumarDias(desde, 6), diasUni: [], fuera: [], tiempo: '2 horas', antojos: '', recetasAProbar: [], notas: '' }
  })
  const cambiar = (c: Partial<RespuestasAsistente>) => setR((x) => ({ ...x, ...c }))
  // Al cambiar las fechas, se descartan los días marcados que quedan fuera
  const cambiarFechas = (desde: string, hasta: string) => {
    if (hasta < desde) hasta = desde
    setR((x) => ({ ...x, desde, hasta, diasUni: x.diasUni.filter((f) => f >= desde && f <= hasta), fuera: x.fuera.filter((f) => f.fecha >= desde && f.fecha <= hasta) }))
  }
  const [diaGuardado, setDiaGuardado] = useState(r.diaCocina ?? proximoDiaCocina(ajustes.diaCocina))
  const dias = fechasEntre(r.desde, r.hasta)
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  function alternarFuera(fecha: string, momento: 'comida' | 'cena') {
    const actual = r.fuera.find((f) => f.fecha === fecha) ?? { fecha, comida: false, cena: false }
    const nuevo = { ...actual, [momento]: !actual[momento] }
    cambiar({ fuera: [...r.fuera.filter((f) => f.fecha !== fecha), nuevo].filter((f) => f.comida || f.cena) })
  }

  const pasos = [
    {
      titulo: '¿Qué días planificamos?',
      contenido: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde">
              <input type="date" className={`${claseEntrada} min-h-12 px-3`} value={r.desde} onChange={(e) => e.target.value && cambiarFechas(e.target.value, r.hasta)} />
            </Campo>
            <Campo etiqueta="Hasta">
              <input type="date" className={`${claseEntrada} min-h-12 px-3`} value={r.hasta} onChange={(e) => e.target.value && cambiarFechas(r.desde, e.target.value)} />
            </Campo>
          </div>
          <p className="-mt-2 text-sm text-suave">
            {dias.length === 1 ? 'Solo un día: comida y cena de ese día.' : `${dias.length} días, del ${etiquetaDia(r.desde)} al ${etiquetaDia(r.hasta)}.`}
          </p>

          <Campo grupo etiqueta="¿Vas a cocinar?">
            <Selector
              opciones={[
                { valor: 'si', texto: '👩‍🍳 Sí, cocino' },
                { valor: 'no', texto: '🥡 No, tiro de tuppers' },
              ]}
              valor={r.diaCocina ? 'si' : 'no'}
              onCambio={(v) => {
                if (v === 'no') setDiaGuardado(r.diaCocina ?? diaGuardado)
                cambiar({ diaCocina: v === 'si' ? diaGuardado : null })
              }}
            />
          </Campo>

          {r.diaCocina ? (
            <>
              <Campo etiqueta="Día de cocina">
                <input type="date" className={`${claseEntrada} min-h-12`} value={r.diaCocina} onChange={(e) => e.target.value && cambiar({ diaCocina: e.target.value })} />
              </Campo>
              {r.diaCocina > r.desde && (
                <p className="-mt-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
                  🥡 Hasta el {etiquetaDia(r.diaCocina)} se tirará de tus tuppers y de lo que haya en casa.
                </p>
              )}
              {r.diaCocina > r.hasta && <p className="-mt-2 text-sm text-amber-700">⚠️ El día de cocina es después de esta semana.</p>}
              <Campo grupo etiqueta="¿Cuánto tiempo tienes para cocinar?">
                <div className="grid grid-cols-2 gap-2">
                  {TIEMPOS.map((t) => (
                    <Chip key={t} activo={r.tiempo === t} onClick={() => cambiar({ tiempo: t })}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Campo>
            </>
          ) : (
            <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
              🥡 Sin sesión de cocina: se organizará la semana con tus tuppers (primero los que caducan antes) y platos rápidos con lo que tengas.
            </p>
          )}
        </div>
      ),
    },
    {
      titulo: '¿Qué días comes en la uni?',
      detalle: 'Esos días necesitas un tupper que se coma frío o se transporte bien.',
      contenido: (
        <div className="grid grid-cols-2 gap-2">
          {dias.map((f) => (
            <Chip key={f} activo={r.diasUni.includes(f)} onClick={() => cambiar({ diasUni: alternar(r.diasUni, f) })}>
              🎒 {mayuscula(etiquetaDia(f))}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      titulo: '¿Comes o cenas fuera algún día?',
      detalle: 'Marca las comidas que no harás en casa.',
      contenido: (
        <div className="space-y-2">
          {dias.map((f) => {
            const fuera = r.fuera.find((x) => x.fecha === f)
            return (
              <div key={f} className="flex items-center gap-2">
                <span className="w-28 font-semibold">{mayuscula(etiquetaDia(f))}</span>
                <Chip activo={!!fuera?.comida} onClick={() => alternarFuera(f, 'comida')}>
                  ☀️ Comida
                </Chip>
                <Chip activo={!!fuera?.cena} onClick={() => alternarFuera(f, 'cena')}>
                  🌙 Cena
                </Chip>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      titulo: '¿Te apetece algo?',
      detalle: 'Antojos, platos que te apetecen o algo que quieras evitar esta semana.',
      contenido: (
        <div className="space-y-4">
          <textarea className={`${claseEntrada} resize-none`} rows={3} value={r.antojos} onChange={(e) => cambiar({ antojos: e.target.value })} placeholder="Ej.: algo con garbanzos, una pizza casera el viernes…" />
          <Campo etiqueta="Otras notas (opcional)">
            <textarea className={`${claseEntrada} resize-none`} rows={2} value={r.notas} onChange={(e) => cambiar({ notas: e.target.value })} placeholder="Ej.: el jueves llego tarde, cena rápida" />
          </Campo>
        </div>
      ),
    },
    {
      titulo: '¿Pruebas alguna receta nueva?',
      detalle: 'Elige de tu lista «Quiero probar».',
      contenido: !aProbar?.length ? (
        <div className="rounded-2xl bg-tarjeta p-4 text-suave ring-1 ring-black/5">
          Tu lista «Quiero probar» está vacía.{' '}
          <Link to="/recetas?tab=probar" className="font-semibold text-tomate">
            Añadir recetas
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {aProbar.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => cambiar({ recetasAProbar: alternar(r.recetasAProbar, x.id) })}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${r.recetasAProbar.includes(x.id) ? 'bg-tomate text-white' : 'bg-tarjeta ring-1 ring-black/5'}`}
            >
              <span className="text-xl">{r.recetasAProbar.includes(x.id) ? '✅' : x.tipoEnlace === 'video' ? '🎬' : '🌐'}</span>
              <span className="font-semibold">{x.nombre}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      titulo: '¡Listo!',
      detalle: `${r.diaCocina ? `Cocinas el ${etiquetaDia(r.diaCocina)} (${r.tiempo.toLowerCase()})` : 'Esta semana no cocinas'}. Del ${etiquetaDia(r.desde)} al ${etiquetaDia(r.hasta)}.`,
      contenido: (
        <div className="space-y-3">
          <BotonPrincipal onClick={() => onPlanificarIA(r)}>✨ Planificar con IA</BotonPrincipal>
          <BotonSecundario onClick={() => onAMano(r)}>✍️ Hacer el menú a mano</BotonSecundario>
        </div>
      ),
    },
  ]

  const actual = pasos[paso]
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {pasos.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-tomate' : 'bg-stone-200'}`} />
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-bold">{actual.titulo}</h2>
        {actual.detalle && <p className="mt-1 text-suave first-letter:uppercase">{actual.detalle}</p>}
      </div>
      {actual.contenido}
      <div className="flex gap-3 pt-2">
        {paso > 0 ? (
          <BotonSecundario className="flex-1" onClick={() => setPaso(paso - 1)}>
            Atrás
          </BotonSecundario>
        ) : (
          onCancelar && (
            <BotonSecundario className="flex-1" onClick={onCancelar}>
              Cancelar
            </BotonSecundario>
          )
        )}
        {paso < pasos.length - 1 && (
          <BotonPrincipal className="flex-[2]" onClick={() => setPaso(paso + 1)}>
            Siguiente
          </BotonPrincipal>
        )}
      </div>
    </div>
  )
}
