import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface DatosAviso {
  texto: string
  deshacer?: () => void
}

const Contexto = createContext<(texto: string, deshacer?: () => void) => void>(() => {})

// Mensajito temporal abajo de la pantalla, con botón "Deshacer" opcional
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<DatosAviso | null>(null)
  const temporizador = useRef<number>(undefined)

  const mostrar = useCallback((texto: string, deshacer?: () => void) => {
    window.clearTimeout(temporizador.current)
    setAviso({ texto, deshacer })
    temporizador.current = window.setTimeout(() => setAviso(null), deshacer ? 5000 : 2500)
  }, [])

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-md items-center gap-4 rounded-2xl bg-stone-800 px-4 py-3 text-white shadow-lg">
            <span className="text-sm">{aviso.texto}</span>
            {aviso.deshacer && (
              <button
                className="font-semibold text-orange-300"
                onClick={() => {
                  aviso.deshacer?.()
                  setAviso(null)
                }}
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}
    </Contexto.Provider>
  )
}

export const useAviso = () => useContext(Contexto)
