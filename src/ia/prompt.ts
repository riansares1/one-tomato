import type { Ajustes, Producto, Receta, RespuestasAsistente, Tupper } from '../datos/tipos'
import { caducidadTupper } from '../logica/caducidad'
import { deTexto, hoy } from '../logica/fechas'
import { mostrarNumero } from '../logica/numeros'

// Todo lo que la IA necesita saber para planificar la semana
export interface ContextoPlan {
  respuestas: RespuestasAsistente
  productos: Producto[]
  tuppers: Tupper[]
  favoritas: Receta[]
  aProbar: Receta[]
  ajustes: Ajustes
}

const EJEMPLO = `{
  "version": 1,
  "semana": { "desde": "2026-10-19", "hasta": "2026-10-25" },
  "diaCocina": "2026-10-18",
  "menu": [
    {
      "fecha": "2026-10-19",
      "comida": { "plato": "Lentejas con verduras", "origen": "tupper-existente", "recetaId": null, "tupperExistente": "Lentejas (preparado 2026-10-12)", "paraLlevar": true, "nota": "Calentar en el micro de la uni" },
      "cena": { "plato": "Tortilla de calabacín", "origen": "nuevo", "recetaId": "r1", "tupperExistente": null, "paraLlevar": false, "nota": null }
    }
  ],
  "recetas": [
    {
      "id": "r1", "nombre": "Tortilla de calabacín", "raciones": 2, "tiempoMin": 25,
      "esRecetaAProbar": false, "enlaceOrigen": null,
      "ingredientes": [ { "nombre": "huevo", "cantidad": 3, "unidad": "ud", "deInventario": true } ],
      "pasos": ["Corta el calabacín en láminas finas", "..."],
      "conservacion": "nevera"
    }
  ],
  "listaCompra": [ { "nombre": "calabacín", "cantidad": 1, "unidad": "ud", "seccion": "fruta-verdura" } ],
  "sesionCocina": {
    "duracionTotalMin": 110,
    "pasos": [ { "orden": 1, "texto": "Pon a cocer el arroz", "minutos": 18, "temporizador": true, "recetaId": "r2" } ]
  },
  "tuppersResultantes": [
    { "plato": "Arroz con pollo", "recetaId": "r2", "raciones": 1, "zona": "congelador", "estado": "listo", "falta": null, "paraComerEl": "2026-10-23", "pasarANeveraEl": "2026-10-22" }
  ],
  "avisos": [ { "fecha": "2026-10-22", "texto": "Pasa el arroz con pollo del congelador a la nevera" } ]
}`

// Reglas y formato que no cambian de una semana a otra.
// Se pueden copiar desde Ajustes para guardarlas en un Proyecto de Claude.
export const INSTRUCCIONES_FIJAS = `Eres mi planificador de comidas semanal. Vivo solo y cocino una vez por semana (batch cooking), dejando la comida preparada en tuppers.

REGLAS
1. Usa primero los tuppers que ya tengo, tanto los listos como los casi listos (los "casi listos" indican lo que les falta).
2. Prioriza los ingredientes que caducan antes.
3. Raciones para 1 persona. No propongas compras que se vayan a estropear antes de usarlas: cantidades pequeñas y aprovechando lo que ya hay.
4. Seguridad alimentaria: la comida cocinada dura 3-4 días en la nevera desde el día de cocina. Lo que se vaya a comer más tarde va al congelador; indica qué día pasarlo a la nevera para descongelar (normalmente el día anterior a comerlo).
5. Los días que como en la uni necesito un plato que se coma frío o se transporte y caliente bien (marca "paraLlevar": true).
6. Respeta las comidas y cenas fuera de casa: ponlas con "origen": "fuera".
7. No uses más tuppers de los que tengo. Ajusta la sesión de cocina al tiempo disponible y a mi equipamiento.
8. Puedes repetir mis recetas favoritas cuando encajen con lo que tengo.
9. Adapta a 1 persona las recetas que he elegido probar. Si el enlace es de una web, puedes abrirlo; si es un vídeo, básate en la descripción o nota guardada.
10. Respeta SIEMPRE mis alergias y los alimentos que no como.
11. Ordena los pasos de la sesión de cocina de la forma más eficiente (lo que más tarda, primero; aprovecha los tiempos de espera). Indica los minutos en los pasos que necesiten temporizador.

FORMATO DE RESPUESTA
Responde SOLO con un bloque JSON válido, sin texto antes ni después, con exactamente esta estructura:

${EJEMPLO}

Detalles del formato:
- Fechas siempre como "AAAA-MM-DD".
- "menu": un elemento por cada día de la semana, cada uno con "comida" y "cena".
- "origen": "tupper-existente" (un tupper que YA tengo; indica cuál en "tupperExistente"), "nuevo" (se cocina en esta sesión; pon su "recetaId") o "fuera" (como fuera de casa).
- "recetas": solo las que se cocinan en esta sesión. Cada "recetaId" usado en el menú debe existir aquí. "deInventario": true si el ingrediente ya lo tengo en casa.
- "unidad": "g", "kg", "ml", "l" o "ud" siempre que sea posible.
- "seccion" de la lista de la compra: "fruta-verdura", "carne", "pescado", "charcuteria-quesos", "lacteos-huevos", "panaderia", "despensa", "conservas", "congelados", "bebidas" u "otros".
- "listaCompra": solo lo que me falta comprar.
- "tuppersResultantes": los tuppers que saldrán de la sesión, con "zona" "nevera" o "congelador", "estado" "listo" o "casi" (en "falta" explica qué le falta, p. ej. "añadir fideos, 5 min"), el día que se come ("paraComerEl") y, si van al congelador, "pasarANeveraEl".
- "avisos": recordatorios con fecha (descongelar, comprar pan fresco...).`

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const conDia = (f: string) => `${DIAS_SEMANA[deTexto(f).getDay()]} ${f}`

