import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../app/supabase";
import {
  BookOpen,
  LayoutDashboard,
  Eye,
  Megaphone,
  Users,
  Mail,
  Video,
  BrainCircuit,
  LogOut,
  Newspaper,
  UserCog,
  Shield,
  X, // Icono para cerrar en móvil
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

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

  const getLinkClass = (path) => {
    const baseStyle =
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm";
    if (location.pathname === path) {
      return `${baseStyle} bg-white/10 text-white border-l-4 border-white shadow-sm`;
    }
    return `${baseStyle} text-green-300/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent`;
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 h-screen bg-brand flex flex-col fixed left-0 top-0 border-r border-green-900/50 shadow-2xl overflow-hidden z-50 transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* 1. HEADER */}
        <div className="p-6 border-b border-green-800/50 bg-black/20 relative">
          {/* Botón Cerrar (Solo móvil) */}
          <button
            onClick={onClose}
            className="lg:hidden absolute right-4 top-4 text-green-400 hover:text-white p-1"
          >
            <X size={24} />
          </button>

          <h1 className="text-xl font-bold text-white tracking-wide">
            ACCIÓN ANDINA
          </h1>
          <p className="text-[10px] text-green-400 uppercase mt-1 tracking-[0.2em] opacity-80">
            Panel de Control
          </p>
          <p className="text-[10px] font-medium text-green-300/50 italic mt-1">
            by Jean Pierre Salguero
          </p>

          {user?.email && (
            <div className="mt-3 flex items-center gap-2 bg-green-900/30 p-2 rounded-lg border border-green-800/50">
              <div className="bg-green-500/20 p-1.5 rounded-full text-green-400">
                <Shield size={12} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[9px] font-medium text-green-100 truncate w-32">
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2 custom-scrollbar">
          {/* SECCIÓN: GESTIÓN */}
          {(canView("perm_summary") ||
            canView("perm_supervision") ||
            canView("perm_campaigns")) && (
            <p className="px-4 text-[10px] font-bold text-green-500 uppercase tracking-widest mt-4 mb-2">
              Gestión Global
            </p>
          )}

          {canView("perm_summary") && (
            <Link to="/" className={getLinkClass("/")} onClick={onClose}>
              <LayoutDashboard size={20} />
              <span>Resumen</span>
            </Link>
          )}

          {canView("perm_supervision") && (
            <Link
              to="/supervision"
              className={getLinkClass("/supervision")}
              onClick={onClose}
            >
              <Eye size={20} />
              <span>Supervisión</span>
            </Link>
          )}

          {canView("perm_campaigns") && (
            <Link
              to="/campaigns"
              className={getLinkClass("/campaigns")}
              onClick={onClose}
            >
              <Megaphone size={20} />
              <span>Campañas</span>
            </Link>
          )}

          {/* SECCIÓN: HERRAMIENTAS */}
          {(canView("perm_press") ||
            canView("perm_meetings") ||
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
              onClick={onClose}
            >
              <Newspaper size={20} />
              <span>Sala de Prensa</span>
            </Link>
          )}

          {canView("perm_meetings") && (
            <Link
              to="/meetings"
              className={getLinkClass("/meetings")}
              onClick={onClose}
            >
              <Users size={20} />
              <span>Reuniones</span>
            </Link>
          )}

          {canView("perm_mailing") && (
            <Link
              to="/mailing"
              className={getLinkClass("/mailing")}
              onClick={onClose}
            >
              <Mail size={20} />
              <span>Mailing HTML</span>
            </Link>
          )}

          {canView("perm_videos") && (
            <Link
              to="/videos"
              className={getLinkClass("/videos")}
              onClick={onClose}
            >
              <Video size={20} />
              <span>Videos / Guiones</span>
            </Link>
          )}

          {canView("perm_stories") && (
            <Link
              to="/historias"
              className={getLinkClass("/historias")}
              onClick={onClose}
            >
              <BookOpen size={20} />
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
                onClick={onClose}
              >
                <BrainCircuit size={20} />
                <span>Mi Admin & Tareas</span>
              </Link>
            </>
          )}

          {/* GESTIÓN USUARIOS */}
          {canView("perm_admin_users") && (
            <Link
              to="/admin-users"
              className={`${getLinkClass("/admin-users")} mt-2 bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 border-l-yellow-500`}
              onClick={onClose}
            >
              <UserCog size={20} />
              <span>Gestión Usuarios</span>
            </Link>
          )}
        </nav>

        {/* 3. FOOTER */}
        <div className="p-4 border-t border-green-800/50 bg-black/20">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-green-300/70 hover:text-white hover:bg-white/10 py-3 rounded-lg transition-all duration-300 group"
          >
            <LogOut
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
