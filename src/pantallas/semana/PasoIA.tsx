import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { BotonPrincipal, BotonSecundario, claseEntrada } from '../../componentes/Campos'
import type { RespuestasAsistente } from '../../datos/tipos'
import type { MenuIA } from '../../ia/esquema'
import { prepararPrompt } from '../../ia/planificador'
import { copiar } from '../../logica/portapapeles'
import PegarMenu from './PegarMenu'

const IAS = [
  { nombre: 'Claude', url: 'https://claude.ai/new' },
  { nombre: 'ChatGPT', url: 'https://chatgpt.com/' },
  { nombre: 'Gemini', url: 'https://gemini.google.com/app' },
]

// Paso intermedio: copiar el prompt, llevarlo a la IA y pegar la respuesta
export default function PasoIA({ respuestas, onMenu, onAtras }: { respuestas: RespuestasAsistente; onMenu: (m: MenuIA) => void; onAtras: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const [textoManual, setTextoManual] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)

  // Lo preparamos al entrar, para que al tocar "Copiar" esté listo
  useEffect(() => {
    prepararPrompt(respuestas).then(setPrompt)
  }, [respuestas])

  async function copiarPrompt() {
    const texto = prompt ?? prepararPrompt(respuestas)
    if (await copiar(texto)) setCopiado(true)
    else setTextoManual(await texto) // si no deja copiar, lo mostramos para copiarlo a mano
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Planificar con IA</h2>

      <Paso numero={1} titulo="Copia la petición" hecho={copiado}>
        <BotonPrincipal onClick={copiarPrompt}>
          <Copy size={20} /> {copiado ? '¡Copiado! Copiar otra vez' : 'Copiar prompt'}
        </BotonPrincipal>
        {textoManual && (
          <>
            <p className="text-sm text-suave">No he podido copiar automáticamente. Mantén pulsado el texto → Seleccionar todo → Copiar.</p>
            <textarea readOnly className={`${claseEntrada} font-mono text-xs`} rows={6} value={textoManual} onFocus={(e) => e.target.select()} />
          </>
        )}
      </Paso>

      <Paso numero={2} titulo="Pégala en tu IA y espera la respuesta">
        <div className="grid grid-cols-3 gap-2">
          {IAS.map((ia) => (
            <a key={ia.nombre} href={ia.url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-2xl bg-tarjeta font-semibold ring-1 ring-black/5">
              {ia.nombre}
            </a>
          ))}
        </div>
        <p className="text-sm text-suave">Cuando responda, copia la respuesta completa (en Claude y ChatGPT hay un botón de copiar debajo del mensaje).</p>
      </Paso>

      <Paso numero={3} titulo="Vuelve aquí y pega el menú">
        <PegarMenu onValido={onMenu} />
      </Paso>

      <BotonSecundario onClick={onAtras}>Volver a las preguntas</BotonSecundario>
    </div>
  )
}

function Paso({ numero, titulo, hecho, children }: { numero: number; titulo: string; hecho?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="flex items-center gap-3 text-lg font-bold">
        <span className={`flex size-8 items-center justify-center rounded-full text-sm text-white ${hecho ? 'bg-emerald-500' : 'bg-tomate'}`}>{hecho ? '✓' : numero}</span>
        {titulo}
      </h3>
      {children}
    </section>
  )
}
