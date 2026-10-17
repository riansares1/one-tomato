// Pantalla provisional de la Fase 0: solo comprueba que la web se publica bien.
export default function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-7xl">🍅</div>
      <h1 className="text-3xl font-bold">One Tomato</h1>
      <p className="max-w-xs text-suave">
        Tu planificador semanal de comidas. Muy pronto, aquí estará tu cocina.
      </p>
      <span className="rounded-full bg-tomate px-4 py-2 text-sm font-semibold text-white">
        Fase 0 · funcionando
      </span>
    </main>
  )
}
