import { useEffect, useRef, useState } from 'react'
import { Keyboard, RotateCcw } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, BotonSecundario, claseEntrada } from '../../componentes/Campos'
import { useAjustes } from '../../datos/ajustes'
import { db, nuevoId } from '../../datos/db'
import type { Producto, ProductoConocido } from '../../datos/tipos'
import { categoria, estimarCaducidad } from '../../logica/caducidad'
import { fechaCorta, hoy } from '../../logica/fechas'
import { buscarDuplicado, guardarProducto } from '../../logica/inventario'
import { mostrarNumero } from '../../logica/numeros'
import { buscarEnOFF } from '../../logica/openfoodfacts'
import FormProducto, { PreguntaSumar } from '../cocina/FormProducto'

type Estado =
  | { paso: 'camara' }
  | { paso: 'buscando'; codigo: string }
  | { paso: 'confirmar'; producto: Producto; deMemoria: boolean }
  | { paso: 'corregir'; producto: Producto }
  | { paso: 'no'; producto: Producto }
  | { paso: 'a-mano'; codigo: string; motivo: string }
  | { paso: 'sumar'; existente: Producto; nuevo: Producto }

// Lo que guardamos para que la próxima vez salga igual
function aConocido(p: Producto, origen: ProductoConocido['origen']): ProductoConocido {
  return {
    codigoBarras: p.codigoBarras!,
    nombre: p.nombre,
    marca: p.marca,
    cantidad: p.cantidad,
    unidad: p.unidad,
    categoria: p.categoria,
    zona: p.zona,
    origen,
  }
}

