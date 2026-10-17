import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router'
import { Plus, ScanBarcode } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { mostrarNumero } from '../../logica/numeros'
import { useAjustes } from '../../datos/ajustes'
import { db } from '../../datos/db'
import type { Producto, Tupper, Zona } from '../../datos/tipos'
import { caducidadTupper, categoria, ESTILO_URGENCIA, urgencia } from '../../logica/caducidad'
import { diasEntre, fechaCorta, hoy, relativa } from '../../logica/fechas'
import { borrarTupper, restaurarTupper } from '../../logica/inventario'
import FormProducto from './FormProducto'
import FormTupper from './FormTupper'

type Pestana = Zona | 'tuppers'

const PESTANAS: { valor: Pestana; texto: string; emoji: string }[] = [
  { valor: 'despensa', texto: 'Despensa', emoji: '🥫' },
  { valor: 'nevera', texto: 'Nevera', emoji: '🧊' },
  { valor: 'congelador', texto: 'Congelador', emoji: '❄️' },
  { valor: 'tuppers', texto: 'Tuppers', emoji: '🥡' },
]

// Ordena por caducidad: lo que caduca antes, arriba. Sin fecha, al final.
const porCaducidad = (a?: string, b?: string) => (a ?? '9999').localeCompare(b ?? '9999')

export default function MiCocina() {
  const [params, setParams] = useSearchParams()
  const pestana = (params.get('zona') as Pestana) || 'nevera'
  const ajustes = useAjustes()
  const productos = useLiveQuery(() => db.productos.toArray(), [])
  const tuppers = useLiveQuery(() => db.tuppers.toArray(), [])

  const [editandoProducto, setEditandoProducto] = useState<Producto | 'nuevo' | null>(null)
  const [editandoTupper, setEditandoTupper] = useState<Tupper | 'nuevo' | null>(null)

  if (!productos || !tuppers) return null

  const cuenta = (p: Pestana) => (p === 'tuppers' ? tuppers.length : productos.filter((x) => x.zona === p).length)
  const lista = productos.filter((p) => p.zona === pestana).sort((a, b) => porCaducidad(a.caducidad, b.caducidad))
  const listaTuppers = tuppers
    .map((t) => ({ t, cad: caducidadTupper(t, ajustes.duraciones) }))
    .sort((a, b) => porCaducidad(a.cad, b.cad))

  return (
    <div>
      {/* Pestañas de zonas */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 bg-fondo/95 px-4 pb-3 backdrop-blur">
        <div className="grid grid-cols-4 gap-1.5">
          {PESTANAS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setParams({ zona: p.valor }, { replace: true })}
              className={`flex flex-col items-center rounded-2xl py-2 text-xs font-semibold transition ${
                pestana === p.valor ? 'bg-tomate text-white shadow-sm' : 'bg-tarjeta text-suave'
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              {p.texto}
              <span className={pestana === p.valor ? 'text-white/80' : 'text-stone-400'}>{cuenta(p.valor)}</span>
            </button>
          ))}
        </div>
      </div>

      {pestana === 'tuppers' ? (
        listaTuppers.length === 0 ? (
          <Vacio emoji="🥡" texto="No tienes tuppers guardados." detalle="Cuando cocines, apunta aquí lo que dejas preparado." />
        ) : (
          <ul className="space-y-2.5">
            {listaTuppers.map(({ t, cad }) => (
              <FilaTupper key={t.id} tupper={t} caducidad={cad} onTocar={() => setEditandoTupper(t)} />
            ))}
          </ul>
        )
      ) : lista.length === 0 ? (
        <Vacio
          emoji={PESTANAS.find((p) => p.valor === pestana)!.emoji}
          texto={pestana === 'congelador' ? 'Tu congelador está vacío.' : `Tu ${pestana} está vacía.`}
          detalle="Añade lo que tienes para que la app te avise antes de que caduque."
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((p) => (
            <FilaProducto key={p.id} producto={p} onTocar={() => setEditandoProducto(p)} />
          ))}
        </ul>
      )}

      {/* Botones de añadir, fijos encima de la barra inferior */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-lg gap-3 px-4">
        {pestana === 'tuppers' ? (
          <button onClick={() => setEditandoTupper('nuevo')} className={claseBotonFlotante + ' flex-1 bg-tomate text-white'}>
            <Plus size={22} /> Nuevo tupper
          </button>
        ) : (
          <>
            <Link to="/escanear" className={claseBotonFlotante + ' flex-1 bg-tarjeta text-texto'}>
              <ScanBarcode size={22} /> Escanear
            </Link>
            <button onClick={() => setEditandoProducto('nuevo')} className={claseBotonFlotante + ' flex-1 bg-tomate text-white'}>
              <Plus size={22} /> Añadir
            </button>
          </>
        )}
      </div>
      {/* Espacio para que los botones no tapen el último elemento */}
      <div className="h-20" />

      {editandoProducto && (
        <FormProducto
          producto={editandoProducto === 'nuevo' ? undefined : editandoProducto}
          zonaInicial={pestana === 'tuppers' ? 'nevera' : pestana}
          onCerrar={() => setEditandoProducto(null)}
        />
      )}
      {editandoTupper && (
        <FormTupper tupper={editandoTupper === 'nuevo' ? undefined : editandoTupper} onCerrar={() => setEditandoTupper(null)} />
      )}
    </div>
  )
}

const claseBotonFlotante =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-lg ring-1 ring-black/5 active:scale-[0.98] transition'

function Vacio({ emoji, texto, detalle }: { emoji: string; texto: string; detalle: string }) {
  return (
    <div className="mt-10 flex flex-col items-center px-6 text-center">
      <div className="mb-3 text-6xl">{emoji}</div>
      <p className="text-lg font-semibold">{texto}</p>
      <p className="mt-1 text-suave">{detalle}</p>
    </div>
  )
}

function TextoCaducidad({ caducidad, estimada }: { caducidad?: string; estimada?: boolean }) {
  const u = urgencia(caducidad)
  if (!caducidad) return <span className="text-sm text-suave">Sin fecha</span>
  const texto = u === 'caducado' ? `Caducó ${relativa(caducidad)}` : `Caduca ${relativa(caducidad)}`
  return (
    <span className={`text-sm font-semibold ${ESTILO_URGENCIA[u].texto}`}>
      {texto}
      <span className="block text-right text-xs font-normal text-suave">
        {fechaCorta(caducidad)}
        {estimada && ' · estimada'}
      </span>
    </span>
  )
}

function FilaProducto({ producto: p, onTocar }: { producto: Producto; onTocar: () => void }) {
  const u = urgencia(p.caducidad)
  return (
    <li>
      <button
        onClick={onTocar}
        className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99] ${ESTILO_URGENCIA[u].fondo}`}
      >
        <span className="relative text-3xl">
          {categoria(p.categoria).emoji}
          <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white ${ESTILO_URGENCIA[u].punto}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.nombre}</span>
          <span className="block truncate text-sm text-suave">
            {mostrarNumero(p.cantidad)} {p.unidad}
            {p.marca && ` · ${p.marca}`}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <TextoCaducidad caducidad={p.caducidad} estimada={p.caducidadTipo === 'estimada'} />
        </span>
      </button>
    </li>
  )
}

