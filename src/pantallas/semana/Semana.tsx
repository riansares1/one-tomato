import { useState } from 'react'
import { useAviso } from '../../componentes/Aviso'
import { BotonSecundario } from '../../componentes/Campos'
import Hoja from '../../componentes/Hoja'
import type { RespuestasAsistente } from '../../datos/tipos'
import type { MenuIA } from '../../ia/esquema'
import { hoy } from '../../logica/fechas'
import { guardarPlan, menuEnBlanco, usePlanActual } from '../../logica/plan'
import Asistente from './Asistente'
import PasoIA from './PasoIA'
import PegarMenu from './PegarMenu'
import VistaMenu from './VistaMenu'

type Modo = { tipo: 'menu' } | { tipo: 'asistente'; respuestas?: RespuestasAsistente } | { tipo: 'ia'; respuestas: RespuestasAsistente }

export default function Semana() {
  const plan = usePlanActual()
  const aviso = useAviso()
  const [modo, setModo] = useState<Modo>({ tipo: 'menu' })
  const [pegandoOtro, setPegandoOtro] = useState(false)

  if (plan === undefined) return null

  async function usarMenu(menu: MenuIA, respuestas?: RespuestasAsistente) {
    await guardarPlan(menu, respuestas)
    aviso(`Menú guardado: ${menu.listaCompra.length} cosas en la lista de la compra`)
    setModo({ tipo: 'menu' })
    setPegandoOtro(false)
  }

  if (modo.tipo === 'ia') {
    return <PasoIA respuestas={modo.respuestas} onMenu={(m) => usarMenu(m, modo.respuestas)} onAtras={() => setModo({ tipo: 'asistente', respuestas: modo.respuestas })} />
  }

  // Sin plan, o el último ya terminó → asistente
  const hayPlanVigente = plan && plan.hasta >= hoy()
  if (modo.tipo === 'asistente' || !hayPlanVigente) {
    return (
      <div className="space-y-4">
        {!hayPlanVigente && modo.tipo !== 'asistente' && (
          <div className="rounded-3xl bg-tarjeta p-5 text-center shadow-sm ring-1 ring-black/5">
            <div className="text-5xl">📅</div>
            <p className="mt-2 text-lg font-semibold">{plan ? 'Tu menú anterior ya terminó.' : 'Aún no has planificado ninguna semana.'}</p>
            <p className="text-suave">Responde unas preguntas rápidas y preparamos la siguiente.</p>
          </div>
        )}
        <Asistente
          inicial={modo.tipo === 'asistente' ? modo.respuestas : undefined}
          onPlanificarIA={(respuestas) => setModo({ tipo: 'ia', respuestas })}
          onAMano={(r) => usarMenu(menuEnBlanco(r), r)}
          onCancelar={hayPlanVigente ? () => setModo({ tipo: 'menu' }) : undefined}
        />
        {!hayPlanVigente && (
          <BotonSecundario onClick={() => setPegandoOtro(true)}>📋 Ya tengo un menú: pegarlo</BotonSecundario>
        )}
        {pegandoOtro && (
          <Hoja titulo="Pegar menú" onCerrar={() => setPegandoOtro(false)}>
            <PegarMenu onValido={(m) => usarMenu(m)} />
          </Hoja>
        )}
      </div>
    )
  }

  return (
    <>
      <VistaMenu
        plan={plan}
        onNuevaSemana={() => {
          if (window.confirm('¿Planificar otra semana? El menú actual se sustituirá (la lista de la compra también).')) setModo({ tipo: 'asistente' })
        }}
        onPegarOtro={() => setPegandoOtro(true)}
      />
      {pegandoOtro && (
        <Hoja titulo="Pegar menú corregido" onCerrar={() => setPegandoOtro(false)}>
          <PegarMenu onValido={(m) => usarMenu(m, plan.respuestas)} />
        </Hoja>
      )}
    </>
  )
}
