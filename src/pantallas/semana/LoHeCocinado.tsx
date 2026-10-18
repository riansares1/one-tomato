import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, claseEntrada } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import { db } from '../../datos/db'
import type { PlanSemanal, Producto } from '../../datos/tipos'
import { categoria } from '../../logica/caducidad'
import { proponerGastos, registrarCocinado, unidadVista, type Gasto } from '../../logica/cocinado'
import { hoy } from '../../logica/fechas'
import { convertir } from '../../logica/unidades'
import { leerNumero, mostrarNumero } from '../../logica/numeros'

interface Props {
  plan: PlanSemanal
  plato: string
  recetaId?: string | null
  fecha?: string
  momento?: 'comida' | 'cena'
  onCerrar: () => void
}

export default function LoHeCocinado(props: Props) {
  const productos = useLiveQuery(() => db.productos.toArray(), [])
  // Esperamos al inventario para poder proponer los ingredientes
  return productos ? <Formulario {...props} productos={productos} /> : null
}

function Formulario({ plan, plato, recetaId, fecha, momento, onCerrar, productos }: Props & { productos: Producto[] }) {
  const aviso = useAviso()
  const receta = plan.menu.recetas.find((r) => r.id === recetaId)
  const yaDescontada = !!receta && (plan.sesion.recetasDescontadas ?? []).includes(receta.id)

  // Raciones propuestas: lo que planeó la IA para este plato, o lo típico si no hay plan
  const [raciones, setRaciones] = useState(() => {
    const guardados = new Set(plan.sesion.tuppersGuardados ?? [])
    const pendientes = plan.menu.tuppersResultantes.filter((t, i) => recetaId && t.recetaId === recetaId && !guardados.has(i))
    const esHoy = fecha === hoy()
    if (pendientes.length) {
      const suma = (z: string) => pendientes.filter((t) => t.zona === z).reduce((n, t) => n + t.raciones, 0)
      return { ahora: esHoy ? 1 : 0, nevera: Math.max(0, suma('nevera') - (esHoy ? 1 : 0)), congelador: suma('congelador') }
    }
    const total = receta?.raciones ?? 1
    return { ahora: esHoy ? 1 : 0, nevera: Math.max(0, total - (esHoy ? 1 : 0)), congelador: 0 }
  })
  const [gastos, setGastos] = useState<Gasto[]>(() => proponerGastos(productos, plato, receta, yaDescontada))
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(gastos.map((g) => [g.producto.id, g.cantidad != null ? mostrarNumero(g.cantidad) : ''])),
  )

  const cambiarGasto = (id: string, c: Partial<Gasto>) => setGastos((gs) => gs.map((g) => (g.producto.id === id ? { ...g, ...c } : g)))
  const sinUsar = productos.filter((p) => !gastos.some((g) => g.producto.id === p.id)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const totalRaciones = raciones.ahora + raciones.nevera + raciones.congelador

  async function guardar() {
    const { restados } = await registrarCocinado({ planId: plan.id, plato: receta?.nombre ?? plato, recetaId, fecha, momento, comerAhora: raciones.ahora, nevera: raciones.nevera, congelador: raciones.congelador, gastos })
    const partes = [raciones.nevera && `${raciones.nevera} a la nevera`, raciones.congelador && `${raciones.congelador} al congelador`].filter(Boolean)
    aviso(`👩‍🍳 ¡Hecho!${partes.length ? ` Tuppers: ${partes.join(', ')}.` : ''}${restados.length ? ` Restado: ${restados.join(', ')}.` : ''}`)
    onCerrar()
  }

  return (
    <Hoja titulo={`👩‍🍳 ${receta?.nombre ?? plato}`} onCerrar={onCerrar}>
      <div className="space-y-5">
        <section className="rounded-2xl bg-tarjeta p-4 ring-1 ring-black/5">
          <h3 className="mb-1 font-bold">¿Cuántas raciones te han salido?</h3>
          <Contador texto="🍽️ Me lo como ahora" valor={raciones.ahora} onCambio={(n) => setRaciones((r) => ({ ...r, ahora: n }))} />
          <Contador texto="🧊 A la nevera" valor={raciones.nevera} onCambio={(n) => setRaciones((r) => ({ ...r, nevera: n }))} />
          <Contador texto="❄️ Al congelador" valor={raciones.congelador} onCambio={(n) => setRaciones((r) => ({ ...r, congelador: n }))} />
          <p className="mt-1 text-sm text-suave">
            {totalRaciones} {totalRaciones === 1 ? 'ración' : 'raciones'} en total. Lo de la nevera y el congelador se guarda como tupper.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-tarjeta p-4 ring-1 ring-black/5">
          <h3 className="font-bold">¿Qué has gastado de tu cocina?</h3>
          {yaDescontada && <p className="text-sm text-amber-800">Los ingredientes de esta receta ya se restaron cuando la cocinaste. Márcalos solo si la has vuelto a hacer.</p>}
          {gastos.length === 0 && <p className="text-sm text-suave">Añade abajo lo que has usado y se restará de Mi cocina.</p>}
          {gastos.map((g) => {
            const u = unidadVista(g.producto.unidad)
            const tienes = convertir(g.producto.cantidad, g.producto.unidad, u) ?? g.producto.cantidad
            return (
              <div key={g.producto.id} className={`flex items-center gap-2 rounded-xl p-2 ${g.marcado ? 'bg-orange-50' : 'bg-fondo'}`}>
                <input type="checkbox" className="size-5 shrink-0 accent-tomate" checked={g.marcado} onChange={(e) => cambiarGasto(g.producto.id, { marcado: e.target.checked })} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {categoria(g.producto.categoria).emoji} {g.producto.nombre}
                  </span>
                  <span className="block text-xs text-suave">
                    tienes {mostrarNumero(tienes)} {u}
                  </span>
                </span>
                <input
                  className="w-20 rounded-xl border border-stone-200 bg-white px-2 py-2 text-center text-base"
                  inputMode="decimal"
                  placeholder="¿?"
                  value={textos[g.producto.id] ?? ''}
                  onChange={(e) => {
                    const n = leerNumero(e.target.value)
                    setTextos((t) => ({ ...t, [g.producto.id]: e.target.value }))
                    cambiarGasto(g.producto.id, { cantidad: n || null, marcado: n > 0 })
                  }}
                />
                <span className="w-7 text-sm text-suave">{u}</span>
              </div>
            )
          })}
          {sinUsar.length > 0 && (
            <select
              className={`${claseEntrada} text-suave`}
              value=""
              onChange={(e) => {
                const p = productos.find((x) => x.id === e.target.value)
                if (p) setGastos((gs) => [...gs, { producto: p, cantidad: null, marcado: false }])
              }}
            >
              <option value="">+ Añadir otro de mi cocina…</option>
              {sinUsar.map((p) => (
                <option key={p.id} value={p.id}>
                  {categoria(p.categoria).emoji} {p.nombre} ({mostrarNumero(p.cantidad)} {p.unidad})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-suave">Solo se resta lo marcado, y nunca por debajo de cero. Si algo se acaba, desaparece de Mi cocina.</p>
        </section>

        <BotonPrincipal onClick={guardar} disabled={totalRaciones === 0 && !gastos.some((g) => g.marcado)}>
          Guardar
        </BotonPrincipal>
      </div>
    </Hoja>
  )
}

function Contador({ texto, valor, onCambio }: { texto: string; valor: number; onCambio: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex-1 font-semibold">{texto}</span>
      <button onClick={() => onCambio(Math.max(0, valor - 1))} className="rounded-xl bg-stone-100 p-2.5" aria-label={`Menos: ${texto}`}>
        <Minus size={18} />
      </button>
      <span className="w-7 text-center text-lg font-bold">{valor}</span>
      <button onClick={() => onCambio(valor + 1)} className="rounded-xl bg-stone-100 p-2.5" aria-label={`Más: ${texto}`}>
        <Plus size={18} />
      </button>
    </div>
  )
}
