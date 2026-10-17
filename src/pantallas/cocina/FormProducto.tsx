import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada, Selector } from '../../componentes/Campos'
import { leerNumero, mostrarNumero } from '../../logica/numeros'
import Hoja from '../../componentes/Hoja'
import { useAviso } from '../../componentes/Aviso'
import { useAjustes } from '../../datos/ajustes'
import { nuevoId } from '../../datos/db'
import type { Producto, Unidad, Usado, Zona } from '../../datos/tipos'
import { adivinarCategoria, CATEGORIAS, categoria, estimarCaducidad } from '../../logica/caducidad'
import { fechaCorta, hoy } from '../../logica/fechas'
import { borrarProducto, buscarDuplicado, buscarSugerencias, guardarProducto, restaurarProducto, sumarA } from '../../logica/inventario'

const ZONAS: { valor: Zona; texto: string }[] = [
  { valor: 'despensa', texto: 'Despensa' },
  { valor: 'nevera', texto: 'Nevera' },
  { valor: 'congelador', texto: 'Congelador' },
]

const UNIDADES: { valor: Unidad; texto: string }[] = [
  { valor: 'ud', texto: 'ud' },
  { valor: 'g', texto: 'g' },
  { valor: 'kg', texto: 'kg' },
  { valor: 'ml', texto: 'ml' },
  { valor: 'l', texto: 'l' },
]

interface Props {
  producto?: Producto // si viene, estamos editando
  zonaInicial: Zona
  onCerrar: () => void
}

