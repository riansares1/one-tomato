import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Upload } from 'lucide-react'
import { useAviso } from '../../componentes/Aviso'
import { BotonPrincipal, BotonSecundario, Campo, claseEntrada } from '../../componentes/Campos'
import { guardarAjustes, useAjustes } from '../../datos/ajustes'
import { pedirAlmacenamientoPersistente } from '../../datos/db'
import { exportarCopia, importarCopia, leerCopia } from '../../datos/copia'
import type { Ajustes as TipoAjustes, Zona } from '../../datos/tipos'
import { CATEGORIAS, DURACIONES_POR_DEFECTO } from '../../logica/caducidad'
import { fechaCorta, relativa } from '../../logica/fechas'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export default function Ajustes() {
  const ajustes = useAjustes()

  return (
    <div className="space-y-6">
      <CopiaSeguridad ultimaCopia={ajustes.ultimaCopia} />

      <Seccion titulo="Sobre mí" detalle="La IA usará esto para planificar tu semana.">
        <CampoTexto key={ajustes.gustos} etiqueta="Lo que me gusta" campo="gustos" valor={ajustes.gustos} ejemplo="Ej.: legumbres, pasta, cocina mediterránea, picante suave" />
        <CampoTexto key={ajustes.noComo} etiqueta="Alimentos que no como" campo="noComo" valor={ajustes.noComo} ejemplo="Ej.: hígado, coliflor" />
        <CampoTexto key={ajustes.alergias} etiqueta="Alergias o intolerancias" campo="alergias" valor={ajustes.alergias} ejemplo="Ej.: ninguna" />
        <CampoTexto key={ajustes.equipamiento} etiqueta="Equipamiento de cocina" campo="equipamiento" valor={ajustes.equipamiento} ejemplo="Ej.: vitro, horno, microondas, airfryer" />
        <div className="flex gap-3">
          <div className="w-32">
            <Campo etiqueta="Tuppers que tengo">
              <input
                className={claseEntrada}
                inputMode="numeric"
                value={ajustes.numTuppers}
                onChange={(e) => guardarAjustes({ numTuppers: parseInt(e.target.value) || 0 })}
              />
            </Campo>
          </div>
          <div className="flex-1">
            <Campo etiqueta="Día que suelo cocinar">
              <select className={claseEntrada} value={ajustes.diaCocina} onChange={(e) => guardarAjustes({ diaCocina: e.target.value })}>
                {DIAS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Campo>
          </div>
        </div>
      </Seccion>

      <TablaCaducidades duraciones={ajustes.duraciones} />

      <p className="pb-4 text-center text-sm text-suave">One Tomato 🍅 · tus datos solo están en este iPhone</p>
    </div>
  )
}

function Seccion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-tarjeta p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {detalle && <p className="mt-0.5 text-sm text-suave">{detalle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

// Campo de texto que se guarda solo al salir de él.
// Usa key={valor} para reiniciarse si el dato cambia desde fuera (p. ej. al importar una copia).
function CampoTexto({ etiqueta, campo, valor, ejemplo }: { etiqueta: string; campo: keyof TipoAjustes; valor: string; ejemplo: string }) {
  const [texto, setTexto] = useState(valor)
  return (
    <Campo etiqueta={etiqueta}>
      <textarea
        className={`${claseEntrada} min-h-12 resize-none`}
        rows={2}
        value={texto}
        placeholder={ejemplo}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => texto !== valor && guardarAjustes({ [campo]: texto.trim() })}
      />
    </Campo>
  )
}

function CopiaSeguridad({ ultimaCopia }: { ultimaCopia?: string }) {
  const aviso = useAviso()
  const entrada = useRef<HTMLInputElement>(null)
  const [protegido, setProtegido] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    pedirAlmacenamientoPersistente().then(setProtegido)
  }, [])

  async function exportar() {
    setError('')
    try {
      await exportarCopia()
      aviso('Copia creada')
    } catch (e) {
      setError(`No se pudo crear la copia: ${(e as Error).message}`)
    }
  }

  async function importar(archivo: File) {
    setError('')
    try {
      const { copia, resumen } = await leerCopia(archivo)
      if (!window.confirm(`${resumen}\n\nEsto SUSTITUIRÁ todos los datos que tienes ahora. ¿Continuar?`)) return
      await importarCopia(copia)
      aviso('Copia importada')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Seccion titulo="Copia de seguridad" detalle="Tus datos solo viven en este iPhone. Si borras la app, se pierden: guarda una copia de vez en cuando.">
      <div className={`rounded-2xl p-3 text-sm ${protegido ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
        {protegido === null
          ? 'Comprobando almacenamiento…'
          : protegido
            ? '✅ Almacenamiento protegido: el iPhone no borrará tus datos por falta de espacio.'
            : '⚠️ Almacenamiento no protegido. Instala la app en la pantalla de inicio y vuelve a abrir Ajustes.'}
      </div>
      <p className="text-sm text-suave">
        Última copia: {ultimaCopia ? `${fechaCorta(ultimaCopia)} (${relativa(ultimaCopia)})` : 'nunca'}
      </p>
      <BotonPrincipal onClick={exportar}>
        <Download size={20} /> Exportar copia
      </BotonPrincipal>
      <BotonSecundario onClick={() => entrada.current?.click()}>
        <Upload size={18} /> Importar copia
      </BotonSecundario>
      <input
        ref={entrada}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = ''
          if (archivo) importar(archivo)
        }}
      />
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </Seccion>
  )
}

const ZONAS: { zona: Zona; texto: string }[] = [
  { zona: 'despensa', texto: 'Despensa' },
  { zona: 'nevera', texto: 'Nevera' },
  { zona: 'congelador', texto: 'Congel.' },
]

function TablaCaducidades({ duraciones }: { duraciones: TipoAjustes['duraciones'] }) {
  function cambiar(cat: string, zona: Zona, texto: string) {
    const dias = Math.max(0, parseInt(texto) || 0)
    guardarAjustes({ duraciones: { ...duraciones, [cat]: { ...duraciones[cat], [zona]: dias } } })
  }

  return (
    <Seccion titulo="Caducidades estimadas" detalle="Días que suele durar cada tipo de alimento. Se usan cuando no indicas la fecha.">
      <div className="-mx-1">
        <div className="grid grid-cols-[1fr_repeat(3,3.75rem)] gap-1.5 px-1 pb-2 text-center text-xs font-semibold text-suave">
          <span />
          {ZONAS.map((z) => (
            <span key={z.zona}>{z.texto}</span>
          ))}
        </div>
        {CATEGORIAS.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_repeat(3,3.75rem)] items-center gap-1.5 px-1 py-1">
            <span className="text-sm leading-tight">
              {c.emoji} {c.nombre}
            </span>
            {ZONAS.map((z) => (
              <input
                key={z.zona}
                inputMode="numeric"
                className="min-h-10 w-full rounded-xl border border-stone-200 bg-fondo text-center text-base"
                value={duraciones[c.id]?.[z.zona] ?? ''}
                onChange={(e) => cambiar(c.id, z.zona, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
      <BotonSecundario
        onClick={() => {
          if (window.confirm('¿Restaurar la tabla de caducidades a los valores iniciales?')) {
            guardarAjustes({ duraciones: DURACIONES_POR_DEFECTO })
          }
        }}
      >
        Restaurar valores iniciales
      </BotonSecundario>
    </Seccion>
  )
}
