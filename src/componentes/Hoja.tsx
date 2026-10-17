import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

// Panel que sube desde abajo (para formularios rápidos)
export default function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  // Evita que la página de detrás se desplace mientras la hoja está abierta
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCerrar} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-t-3xl bg-fondo px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <button onClick={onCerrar} className="-mr-2 rounded-full p-2 text-suave active:bg-stone-200" aria-label="Cerrar">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