function lista(lineas: string[], vacio = '(nada)') {
  return lineas.length ? lineas.map((l) => `- ${l}`).join('\n') : vacio
}

export function generarPrompt(c: ContextoPlan): string {
  const r = c.respuestas
  const a = c.ajustes

  const inventario = (['nevera', 'congelador', 'despensa'] as const).map((zona) => {
    const items = c.productos
      .filter((p) => p.zona === zona)
      .sort((x, y) => (x.caducidad ?? '9999').localeCompare(y.caducidad ?? '9999'))
      .map((p) => {
        const cad = p.caducidad ? `, caduca ${p.caducidad}${p.caducidadTipo === 'estimada' ? ' (estimado)' : ''}` : ''
        return `${p.nombre}${p.marca ? ` (${p.marca})` : ''}: ${mostrarNumero(p.cantidad)} ${p.unidad}${cad}`
      })
    return `${zona.toUpperCase()}:\n${lista(items)}`
  })

  const tuppers = c.tuppers.map((t) => {
    const estado = t.estado === 'casi' ? `casi listo (falta: ${t.falta ?? 'sin indicar'})` : 'listo'
    const zona = t.zona === 'congelador' ? 'congelador' : t.enNeveraDesde ? 'nevera (descongelado)' : 'nevera'
    return `${t.plato}: ${t.raciones} ración(es), preparado ${t.preparadoEl}, en ${zona}, ${estado}, tomar antes de ${caducidadTupper(t, a.duraciones)}`
  })

  const fuera = r.fuera.flatMap((f) => [f.comida && `comida del ${conDia(f.fecha)}`, f.cena && `cena del ${conDia(f.fecha)}`].filter(Boolean) as string[])

  const favoritas = c.favoritas.map((f) => {
    const ing = f.ingredientes?.length ? ` — ingredientes: ${f.ingredientes.map((i) => i.nombre).join(', ')}` : ''
    return `${f.nombre}${ing}`
  })

  const aProbar = c.aProbar.map((p) => {
    const partes = [`${p.nombre} (${p.tipoEnlace === 'video' ? 'vídeo' : 'web'})`]
    if (p.enlace) partes.push(`enlace: ${p.enlace}`)
    if (p.nota) partes.push(`descripción/nota: ${p.nota.replace(/\s+/g, ' ')}`)
    return partes.join(' — ')
  })

  return `${INSTRUCCIONES_FIJAS}
${a.instruccionesIA.trim() ? `\nMIS INSTRUCCIONES EXTRA\n${a.instruccionesIA.trim()}\n` : ''}
=====================================
DATOS DE ESTA SEMANA (hoy es ${conDia(hoy())})

Semana a planificar: del ${conDia(r.desde)} al ${conDia(r.hasta)}.
Día de cocina: ${conDia(r.diaCocina)}. Tiempo disponible para cocinar: ${r.tiempo}.
Días que como en la uni (tupper para llevar, frío o fácil de transportar): ${r.diasUni.length ? r.diasUni.map(conDia).join(', ') : 'ninguno'}.
Comidas o cenas fuera de casa: ${fuera.length ? fuera.join(', ') : 'ninguna'}.
Antojos o platos que me apetecen: ${r.antojos.trim() || 'ninguno en especial'}.
${r.notas.trim() ? `Otras notas: ${r.notas.trim()}\n` : ''}
SOBRE MÍ
- Me gusta: ${a.gustos || 'sin indicar'}
- No como: ${a.noComo || 'nada en especial'}
- Alergias o intolerancias: ${a.alergias || 'ninguna'}
- Equipamiento: ${a.equipamiento || 'sin indicar'}
- Tuppers disponibles: ${a.numTuppers}

MIS TUPPERS YA PREPARADOS
${lista(tuppers, '(no tengo tuppers preparados)')}

MI INVENTARIO
${inventario.join('\n\n')}

MIS RECETAS FAVORITAS
${lista(favoritas, '(todavía no tengo favoritas)')}

RECETAS NUEVAS QUE QUIERO PROBAR ESTA SEMANA
${lista(aProbar, '(ninguna esta semana)')}

Recuerda: responde SOLO con el bloque JSON.`
}