export default function FormProducto({ producto, zonaInicial, onCerrar }: Props) {
  const ajustes = useAjustes()
  const aviso = useAviso()
  const editando = !!producto

  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [marca, setMarca] = useState(producto?.marca ?? '')
  const [cantidad, setCantidad] = useState(producto ? mostrarNumero(producto.cantidad) : '1')
  const [unidad, setUnidad] = useState<Unidad>(producto?.unidad ?? 'ud')
  const [zona, setZona] = useState<Zona>(producto?.zona ?? zonaInicial)
  // null = la adivinamos por el nombre; si la eliges a mano, se queda la tuya
  const [catElegida, setCatElegida] = useState<string | null>(producto?.categoria ?? null)
  const cat = catElegida ?? adivinarCategoria(nombre)
  // Solo mostramos la fecha si es "real"; las estimadas se recalculan solas
  const [caducidad, setCaducidad] = useState(producto?.caducidadTipo === 'real' ? (producto.caducidad ?? '') : '')
  const [verMas, setVerMas] = useState(!!producto?.marca)
  const [sugerencias, setSugerencias] = useState<Usado[]>([])
  const [duplicado, setDuplicado] = useState<{ existente: Producto; nuevo: Producto } | null>(null)

  useEffect(() => {
    let vigente = true
    buscarSugerencias(nombre).then((s) => vigente && setSugerencias(s))
    return () => {
      vigente = false
    }
  }, [nombre])

  function elegirSugerencia(u: Usado) {
    setNombre(u.nombre)
    setMarca(u.marca ?? '')
    setUnidad(u.unidad)
    setZona(u.zona)
    setCatElegida(u.categoria)
    setSugerencias([])
  }

  // Qué caducidad se guardará si dejas la fecha vacía
  function caducidadEstimada(): string {
    const sinCambios = producto?.caducidadTipo === 'estimada' && producto.zona === zona && producto.categoria === cat
    if (sinCambios && producto.caducidad) return producto.caducidad
    // Si sigue en la misma zona contamos desde que se añadió; si la mueves, desde hoy
    const desde = producto && producto.zona === zona ? producto.anadidoEl : hoy()
    return estimarCaducidad(cat, zona, ajustes.duraciones, desde)
  }

  function construir(): Producto {
    return {
      id: producto?.id ?? nuevoId(),
      nombre: nombre.trim(),
      marca: marca.trim() || undefined,
      cantidad: leerNumero(cantidad) || 1,
      unidad,
      zona,
      categoria: cat,
      caducidad: caducidad || caducidadEstimada(),
      caducidadTipo: caducidad ? 'real' : 'estimada',
      codigoBarras: producto?.codigoBarras,
      anadidoEl: producto?.anadidoEl ?? hoy(),
    }
  }

  async function guardar() {
    const p = construir()
    if (!editando) {
      const existente = await buscarDuplicado(p)
      if (existente) return setDuplicado({ existente, nuevo: p })
    }
    await guardarProducto(p)
    aviso(editando ? 'Cambios guardados' : `Añadido: ${p.nombre}`)
    onCerrar()
  }

  async function borrar() {
    if (!producto) return
    await borrarProducto(producto.id)
    aviso(`Borrado: ${producto.nombre}`, () => restaurarProducto(producto))
    onCerrar()
  }

  if (duplicado) {
    const { existente, nuevo } = duplicado
    return (
      <Hoja titulo="Ya lo tienes" onCerrar={onCerrar}>
        <p className="mb-5 text-lg">
          Ya tienes <b>{existente.nombre}</b> ({mostrarNumero(existente.cantidad)} {existente.unidad}) en {existente.zona}. ¿Sumo{' '}
          {mostrarNumero(nuevo.cantidad)} {nuevo.unidad} y queda en {mostrarNumero(existente.cantidad + nuevo.cantidad)} {nuevo.unidad}?
        </p>
        <div className="space-y-3">
          <BotonPrincipal
            onClick={async () => {
              await sumarA(existente, nuevo)
              aviso(`Sumado a ${existente.nombre}`)
              onCerrar()
            }}
          >
            Sí, sumar
          </BotonPrincipal>
          <BotonSecundario
            onClick={async () => {
              await guardarProducto(nuevo)
              aviso(`Añadido aparte: ${nuevo.nombre}`)
              onCerrar()
            }}
          >
            No, añadir aparte
          </BotonSecundario>
        </div>
      </Hoja>
    )
  }

  const c = categoria(cat)

  return (
    <Hoja titulo={editando ? 'Editar producto' : 'Añadir producto'} onCerrar={onCerrar}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (nombre.trim()) guardar()
        }}
      >
        <Campo etiqueta="¿Qué es?">
          <input
            className={claseEntrada}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: leche semidesnatada"
            autoComplete="off"
            enterKeyHint="next"
          />
        </Campo>
        {sugerencias.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-2">
            {sugerencias.map((s) => (
              <button
                key={s.clave}
                type="button"
                onClick={() => elegirSugerencia(s)}
                className="rounded-full bg-orange-100 px-3 py-2 text-sm font-medium text-orange-900 active:bg-orange-200"
              >
                {categoria(s.categoria).emoji} {s.nombre}
              </button>
            ))}
          </div>
        )}

        <Campo etiqueta="Cantidad o peso">
          <div className="flex gap-2">
            <input
              className={`${claseEntrada.replace('w-full', 'w-24')} shrink-0`}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              inputMode="decimal"
              onFocus={(e) => e.target.select()}
            />
            <div className="min-w-0 flex-1">
              <Selector opciones={UNIDADES} valor={unidad} onCambio={setUnidad} />
            </div>
          </div>
        </Campo>

        <Campo grupo etiqueta="¿Dónde está?">
          <Selector opciones={ZONAS} valor={zona} onCambio={setZona} />
        </Campo>

        <Campo
          etiqueta="Caducidad (opcional)"
          ayuda={
            caducidad ? (
              <button type="button" className="font-semibold text-tomate" onClick={() => setCaducidad('')}>
                Quitar fecha y estimarla
              </button>
            ) : (
              <>Si la dejas vacía, la estimo: <b>{fechaCorta(caducidadEstimada())}</b> ({c.nombre.toLowerCase()} en {zona})</>
            )
          }
        >
          <input type="date" className={`${claseEntrada} min-h-12`} value={caducidad} onChange={(e) => setCaducidad(e.target.value)} />
        </Campo>

        <Campo etiqueta="Tipo de alimento">
          <select
            className={claseEntrada}
            value={cat}
            onChange={(e) => setCatElegida(e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.nombre}
              </option>
            ))}
          </select>
        </Campo>

        {verMas ? (
          <Campo etiqueta="Marca (opcional)">
            <input className={claseEntrada} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej.: Hacendado" />
          </Campo>
        ) : (
          <button type="button" className="text-sm font-semibold text-tomate" onClick={() => setVerMas(true)}>
            + Añadir marca
          </button>
        )}

        <BotonPrincipal type="submit" disabled={!nombre.trim()}>
          {editando ? 'Guardar cambios' : 'Añadir'}
        </BotonPrincipal>
        {editando && (
          <BotonSecundario type="button" onClick={borrar} className="text-red-600">
            <Trash2 size={18} /> Borrar
          </BotonSecundario>
        )}
      </form>
    </Hoja>
  )
}
