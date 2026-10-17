import type { ReactNode } from 'react'

// Piezas de formulario con el mismo estilo en toda la app.
// Los textos van a 16px como mínimo para que el iPhone no haga zoom al escribir.

export const claseEntrada =
  'w-full rounded-2xl border border-stone-200 bg-tarjeta px-4 py-3 text-base outline-none focus:border-tomate focus:ring-2 focus:ring-tomate/20'

// Usa grupo=true cuando dentro hay botones (no un cuadro de texto),
// para que tocar el título no pulse el primer botón.
export function Campo({ etiqueta, children, ayuda, grupo }: { etiqueta: string; children: ReactNode; ayuda?: ReactNode; grupo?: boolean }) {
  const Envoltorio = grupo ? 'div' : 'label'
  return (
    <Envoltorio className="block">
      <span className="mb-1.5 block text-sm font-semibold text-suave">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-sm text-suave">{ayuda}</span>}
    </Envoltorio>
  )
}

// Fila de botones para elegir una opción (como un interruptor de varias posiciones)
export function Selector<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambio: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-stone-200/70 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambio(o.valor)}
          className={`min-h-11 min-w-0 flex-1 rounded-xl px-1 text-sm font-semibold transition ${
            valor === o.valor ? 'bg-tarjeta text-texto shadow-sm' : 'text-suave'
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function BotonPrincipal({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-tomate px-5 text-lg font-semibold text-white shadow-sm active:bg-tomate-oscuro disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function BotonSecundario({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-tarjeta px-4 font-semibold text-texto active:bg-stone-100 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}
