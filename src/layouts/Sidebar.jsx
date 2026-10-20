/**
 * COMPONENTE: Sidebar (Navegación Inteligente)
 * -------------------------------------------
 * Barra lateral de navegación con control de acceso dinámico (RBAC).
 * 
 * LÓGICA DE VISIBILIDAD & RESPONSIVIDAD:
 * - Se integra con LayoutContext:
 *   - En modo VERTICAL (monitores verticales / pantallas portrait) o MÓVIL:
 *     Se oculta automáticamente por defecto y actúa como un drawer flotante con overlay.
 *   - En modo ESCRITORIO HORIZONTAL:
 *     Permanece fijo si está desplegado, o colapsable según la preferencia del usuario.
 * - Filtra módulos basándose en los permisos de 'profiles'.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../context/LayoutContext";
import { supabase } from "../app/supabase";
import {
  BookOpen,
  LayoutDashboard,
  Eye,
  Megaphone,
  Mail,
  Video,
  BrainCircuit,
  LogOut,
  Newspaper,
  UserCog,
  Shield,
  X,
  PanelLeftClose,
  Smartphone,
  Monitor,
} from "lucide-react";

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const {
    isDrawerMode,
    isSidebarPinned,
    isSidebarOpen,
    closeSidebar,
    toggleSidebarCollapsed,
    isPortrait,
  } = useLayout();

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  }

  const canView = (permissionColumn) => {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    return profile[permissionColumn] === true;
  };

  const handleLinkClick = () => {
    if (isDrawerMode || !isSidebarPinned) {
      closeSidebar();
    }
  };

  const getLinkClass = (path) => {
    const baseStyle =
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm";
    if (location.pathname === path) {
      return `${baseStyle} bg-white/10 text-white border-l-4 border-white shadow-sm`;
    }
    return `${baseStyle} text-green-300/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent`;
  };

  // Determinar si el sidebar debe estar visible en la pantalla
  const isVisible = isSidebarPinned || isSidebarOpen;

  return (
    <>
      {/* Overlay Backdrop cuando actúa como Drawer flotante */}
      {(isDrawerMode || !isSidebarPinned) && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 max-w-[85vw] h-screen bg-brand flex flex-col fixed left-0 top-0 border-r border-green-900/50 shadow-2xl overflow-hidden z-50 transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        {/* 1. HEADER DEL MENÚ */}
        <div className="p-5 border-b border-green-800/50 bg-black/20 relative shrink-0">
          {/* Botón de cierre en modo drawer */}
          {(isDrawerMode || !isSidebarPinned) ? (
            <button
              onClick={closeSidebar}
              className="absolute right-4 top-4 text-green-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Cerrar menú lateral"
              aria-label="Cerrar menú lateral"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={toggleSidebarCollapsed}
              className="absolute right-4 top-4 text-green-400/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Colapsar menú lateral"
              aria-label="Colapsar menú lateral"
            >
              <PanelLeftClose size={18} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-wide">
              ACCIÓN ANDINA
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-green-400 uppercase tracking-[0.2em] opacity-80 font-bold">
              Panel de Control
            </p>
            {isPortrait && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Vertical
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium text-green-300/50 italic mt-0.5">
            by Jean Pierre Salguero
          </p>

          {user?.email && (
            <div className="mt-3 flex items-center gap-2 bg-green-900/30 p-2 rounded-xl border border-green-800/50">
              <div className="bg-green-500/20 p-1.5 rounded-lg text-green-400 shrink-0">
                <Shield size={12} />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[9px] font-medium text-green-100 truncate">
                  {user.email}
                </p>
                <p className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">
                  {profile?.role === "admin"
                    ? "ADMINISTRADOR"
                    : profile?.role === "editor"
                      ? "EDITOR"
                      : "VISUALIZADOR"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. MENÚ DE NAVEGACIÓN */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {/* SECCIÓN: GESTIÓN */}
          {(canView("perm_summary") ||
            canView("perm_supervision") ||
            canView("perm_campaigns")) && (
              <p className="px-4 text-[10px] font-bold text-green-500 uppercase tracking-widest mt-2 mb-2">
                Gestión Global
              </p>
            )}

          {canView("perm_summary") && (
            <Link to="/" className={getLinkClass("/")} onClick={handleLinkClick}>
              <LayoutDashboard size={18} />
              <span>Resumen</span>
            </Link>
          )}

          {canView("perm_supervision") && (
            <Link
              to="/supervision"
              className={getLinkClass("/supervision")}
              onClick={handleLinkClick}
            >
              <Eye size={18} />
              <span>Supervisión</span>
            </Link>
          )}

          {canView("perm_campaigns") && (
            <Link
              to="/campaigns"
              className={getLinkClass("/campaigns")}
              onClick={handleLinkClick}
            >
              <Megaphone size={18} />
              <span>Campañas</span>
            </Link>
          )}

          {/* SECCIÓN: HERRAMIENTAS */}
          {(canView("perm_press") ||
            canView("perm_mailing") ||
            canView("perm_videos") ||
            canView("perm_stories")) && (
              <p className="px-4 text-[10px] font-bold text-green-500 uppercase tracking-widest mt-6 mb-2">
                Herramientas
              </p>
            )}

          {canView("perm_press") && (
            <Link
              to="/prensa"
              className={getLinkClass("/prensa")}
              onClick={handleLinkClick}
            >
              <Newspaper size={18} />
              <span>Sala de Prensa</span>
            </Link>
          )}

          {canView("perm_mailing") && (
            <Link
              to="/mailing"
              className={getLinkClass("/mailing")}
              onClick={handleLinkClick}
            >
              <Mail size={18} />
              <span>Mailing HTML</span>
            </Link>
          )}

          {canView("perm_videos") && (
            <Link
              to="/videos"
              className={getLinkClass("/videos")}
              onClick={handleLinkClick}
            >
              <Video size={18} />
              <span>Videos / Guiones</span>
            </Link>
          )}

          {canView("perm_stories") && (
            <Link
              to="/historias"
              className={getLinkClass("/historias")}
              onClick={handleLinkClick}
            >
              <BookOpen size={18} />
              <span>Banco de Historias</span>
            </Link>
          )}

          {/* SECCIÓN: PERSONAL */}
          {canView("perm_my_tasks") && (
            <>
              <p className="px-4 text-[10px] font-bold text-green-500 uppercase tracking-widest mt-6 mb-2">
                Personal
              </p>

              <Link
                to="/admin"
                className={getLinkClass("/admin")}
                onClick={handleLinkClick}
              >
                <BrainCircuit size={18} />
                <span>Mi Admin & Tareas</span>
              </Link>
            </>
          )}

          {/* GESTIÓN USUARIOS */}
          {canView("perm_admin_users") && (
            <Link
              to="/admin-users"
              className={`${getLinkClass("/admin-users")} mt-2 bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 border-l-yellow-500`}
              onClick={handleLinkClick}
            >
              <UserCog size={18} />
              <span>Gestión Usuarios</span>
            </Link>
          )}
        </nav>

        {/* 3. FOOTER */}
        <div className="p-3 border-t border-green-800/50 bg-black/20 flex flex-col gap-2 shrink-0">
          {!isDrawerMode && isSidebarPinned && (
            <button
              onClick={toggleSidebarCollapsed}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-green-300/60 hover:text-white hover:bg-white/10 py-2 rounded-lg transition-all"
              title="Colapsar menú lateral para maximizar el espacio"
            >
              <PanelLeftClose size={14} />
              <span>Ocultar Menú</span>
            </button>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-green-300/70 hover:text-white hover:bg-white/10 py-2.5 rounded-lg transition-all duration-300 group"
          >
            <LogOut
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
