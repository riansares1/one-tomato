import { StrictMode } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ProveedorAvisos } from './componentes/Aviso.tsx'
import { pedirAlmacenamientoPersistente } from './datos/db.ts'
import Ajustes from './pantallas/ajustes/Ajustes.tsx'
import MiCocina from './pantallas/cocina/MiCocina.tsx'
import Inicio from './pantallas/inicio/Inicio.tsx'
import Escanear from './pantallas/escanear/Escanear.tsx'
import Semana from './pantallas/semana/Semana.tsx'
import Recetas from './pantallas/recetas/Recetas.tsx'
import Compra from './pantallas/compra/Compra.tsx'
import Sesion from './pantallas/cocinar/Sesion.tsx'

// Nada más abrir, pedimos al iPhone que conserve nuestros datos
pedirAlmacenamientoPersistente()

// Busca versiones nuevas al abrir y cada vez que vuelves a la app; si hay una, recarga sola.
// (En iPhone la app se queda "dormida" en segundo plano y no se recarga por sí misma.)
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    const buscar = () => registro.update().catch(() => {})
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && buscar())
    setInterval(buscar, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorAvisos>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Inicio />} />
            <Route path="cocina" element={<MiCocina />} />
            <Route path="escanear" element={<Escanear />} />
            <Route path="semana" element={<Semana />} />
            <Route path="recetas" element={<Recetas />} />
            <Route path="compra" element={<Compra />} />
            <Route path="cocinar" element={<Sesion />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Inicio />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProveedorAvisos>
  </StrictMode>,
)
