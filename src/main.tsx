import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ProveedorAvisos } from './componentes/Aviso.tsx'
import Proximamente from './componentes/Proximamente.tsx'
import { pedirAlmacenamientoPersistente } from './datos/db.ts'
import Ajustes from './pantallas/ajustes/Ajustes.tsx'
import MiCocina from './pantallas/cocina/MiCocina.tsx'
import Inicio from './pantallas/inicio/Inicio.tsx'

// Nada más abrir, pedimos al iPhone que conserve nuestros datos
pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorAvisos>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Inicio />} />
            <Route path="cocina" element={<MiCocina />} />
            <Route path="escanear" element={<Proximamente emoji="📷" titulo="Escáner de códigos de barras" fase={2} />} />
            <Route path="semana" element={<Proximamente emoji="📅" titulo="Plan semanal y menú" fase={3} />} />
            <Route path="recetas" element={<Proximamente emoji="📖" titulo="Favoritas y Quiero probar" fase={3} />} />
            <Route path="compra" element={<Proximamente emoji="🛒" titulo="Lista de la compra" fase={3} />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Inicio />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProveedorAvisos>
  </StrictMode>,
)