function FilaTupper({ tupper: t, caducidad, onTocar }: { tupper: Tupper; caducidad: string; onTocar: () => void }) {
  const aviso = useAviso()
  const u = urgencia(caducidad)
  const dias = diasEntre(t.preparadoEl, hoy())

  async function comerRacion() {
    if (t.raciones > 1) {
      await db.tuppers.update(t.id, { raciones: t.raciones - 1 })
      aviso(`Una ración de ${t.plato} menos`, () => db.tuppers.update(t.id, { raciones: t.raciones }))
    } else {
      await borrarTupper(t.id)
      aviso(`Tupper de ${t.plato} terminado`, () => restaurarTupper(t))
    }
  }

  async function pasarANevera() {
    await db.tuppers.update(t.id, { zona: 'nevera', enNeveraDesde: hoy() })
    aviso(`${t.plato} a la nevera para descongelar`, () => db.tuppers.put(t))
  }

  return (
    <li className={`rounded-2xl shadow-sm ring-1 ring-black/5 ${ESTILO_URGENCIA[u].fondo}`}>
      <button onClick={onTocar} className="flex w-full items-start gap-3 p-3.5 text-left">
        <span className="relative text-3xl">
          🥡
          <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white ${ESTILO_URGENCIA[u].punto}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.plato}</span>
          <span className="block text-sm text-suave">
            {t.raciones} {t.raciones === 1 ? 'ración' : 'raciones'} · {t.zona === 'congelador' ? '❄️' : '🧊'}{' '}
            {dias === 0 ? 'hecho hoy' : `hecho hace ${dias} ${dias === 1 ? 'día' : 'días'}`}
            {t.enNeveraDesde && ' · descongelando'}
          </span>
          {t.estado === 'casi' && (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              ⏳ Casi listo{t.falta && `: ${t.falta}`}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <TextoCaducidad caducidad={caducidad} />
        </span>
      </button>
      <div className="flex gap-2 px-3.5 pb-3">
        <button onClick={comerRacion} className="min-h-10 flex-1 rounded-xl bg-white/70 text-sm font-semibold ring-1 ring-black/5 active:bg-stone-100">
          🍽️ Me como 1 ración
        </button>
        {t.zona === 'congelador' && (
          <button onClick={pasarANevera} className="min-h-10 flex-1 rounded-xl bg-white/70 text-sm font-semibold ring-1 ring-black/5 active:bg-stone-100">
            🧊 Pasar a nevera
          </button>
        )}
      </div>
    </li>
  )
}
