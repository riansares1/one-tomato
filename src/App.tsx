import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router'
import { BookOpen, CalendarDays, ChevronLeft, House, ScanBarcode, Settings, ShoppingCart, Refrigerator } from 'lucide-react'

const PESTANAS = [
  { ruta: '/', texto: 'Inicio', Icono: House },
  { ruta: '/cocina', texto: 'Mi cocina', Icono: Refrigerator },
  { ruta: '/semana', texto: 'Semana', Icono: CalendarDays },
  { ruta: '/recetas', texto: 'Recetas', Icono: BookOpen },
  { ruta: '/compra', texto: 'Compra', Icono: ShoppingCart },
]

const TITULOS: Record<string, string> = {
  '/': 'One Tomato',
  '/cocina': 'Mi cocina',
  '/semana': 'Semana',
  '/recetas': 'Recetas',
  '/compra': 'Compra',
  '/escanear': 'Escanear',
  '/ajustes': 'Ajustes',
  '/cocinar': 'Sesión de cocina',
}

// Estructura común: barra superior, contenido y barra inferior
export default function App() {
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const esSubpantalla = ['/ajustes', '/escanear', '/cocinar'].includes(pathname)

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-30 bg-fondo/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-4">
          {esSubpantalla && (
            <button onClick={() => navegar(-1)} className="-ml-2 rounded-full p-2 active:bg-stone-200" aria-label="Volver">
              <ChevronLeft size={26} />
            </button>
          )}
          <h1 className="flex-1 truncate text-xl font-bold">{TITULOS[pathname] ?? 'One Tomato'}</h1>
          {!esSubpantalla && (
            <>
              <Link to="/escanear" className="rounded-full p-2 text-texto active:bg-stone-200" aria-label="Escanear código de barras">
                <ScanBarcode size={24} />
              </Link>
              <Link to="/ajustes" className="-mr-2 rounded-full p-2 text-texto active:bg-stone-200" aria-label="Ajustes">
                <Settings size={24} />
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="px-4 pt-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-tarjeta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PESTANAS.map(({ ruta, texto, Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/'}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-tomate' : 'text-suave'}`
              }
            >
              <Icono size={24} />
              {texto}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
