import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada } from '../../componentes/Campos'
import { leerAjustes } from '../../datos/ajustes'
import { db } from '../../datos/db'
import type { Ajustes, RespuestasAsistente } from '../../datos/tipos'
import { sumarDias } from '../../logica/fechas'
import { etiquetaDia, fechasEntre, mayuscula, proximoDiaCocina } from '../../logica/plan'

const TIEMPOS = ['1 hora', '2 horas', '3 horas', 'Más de 3 horas']

interface Props {
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

function Preguntas({ onPlanificarIA, onAMano, onCancelar, ajustes }: Props & { ajustes: Ajustes }) {
  const aProbar = useLiveQuery(() => db.recetas.where('estado').equals('quiero-probar').toArray(), [])
  const [paso, setPaso] = useState(0)
  const [r, setR] = useState<RespuestasAsistente>(() => {
    const diaCocina = proximoDiaCocina(ajustes.diaCocina)
    const desde = sumarDias(diaCocina, 1)
    return { diaCocina, desde, hasta: sumarDias(desde, 6), diasUni: [], fuera: [], tiempo: '2 horas', antojos: '', recetasAProbar: [], notas: '' }
  })
  const cambiar = (c: Partial<RespuestasAsistente>) => setR((x) => ({ ...x, ...c }))
  const dias = fechasEntre(r.desde, r.hasta)
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  function alternarFuera(fecha: string, momento: 'comida' | 'cena') {
    const actual = r.fuera.find((f) => f.fecha === fecha) ?? { fecha, comida: false, cena: false }
    const nuevo = { ...actual, [momento]: !actual[momento] }
    cambiar({ fuera: [...r.fuera.filter((f) => f.fecha !== fecha), nuevo].filter((f) => f.comida || f.cena) })
  }

  const pasos = [
    {
      titulo: '¿Cuándo cocinas?',
      contenido: (
        <div className="space-y-5">
          <Campo etiqueta="Día de cocina">
            <input
              type="date"
              className={`${claseEntrada} min-h-12`}
              value={r.diaCocina}
              onChange={(e) => {
                const d = e.target.value
                if (!d) return
                const desde = sumarDias(d, 1)
                cambiar({ diaCocina: d, desde, hasta: sumarDias(desde, 6), diasUni: [], fuera: [] })
              }}
            />
          </Campo>
          <Campo grupo etiqueta="¿Cuánto tiempo tienes para cocinar?">
            <div className="grid grid-cols-2 gap-2">
              {TIEMPOS.map((t) => (
                <Chip key={t} activo={r.tiempo === t} onClick={() => cambiar({ tiempo: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Semana desde">
              <input type="date" className={`${claseEntrada} min-h-12 px-3`} value={r.desde} onChange={(e) => e.target.value && cambiar({ desde: e.target.value })} />
            </Campo>
            <Campo etiqueta="Hasta">
              <input type="date" className={`${claseEntrada} min-h-12 px-3`} value={r.hasta} onChange={(e) => e.target.value && cambiar({ hasta: e.target.value })} />
            </Campo>
          </div>
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
      detalle: 'Cocinas el ' + etiquetaDia(r.diaCocina) + ` (${r.tiempo.toLowerCase()}). Semana del ${etiquetaDia(r.desde)} al ${etiquetaDia(r.hasta)}.`,
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
