import { useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { BotonPrincipal, BotonSecundario, claseEntrada } from '../../componentes/Campos'
import type { MenuIA } from '../../ia/esquema'
import { PuenteManual } from '../../ia/planificador'
import { pegar } from '../../logica/portapapeles'

// Lee el JSON que devuelve la IA, lo valida y muestra los problemas
export default function PegarMenu({ onValido }: { onValido: (menu: MenuIA) => void }) {
  const [texto, setTexto] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [menu, setMenu] = useState<MenuIA | null>(null)
  const [verCaja, setVerCaja] = useState(false)

  function comprobar(t: string) {
    const r = PuenteManual.leerRespuesta(t)
    setErrores(r.errores)
    setAvisos(r.avisos)
    setMenu(r.menu ?? null)
    if (r.menu && !r.avisos.length) onValido(r.menu)
  }

  async function pegarDelPortapapeles() {
    const t = await pegar()
    if (t == null) {
      setVerCaja(true)
      setErrores(['No he podido leer el portapapeles. Pega la respuesta en el cuadro de abajo.'])
      return
    }
    setTexto(t)
    comprobar(t)
  }

  return (
    <div className="space-y-3">
      <BotonPrincipal onClick={pegarDelPortapapeles}>
        <ClipboardPaste size={20} /> Pegar menú
      </BotonPrincipal>
      {!verCaja && (
        <button className="w-full text-center text-sm font-semibold text-suave" onClick={() => setVerCaja(true)}>
          o pégalo a mano
        </button>
      )}
      {verCaja && (
        <>
          <textarea className={`${claseEntrada} resize-none font-mono text-xs`} rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pega aquí la respuesta de la IA" />
          <BotonSecundario onClick={() => comprobar(texto)} disabled={!texto.trim()}>
            Comprobar
          </BotonSecundario>
        </>
      )}

      {errores.length > 0 && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          <p className="mb-2 font-bold">❌ No puedo usar este menú:</p>
          <ul className="list-disc space-y-1 pl-5">
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <p className="mt-3">Puedes copiar estos errores y pedirle a la IA que lo corrija.</p>
        </div>
      )}
      {menu && avisos.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">⚠️ El menú se puede usar, pero revisa esto:</p>
          <ul className="list-disc space-y-1 pl-5">
            {avisos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <BotonPrincipal onClick={() => onValido(menu)}>Usar el menú igualmente</BotonPrincipal>
        </div>
      )}
    </div>
  )
}
