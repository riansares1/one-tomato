# One Tomato 🍅

Planificador semanal de comidas para una persona que cocina una vez por semana (batch cooking).
Es una PWA para iPhone: se instala desde Safari y guarda todos los datos en el propio teléfono.

## Qué hace

- **Mi cocina**: inventario de despensa, nevera, congelador y tuppers, con colores según la caducidad.
- **Escáner**: lee códigos de barras, busca el producto en Open Food Facts y recuerda tus correcciones.
- **Semana**: asistente de preguntas → prompt para Claude/ChatGPT/Gemini → pegas el menú (JSON) → vista por días.
- **Recetas**: favoritas y lista «Quiero probar» (enlaces de webs y vídeos).
- **Compra**: lista por secciones de Mercadona; «Lo he comprado» lo pasa al inventario.
- **Sesión de cocina**: pasos con temporizadores; al terminar crea los tuppers y resta del inventario.
- **Ajustes**: gustos, alergias, tabla de caducidades, instrucciones para la IA y copia de seguridad.

## Cómo está hecha

- Vite + React + TypeScript + Tailwind.
- Datos en IndexedDB (con Dexie), sin servidor ni cuentas.
- `vite-plugin-pwa` para instalarla y usarla sin conexión.
- `@zxing/browser` para el escáner (Safari no tiene `BarcodeDetector`).
- `zod` para validar el JSON que devuelve la IA (`src/ia/esquema.ts`).
- La IA está detrás de la interfaz `PlanificadorIA` (`src/ia/planificador.ts`): hoy es copiar y pegar;
  en el futuro se puede añadir una llamada a una API sin tocar el resto.

## Comandos

```bash
npm install     # instalar dependencias
npm run dev     # abrir en modo desarrollo
npm run build   # generar la versión final (carpeta dist)
```

Cada `git push` a `main` se publica solo en Vercel.
