import { Outlet, useLocation, Link } from "react-router-dom";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  Monitor,
  LayoutDashboard,
  Eye,
  Megaphone,
  Newspaper,
  Mail,
  Video,
  BookOpen,
  BrainCircuit,
  UserCog,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TextScaleWidget from "../components/TextScaleWidget";
import { useLayout } from "../context/LayoutContext";

/**
 * COMPONENTE: MainLayout (Shell Arquitectónico)
 * -------------------------------------------
 * Armazón estructural optimizado para cualquier orientación de pantalla.
 * 
 * OPTIMIZACIÓN MODO VERTICAL:
 * - Detecta automáticamente si la pantalla está en vertical (portrait orientation o altura > ancho).
 * - En modo vertical, el menú lateral se oculta por defecto dando el 100% del ancho al contenido.
 * - Incluye botón flotante/header siempre accesible para abrir el menú como drawer.
 * - Integra widget global de zoom de texto (A- / A+) para adaptar la legibilidad en pantallas de alta resolución y monitores verticales.
 */
export default function MainLayout() {
  const location = useLocation();
  const {
    isPortrait,
    isDrawerMode,
    isSidebarPinned,
    isSidebarOpen,
    toggleSidebar,
    toggleSidebarCollapsed,
  } = useLayout();

  // Helper para mostrar el título amigable de la sección actual
  const getSectionTitle = () => {
    const p = location.pathname;
    if (p === "/") return { title: "Panel de Control", icon: LayoutDashboard };
    if (p.startsWith("/supervision")) return { title: "Supervisión", icon: Eye };
    if (p.startsWith("/global-report")) return { title: "Reporte Global", icon: Eye };
    if (p.startsWith("/campaigns")) return { title: "Campañas", icon: Megaphone };
    if (p.startsWith("/prensa")) return { title: "Sala de Prensa", icon: Newspaper };
    if (p.startsWith("/mailing")) return { title: "Mailing Lab", icon: Mail };
    if (p.startsWith("/videos")) return { title: "Video Lab", icon: Video };
    if (p.startsWith("/historias")) return { title: "Banco de Historias", icon: BookOpen };
    if (p.startsWith("/admin-users")) return { title: "Gestión Usuarios", icon: UserCog };
    if (p.startsWith("/admin")) return { title: "Mi Administración", icon: BrainCircuit };
    return { title: "Acción Andina", icon: LayoutDashboard };
  };

  const currentSection = getSectionTitle();
  const SectionIcon = currentSection.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-brand selection:text-white">
      {/* 1. BARRA LATERAL (Drawer en vertical/móvil, fija en horizontal) */}
      <Sidebar />

      {/* 2. ÁREA PRINCIPAL: CONTENIDO + HEADER */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarPinned ? "lg:ml-64" : "ml-0"
        }`}
      >
        {/* HEADER SUPERIOR UNIFICADO */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-brand text-white flex items-center justify-between px-3 sm:px-6 border-b border-green-900/50 shadow-sm backdrop-blur-md">
          {/* LADO IZQUIERDO: TOGGLE & IDENTIFICACIÓN */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Botón para alternar sidebar */}
            <button
              onClick={isDrawerMode || !isSidebarPinned ? toggleSidebar : toggleSidebarCollapsed}
              className="text-white p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0 active:scale-95 flex items-center justify-center"
              title={
                isDrawerMode || !isSidebarPinned
                  ? "Abrir menú de navegación"
                  : "Ocultar menú lateral"
              }
              aria-label="Alternar menú lateral"
            >
              {isDrawerMode || !isSidebarPinned ? (
                <Menu size={22} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>

            {/* Logo / Nombre del proyecto */}
            <Link
              to="/"
              className="flex items-center gap-2 text-white font-bold tracking-tight hover:opacity-90 transition-opacity shrink-0"
            >
              <span className="text-sm sm:text-base font-black tracking-wide">
                ACCIÓN ANDINA
              </span>
            </Link>

            {/* Separador */}
            <div className="hidden sm:block h-5 w-px bg-white/20 shrink-0" />

            {/* Módulo Actual */}
            <div className="hidden md:flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-wider truncate">
              <SectionIcon size={14} className="text-emerald-400 shrink-0" />
              <span className="truncate">{currentSection.title}</span>
            </div>

            {/* Indicador de Modo Vertical */}
            {isPortrait && (
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-400/30"
                title="Pantalla vertical activa: el menú se oculta automáticamente para darte el 100% del ancho"
              >
                <Smartphone size={12} />
                <span>Modo Vertical</span>
              </div>
            )}
          </div>

          {/* LADO DERECHO: HERRAMIENTAS GLOBALES (ZOOM DE TEXTO + ACCIONES) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* WIDGET DE ESCALA DE TEXTO */}
            <TextScaleWidget />

            {/* Botón para expandir sidebar si está colapsado en horizontal */}
            {!isDrawerMode && !isSidebarPinned && (
              <button
                onClick={toggleSidebarCollapsed}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-green-200 text-xs font-bold rounded-xl transition-all"
                title="Mostrar menú lateral fijado"
              >
                <PanelLeftOpen size={14} />
                <span>Mostrar Menú</span>
              </button>
            )}
          </div>
        </header>

        {/* CONTENEDOR DEL CONTENIDO PRINCIPAL */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
