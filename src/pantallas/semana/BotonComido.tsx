import { useAviso } from '../../componentes/Aviso'
import type { HuecoMenu } from '../../ia/esquema'
import { hoy } from '../../logica/fechas'
import { comerHueco } from '../../logica/tuppers'

interface Props {
  planId: string
  fecha: string
  momento: 'comida' | 'cena'
  hueco: HuecoMenu
  onCocinar: () => void // plato sin tupper: se abre «Lo he cocinado»
}

// Botón "Comido" junto a un plato de hoy (o de días anteriores)
export default function BotonComido({ planId, fecha, momento, hueco, onCocinar }: Props) {
  const aviso = useAviso()
  if (fecha > hoy() || !hueco.plato || hueco.origen === 'fuera') return null
  if (hueco.consumido) return <span className="shrink-0 self-center rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700">✓ Comido</span>

  const deTupper = !!hueco.tupperId || hueco.origen === 'tupper-existente'
  return (
    <button
      onClick={async () => {
        if (!deTupper) return onCocinar()
        const deshacer = await comerHueco(planId, fecha, momento)
        aviso(hueco.tupperId ? `¡Que aproveche! Una ración menos de ${hueco.plato}` : '¡Que aproveche!', deshacer)
      }}
      className="shrink-0 self-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white active:bg-emerald-700"
    >
      Comido
    </button>
  )
}
