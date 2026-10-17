import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, claseEntrada, Selector } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import Vacio from '../../componentes/Vacio'
import { useAjustes } from '../../datos/ajustes'
import { db, nuevoId } from '../../datos/db'
import type { ItemCompra, Producto, Zona } from '../../datos/tipos'
import { categoria, estimarCaducidad } from '../../logica/caducidad'
import { pasarAInventario, productoDeCompra } from '../../logica/compra'
import { leerNumero, mostrarNumero } from '../../logica/numeros'
import { adivinarSeccion, SECCIONES, seccion } from '../../logica/secciones'

export default function Compra() {
  const items = useLiveQuery(() => db.compra.toArray(), [])
  const [nuevo, setNuevo] = useState('')
  const [revisando, setRevisando] = useState(false)

  if (!items) return null
  const comprados = items.filter((i) => i.comprado)

  async function anadir() {
    const texto = nuevo.trim()
    if (!texto) return
    // "2 kg patatas" → cantidad 2, unidad kg
    const m = texto.match(/^([\d.,]+)\s*(g|kg|ml|l|ud|uds)?\s+(.+)$/i)
    await db.compra.add({
      id: nuevoId(),
      nombre: m ? m[3] : texto,
      cantidad: m ? leerNumero(m[1]) : null,
      unidad: m ? (m[2]?.toLowerCase() ?? 'ud') : null,
      seccion: adivinarSeccion(m ? m[3] : texto),
      comprado: false,
    })
    setNuevo('')
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          anadir()
        }}
      >
        <input className={claseEntrada} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Añadir: ej. 1 l leche" enterKeyHint="done" />
        <button className="flex size-[50px] shrink-0 items-center justify-center rounded-2xl bg-tomate text-white disabled:opacity-50" disabled={!nuevo.trim()} aria-label="Añadir">
          <Plus size={24} />
        </button>
      </form>

      {items.length === 0 ? (
        <Vacio emoji="🛒" texto="La lista está vacía." detalle="Se rellena sola al guardar el menú de la semana. También puedes añadir cosas a mano." />
      ) : (
        SECCIONES.map((s) => {
          const deSeccion = items.filter((i) => seccion(i.seccion).id === s.id).sort((a, b) => Number(a.comprado) - Number(b.comprado) || a.nombre.localeCompare(b.nombre))
          if (!deSeccion.length) return null
          return (
            <section key={s.id} className="rounded-3xl bg-tarjeta p-4 shadow-sm ring-1 ring-black/5">
              <h3 className="mb-2 px-1 font-bold">
                {s.emoji} {s.nombre}
              </h3>
              <ul>
                {deSeccion.map((i) => (
                  <FilaCompra key={i.id} item={i} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      {comprados.length > 0 && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10">
          <BotonPrincipal onClick={() => setRevisando(true)} className="shadow-lg">
            ✅ Lo he comprado ({comprados.length})
          </BotonPrincipal>
        </div>
      )}

      {revisando && <RevisarCompra items={comprados} onCerrar={() => setRevisando(false)} />}
    </div>
  )
}

function FilaCompra({ item }: { item: ItemCompra }) {
  const aviso = useAviso()
  return (
    <li className="flex items-center gap-3 border-b border-stone-100 last:border-0">
      <button onClick={() => db.compra.update(item.id, { comprado: !item.comprado })} className="flex min-h-13 flex-1 items-center gap-3 py-2 text-left">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-2 ${item.comprado ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}>
          {item.comprado && <Check size={18} strokeWidth={3} />}
        </span>
        <span className={`flex-1 ${item.comprado ? 'text-suave line-through' : ''}`}>
          <span className="first-letter:uppercase">{item.nombre}</span>
          {item.cantidad != null && (
            <span className="text-suave">
              {' '}
              · {mostrarNumero(item.cantidad)} {item.unidad ?? ''}
            </span>
          )}
        </span>
      </button>
      <button
        onClick={async () => {
          await db.compra.delete(item.id)
          aviso(`Quitado: ${item.nombre}`, () => db.compra.put(item))
        }}
        className="p-2 text-stone-400"
        aria-label={`Quitar ${item.nombre}`}
      >
        <Trash2 size={18} />
      </button>
    </li>
  )
}

const ZONAS: { valor: Zona; texto: string }[] = [
  { valor: 'despensa', texto: 'Despensa' },
  { valor: 'nevera', texto: 'Nevera' },
  { valor: 'congelador', texto: 'Congel.' },
]

// Confirmación rápida antes de pasar lo comprado a Mi cocina
function RevisarCompra({ items, onCerrar }: { items: ItemCompra[]; onCerrar: () => void }) {
  const ajustes = useAjustes()
  const aviso = useAviso()
  const [productos, setProductos] = useState<Producto[]>(() => items.map((i) => productoDeCompra(i, ajustes.duraciones)))

  const cambiar = (n: number, c: Partial<Producto>) => setProductos((ps) => ps.map((p, i) => (i === n ? { ...p, ...c } : p)))

  async function confirmar() {
    await pasarAInventario(items.map((item, i) => ({ item, producto: productos[i] })))
    aviso(`${items.length} productos añadidos a Mi cocina`)
    onCerrar()
  }

  return (
    <Hoja titulo="Pasar a Mi cocina" onCerrar={onCerrar}>
      <p className="mb-4 text-suave">Revisa dónde lo guardas y la caducidad. Si ya tenías alguno, se suma.</p>
      <ul className="space-y-3">
        {productos.map((p, n) => (
          <li key={p.id} className="space-y-2 rounded-2xl bg-tarjeta p-3 ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoria(p.categoria).emoji}</span>
              <span className="flex-1 font-semibold">{p.nombre}</span>
              <input
                className="w-16 rounded-xl border border-stone-200 bg-fondo px-2 py-2 text-center text-base"
                inputMode="decimal"
                defaultValue={mostrarNumero(p.cantidad)}
                onChange={(e) => cambiar(n, { cantidad: leerNumero(e.target.value) || 1 })}
              />
              <span className="w-6 text-sm text-suave">{p.unidad}</span>
            </div>
            <Selector
              opciones={ZONAS}
              valor={p.zona}
              onCambio={(zona) =>
                cambiar(n, { zona, ...(p.caducidadTipo === 'estimada' ? { caducidad: estimarCaducidad(p.categoria, zona, ajustes.duraciones) } : {}) })
              }
            />
            <label className="flex items-center gap-2 text-sm text-suave">
              Caduca
              <input
                type="date"
                className="min-h-10 flex-1 rounded-xl border border-stone-200 bg-fondo px-2 text-base text-texto"
                value={p.caducidad ?? ''}
                onChange={(e) => cambiar(n, { caducidad: e.target.value || undefined, caducidadTipo: 'real' })}
              />
              {p.caducidadTipo === 'estimada' && <span className="text-xs">(estimada)</span>}
            </label>
          </li>
        ))}
      </ul>
      <BotonPrincipal onClick={confirmar} className="mt-5">
        Añadir {productos.length} a Mi cocina
      </BotonPrincipal>
    </Hoja>
  )
}
