import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router'
import { ClipboardPaste, ExternalLink, Plus } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import Vacio from '../../componentes/Vacio'
import { BotonSecundario } from '../../componentes/Campos'
import { db } from '../../datos/db'
import type { Receta } from '../../datos/tipos'
import { hoy } from '../../logica/fechas'
import { pegar } from '../../logica/portapapeles'
import { dominio, extraerEnlace, nombreDesdeEnlace, tipoDeEnlace, valorar } from '../../logica/recetas'
import DetalleReceta from './DetalleReceta'
import FormReceta from './FormReceta'

type Pestana = 'favoritas' | 'probar' | 'archivadas'

const PESTANAS: { valor: Pestana; texto: string }[] = [
  { valor: 'favoritas', texto: '⭐ Favoritas' },
  { valor: 'probar', texto: '🔖 Quiero probar' },
  { valor: 'archivadas', texto: '🗄️ Archivadas' },
]

export default function Recetas() {
  const [params, setParams] = useSearchParams()
  const pestana = (params.get('tab') as Pestana) || 'favoritas'
  const aviso = useAviso()
  const recetas = useLiveQuery(() => db.recetas.toArray(), [])
  const [formulario, setFormulario] = useState<{ receta?: Receta; inicial?: Partial<Receta> } | null>(null)
  const [viendo, setViendo] = useState<Receta | null>(null)

  if (!recetas) return null
  const ordenadas = [...recetas].sort((a, b) => b.creadaEl.localeCompare(a.creadaEl))
  const favoritas = ordenadas.filter((r) => r.estado === 'favorita')
  const aProbar = ordenadas.filter((r) => r.estado === 'quiero-probar')
  const archivadas = ordenadas.filter((r) => r.estado === 'archivada')
  const pendientes = aProbar.filter((r) => r.probadaEl)

  async function pegarEnlace() {
    const texto = await pegar()
    if (texto == null) {
      // Sin permiso para leer el portapapeles: abrimos el formulario para pegar a mano
      setFormulario({ inicial: { estado: 'quiero-probar' } })
      return
    }
    const r = extraerEnlace(texto)
    if (!r) return aviso('No hay ningún enlace copiado. Copia el enlace de la receta y vuelve a pulsar.')
    const repetida = recetas!.find((x) => x.enlace === r.enlace)
    if (repetida) return aviso(`Ya tienes este enlace guardado: ${repetida.nombre}`)
    setFormulario({
      inicial: { estado: 'quiero-probar', enlace: r.enlace, tipoEnlace: tipoDeEnlace(r.enlace), nombre: nombreDesdeEnlace(r.enlace), nota: r.resto || undefined },
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            onClick={() => setParams({ tab: p.valor }, { replace: true })}
            className={`min-h-11 rounded-xl text-sm font-semibold ${pestana === p.valor ? 'bg-tarjeta shadow-sm' : 'text-suave'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pendientes.map((r) => (
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

      {pestana === 'probar' && (
        <>
          <div className="flex gap-2">
            <button onClick={pegarEnlace} className="flex min-h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-tomate font-semibold text-white shadow-sm">
              <ClipboardPaste size={20} /> Pegar enlace
            </button>
            <button onClick={() => setFormulario({ inicial: { estado: 'quiero-probar' } })} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-tarjeta font-semibold ring-1 ring-black/5">
              <Plus size={20} /> A mano
            </button>
          </div>
          {aProbar.length === 0 ? (
            <Vacio emoji="🔖" texto="Tu lista está vacía." detalle="Copia el enlace de una receta (web, TikTok, Instagram, YouTube…) y pulsa «Pegar enlace»." />
          ) : (
            <ul className="space-y-2.5">
              {aProbar.map((r) => (
                <li key={r.id} className="rounded-2xl bg-tarjeta p-4 shadow-sm ring-1 ring-black/5">
                  <button onClick={() => setFormulario({ receta: r })} className="w-full text-left">
                    <span className="block font-semibold">{r.nombre}</span>
                    {r.enlace && (
                      <span className="block text-sm text-suave">
                        {r.tipoEnlace === 'video' ? '🎬' : '🌐'} {dominio(r.enlace)}
                      </span>
                    )}
                    {r.nota && <span className="mt-1 line-clamp-2 block text-sm text-suave">{r.nota}</span>}
                    {r.tipoEnlace === 'video' && !r.nota && <span className="mt-1 block text-sm text-amber-700">⚠️ Añade la descripción para que la IA sepa qué lleva</span>}
                  </button>
                  <div className="mt-3 flex gap-2">
                    {r.enlace && (
                      <a href={r.enlace} target="_blank" rel="noreferrer" className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold">
                        <ExternalLink size={16} /> Abrir
                      </a>
                    )}
                    {!r.probadaEl && (
                      <button onClick={() => db.recetas.update(r.id, { probadaEl: hoy() })} className="min-h-10 flex-1 rounded-xl bg-stone-100 text-sm font-semibold">
                        👩‍🍳 Ya la cociné
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {pestana === 'favoritas' && (
        <>
          {favoritas.length === 0 ? (
            <Vacio emoji="⭐" texto="Aún no tienes favoritas." detalle="Guarda recetas del menú semanal con «Guardar como favorita», o las de «Quiero probar» que te gusten." />
          ) : (
            <ul className="grid grid-cols-2 gap-2.5">
              {favoritas.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setViendo(r)} className="flex h-full min-h-28 w-full flex-col justify-between rounded-2xl bg-tarjeta p-4 text-left shadow-sm ring-1 ring-black/5">
                    <span className="font-semibold leading-tight">{r.nombre}</span>
                    <span className="mt-2 text-xs text-suave">
                      {r.ingredientes?.length ? `${r.ingredientes.length} ingredientes` : r.enlace ? dominio(r.enlace) : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <BotonSecundario onClick={() => setFormulario({ inicial: { estado: 'favorita' } })}>
            <Plus size={18} /> Añadir favorita a mano
          </BotonSecundario>
        </>
      )}

      {pestana === 'archivadas' &&
        (archivadas.length === 0 ? (
          <Vacio emoji="🗄️" texto="Nada archivado." detalle="Aquí van las recetas que probaste y no te convencieron. El enlace se guarda siempre." />
        ) : (
          <ul className="space-y-2.5">
            {archivadas.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-tarjeta p-4 shadow-sm ring-1 ring-black/5">
                <button onClick={() => setFormulario({ receta: r })} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold">{r.nombre}</span>
                  {r.enlace && <span className="block truncate text-sm text-suave">{dominio(r.enlace)}</span>}
                </button>
                <button onClick={() => db.recetas.update(r.id, { estado: 'quiero-probar' })} className="rounded-xl bg-stone-100 px-3 py-2 text-sm font-semibold">
                  Recuperar
                </button>
              </li>
            ))}
          </ul>
        ))}

      {formulario && <FormReceta {...formulario} onCerrar={() => setFormulario(null)} />}
      {viendo && (
        <DetalleReceta
          nombre={viendo.nombre}
          raciones={viendo.raciones}
          ingredientes={viendo.ingredientes}
          pasos={viendo.pasos}
          enlace={viendo.enlace}
          nota={viendo.nota}
          onCerrar={() => setViendo(null)}
        >
          <BotonSecundario
            onClick={() => {
              setFormulario({ receta: viendo })
              setViendo(null)
            }}
          >
            ✏️ Editar
          </BotonSecundario>
        </DetalleReceta>
      )}
    </div>
  )
}
