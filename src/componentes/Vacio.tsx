// Mensaje para cuando una lista está vacía
export default function Vacio({ emoji, texto, detalle }: { emoji: string; texto: string; detalle: string }) {
  return (
    <div className="mt-8 flex flex-col items-center px-6 text-center">
      <div className="mb-3 text-6xl">{emoji}</div>
      <p className="text-lg font-semibold">{texto}</p>
      <p className="mt-1 text-suave">{detalle}</p>
    </div>
  )
}
