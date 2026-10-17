// Copiar y pegar. En iPhone, al leer el portapapeles aparece una burbuja "Pegar"
// que hay que tocar: es una medida de privacidad de Apple.

// Safari solo deja copiar justo al tocar un botón. Si el texto aún se está
// preparando (una promesa), se lo pasamos así para no perder ese permiso.
export async function copiar(texto: string | Promise<string>): Promise<boolean> {
  try {
    if (typeof texto === 'string') {
      await navigator.clipboard.writeText(texto)
    } else {
      const blob = texto.then((t) => new Blob([t], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
    }
    return true
  } catch {
    return false
  }
}

export async function pegar(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return null
  }
}