export default function Escanear() {
  const ajustes = useAjustes()
  const aviso = useAviso()
  const [estado, setEstado] = useState<Estado>({ paso: 'camara' })

  async function buscar(codigo: string) {
    setEstado({ paso: 'buscando', codigo })
    const nuevo = (datos: Omit<Producto, 'id' | 'caducidad' | 'caducidadTipo' | 'anadidoEl' | 'codigoBarras'>): Producto => ({
      ...datos,
      id: nuevoId(),
      codigoBarras: codigo,
      caducidad: estimarCaducidad(datos.categoria, datos.zona, ajustes.duraciones),
      caducidadTipo: 'estimada',
      anadidoEl: hoy(),
    })

    // 1) ¿Ya lo conozco? (incluye tus correcciones)
    const conocido = await db.productosConocidos.get(codigo)
    if (conocido) {
      const { codigoBarras: _, origen: __, ...datos } = conocido
      return setEstado({ paso: 'confirmar', producto: nuevo(datos), deMemoria: true })
    }

    // 2) Open Food Facts
    try {
      const off = await buscarEnOFF(codigo)
      if (!off) return setEstado({ paso: 'a-mano', codigo, motivo: 'No conozco este producto. Dime qué es una vez y lo recordaré para la próxima.' })
      setEstado({ paso: 'confirmar', producto: nuevo({ ...off, zona: categoria(off.categoria).zonaHabitual }), deMemoria: false })
    } catch (e) {
      setEstado({ paso: 'a-mano', codigo, motivo: `${(e as Error).message} Puedes añadirlo a mano y lo recordaré.` })
    }
  }

  // "Sí": se guarda tal cual (o se pregunta si sumar)
  async function confirmar(p: Producto, deMemoria: boolean) {
    if (!deMemoria) await db.productosConocidos.put(aConocido(p, 'openfoodfacts'))
    const existente = await buscarDuplicado(p)
    if (existente) return setEstado({ paso: 'sumar', existente, nuevo: p })
    await guardarProducto(p)
    aviso(`Añadido: ${p.nombre}`)
    setEstado({ paso: 'camara' })
  }

  const otraVez = () => setEstado({ paso: 'camara' })

  switch (estado.paso) {
    case 'camara':
      return <Camara onCodigo={buscar} />

    case 'buscando':
      return (
        <div className="mt-24 flex flex-col items-center text-center">
          <div className="animate-bounce text-6xl">🔎</div>
          <p className="mt-4 text-lg font-semibold">Buscando el producto…</p>
          <p className="text-suave">Código {estado.codigo}</p>
        </div>
      )

    case 'confirmar': {
      const p = estado.producto
      const c = categoria(p.categoria)
      const queEs = p.unidad === 'ud' ? `${mostrarNumero(p.cantidad)} ${p.nombre}` : `${p.nombre} (${mostrarNumero(p.cantidad)} ${p.unidad})`
      return (
        <div className="mt-4 space-y-4">
          <div className="rounded-3xl bg-tarjeta p-6 text-center shadow-sm ring-1 ring-black/5">
            <div className="text-6xl">{c.emoji}</div>
            <p className="mt-3 text-sm text-suave">¿Has escaneado…</p>
            <p className="text-2xl leading-tight font-bold">{queEs}?</p>
            {p.marca && <p className="mt-1 text-suave">{p.marca}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm whitespace-nowrap">
              <span className="rounded-full bg-stone-100 px-3 py-1">📍 {p.zona}</span>
              <span className="rounded-full bg-stone-100 px-3 py-1">⏰ Caduca aprox. {fechaCorta(p.caducidad!)}</span>
            </div>
            {estado.deMemoria && <p className="mt-3 text-xs text-suave">✨ Lo recuerdo de la última vez</p>}
          </div>
          <BotonPrincipal onClick={() => confirmar(p, estado.deMemoria)}>✅ Sí</BotonPrincipal>
          <BotonSecundario onClick={() => setEstado({ paso: 'corregir', producto: p })}>✏️ Casi (corregir algo)</BotonSecundario>
          <BotonSecundario onClick={() => setEstado({ paso: 'no', producto: p })}>❌ No</BotonSecundario>
        </div>
      )
    }

    case 'corregir':
      return (
        <FormProducto
          inicial={estado.producto}
          zonaInicial={estado.producto.zona}
          titulo="Corrige lo que haga falta"
          mensaje="Guardaré tu corrección: la próxima vez que escanees este producto saldrá así."
          onGuardado={(p) => db.productosConocidos.put(aConocido(p, 'corregido'))}
          onCerrar={otraVez}
        />
      )

    case 'no':
      return (
        <div className="mt-10 space-y-4 text-center">
          <div className="text-6xl">🤔</div>
          <p className="text-lg font-semibold">Vaya, no era eso.</p>
          <BotonPrincipal onClick={() => setEstado({ paso: 'a-mano', codigo: estado.producto.codigoBarras!, motivo: 'Dime qué es y lo recordaré para la próxima vez.' })}>
            Añadir a mano
          </BotonPrincipal>
          <BotonSecundario onClick={otraVez}>Descartar y escanear otro</BotonSecundario>
        </div>
      )

    case 'a-mano':
      return (
        <FormProducto
          inicial={{ codigoBarras: estado.codigo }}
          titulo="Añadir a mano"
          mensaje={estado.motivo}
          onGuardado={(p) => db.productosConocidos.put(aConocido(p, 'manual'))}
          onCerrar={otraVez}
        />
      )

    case 'sumar':
      return <PreguntaSumar existente={estado.existente} nuevo={estado.nuevo} onHecho={otraVez} onCerrar={otraVez} />
  }
}

// Vista de cámara que lee códigos de barras con ZXing
function Camara({ onCodigo }: { onCodigo: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const [intento, setIntento] = useState(0)
  // Guardamos la función en una referencia para no reiniciar la cámara en cada pintado
  const avisarCodigo = useRef(onCodigo)
  useEffect(() => {
    avisarCodigo.current = onCodigo
  })

  useEffect(() => {
    let parar: (() => void) | undefined
    let cancelado = false

    async function iniciar() {
      // Se carga solo al abrir el escáner, para que el resto de la app vaya más rápida
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
      const pistas = new Map()
      pistas.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
      const lector = new BrowserMultiFormatReader(pistas, { delayBetweenScanAttempts: 150 })
      try {
        const controles = await lector.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current!,
          (resultado, _err, c) => {
            if (resultado) {
              c.stop()
              avisarCodigo.current(resultado.getText())
            }
          },
        )
        if (cancelado) controles.stop()
        else parar = () => controles.stop()
      } catch (e) {
        const nombre = (e as Error).name
        setError(
          nombre === 'NotAllowedError'
            ? 'No tengo permiso para usar la cámara. Ciérrala y vuelve a entrar para que el iPhone te lo pregunte otra vez, o revisa Ajustes del iPhone → Safari → Cámara.'
            : nombre === 'NotFoundError'
              ? 'No encuentro ninguna cámara en este dispositivo.'
              : `No he podido abrir la cámara (${(e as Error).message}).`,
        )
      }
    }
    iniciar()
    return () => {
      cancelado = true
      parar?.()
    }
  }, [intento])

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-black">
        <video ref={video} className="h-full w-full object-cover" playsInline muted autoPlay />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-4/5 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <p>{error}</p>
            <button onClick={() => { setError(''); setIntento((n) => n + 1) }} className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-3 font-semibold">
              <RotateCcw size={18} /> Reintentar
            </button>
          </div>
        )}
      </div>
      {!error && <p className="text-center text-suave">Apunta al código de barras. Si no enfoca, aleja un poco el móvil.</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const c = manual.replace(/\D/g, '')
          if (c.length >= 6) onCodigo(c)
        }}
      >
        <div className="relative flex-1">
          <Keyboard size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-suave" />
          <input className={`${claseEntrada} pl-11`} inputMode="numeric" placeholder="O escribe el código" value={manual} onChange={(e) => setManual(e.target.value)} />
        </div>
        <button className="rounded-2xl bg-tomate px-5 font-semibold text-white disabled:opacity-50" disabled={manual.replace(/\D/g, '').length < 6}>
          Buscar
        </button>
      </form>
    </div>
  )
}
