// Pantalla provisional para lo que aún no está construido
export default function Proximamente({ emoji, titulo, fase }: { emoji: string; titulo: string; fase: number }) {
  return (
    <div className="mt-16 flex flex-col items-center px-6 text-center">
      <div className="mb-3 text-6xl">{emoji}</div>
      <p className="text-lg font-semibold">{titulo}</p>
      <p className="mt-1 text-suave">Llega en la fase {fase}.</p>
    </div>
  )
}
