import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  Users,
  Shield,
  Briefcase,
  CheckCircle2,
  Search,
  Loader2,
  UserCog,
  Plus,
  X,
  Mail,
  Lock,
  Building2,
  LayoutDashboard,
  Eye,
  Megaphone,
  Newspaper,
  Calendar,
  Send,
  Video,
  BookOpen,
  Edit3,
} from "lucide-react";

export default function UserAdmin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([]);
  const [accessMap, setAccessMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Inputs nuevo usuario
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [creating, setCreating] = useState(false);

  // --- CONFIGURACIÓN DE MÓDULOS (PARES DE COLUMNAS) ---
  const modules = [
    {
      label: "Resumen",
      viewCol: "perm_summary",
      editCol: "edit_summary",
      icon: LayoutDashboard,
    },
    {
      label: "Supervisión",
      viewCol: "perm_supervision",
      editCol: "edit_supervision",
      icon: Eye,
    },
    {
      label: "Campañas",
      viewCol: "perm_campaigns",
      editCol: "edit_campaigns",
      icon: Megaphone,
    },
    {
      label: "Sala de Prensa",
      viewCol: "perm_press",
      editCol: "edit_press",
      icon: Newspaper,
    },
    {
      label: "Reuniones",
      viewCol: "perm_meetings",
      editCol: "edit_meetings",
      icon: Calendar,
    },
    {
      label: "Mailing HTML",
      viewCol: "perm_mailing",
      editCol: "edit_mailing",
      icon: Send,
    },
    {
      label: "Videos / Guiones",
      viewCol: "perm_videos",
      editCol: "edit_videos",
      icon: Video,
    },
    {
      label: "Banco Historias",
      viewCol: "perm_stories",
      editCol: "edit_stories",
      icon: BookOpen,
    },
    {
      label: "Gestión Usuarios",
      viewCol: "perm_admin_users",
      editCol: "edit_admin_users",
      icon: UserCog,
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*, partners(name)")
        .order("created_at", { ascending: false });
      const { data: projData } = await supabase
        .from("projects")
        .select("id, name, partners(name)");
      const { data: partnersData } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      const { data: accessData } = await supabase
        .from("user_project_access")
        .select("*");

      const map = {};
      accessData?.forEach((item) => {
        if (!map[item.user_id]) map[item.user_id] = [];
        map[item.user_id].push(item.project_id);
      });

      setUsers(usersData || []);
      setProjects(projData || []);
      setPartners(partnersData || []);
      setAccessMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- CAMBIAR PERMISO (VER O EDITAR) ---
  const togglePermission = async (
    userId,
    column,
    currentValue,
    dependentColumn = null,
  ) => {
    const newValue = !currentValue;
    const updates = { [column]: newValue };

    // Si activas EDITAR, automáticamente activa VER
    if (column.startsWith("edit_") && newValue === true && dependentColumn) {
      updates[dependentColumn] = true;
    }
    // Si desactivas VER, automáticamente desactiva EDITAR
    if (column.startsWith("perm_") && newValue === false && dependentColumn) {
      updates[dependentColumn] = false;
    }

    setUsers(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    await supabase.from("profiles").update(updates).eq("id", userId);
  };

  // --- CAMBIAR ROL GLOBAL ---
  const updateRole = async (userId, newRole) => {
    const updates = { role: newRole };
    if (newRole === "admin") {
      modules.forEach((m) => {
        updates[m.viewCol] = true;
        updates[m.editCol] = true;
      });
    }
    await supabase.from("profiles").update(updates).eq("id", userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  };

  // --- ASIGNAR SOCIO (Restaurado) ---
  const updatePartner = async (userId, partnerId) => {
    const value = partnerId === "" ? null : partnerId;
    await supabase
      .from("profiles")
      .update({ partner_id: value })
      .eq("id", userId);
    // Actualización optimista
    const partnerName = partners.find((p) => p.id === value)?.name;
    setUsers(
      users.map((u) =>
        u.id === userId
          ? { ...u, partner_id: value, partners: { name: partnerName } }
          : u,
      ),
    );
  };

  const toggleProjectAccess = async (userId, projectId, hasAccess) => {
    const currentAccess = accessMap[userId] || [];
    let newAccessList = hasAccess
      ? currentAccess.filter((id) => id !== projectId)
      : [...currentAccess, projectId];
    setAccessMap({ ...accessMap, [userId]: newAccessList });
    if (hasAccess)
      await supabase
        .from("user_project_access")
        .delete()
        .match({ user_id: userId, project_id: projectId });
    else
      await supabase
        .from("user_project_access")
        .insert([{ user_id: userId, project_id: projectId }]);
  };

  // --- CREAR USUARIO (Con Auto-Confirmación) ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    // TRUCO: options: { email_confirm: false } depende de la config de Supabase,
    // pero intentamos setear data adicional.
    const { data, error } = await supabase.auth.signUp({
      email: newUserEmail,
      password: newUserPass,
      options: {
        data: {
          full_name: newUserEmail.split("@")[0],
        },
      },
    });

    if (error) {
      alert("Error: " + error.message);
      setCreating(false);
      return;
    }

    // SI el usuario se creó pero no está confirmado, avisar.
    // (Nota: Para auto-confirmar real se necesita desactivar "Confirm Email" en el panel de Supabase > Authentication > Providers > Email)

    alert(
      "✅ Usuario creado exitosamente.\nIMPORTANTE: Si la confirmación de email está activa en Supabase, el usuario debe verificar su correo antes de entrar.",
    );

    setShowCreateModal(false);
    setNewUserEmail("");
    setNewUserPass("");
    setTimeout(() => {
      fetchData();
    }, 1500);
    setCreating(false);
  };

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-20 text-center font-black animate-pulse">
        CARGANDO...
      </div>
    );

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 bg-gray-50/20 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase flex items-center gap-3">
            <UserCog size={24} md:size={32} className="text-brand" /> Gestión de Accesos
          </h1>
          <p className="text-gray-500 font-bold text-xs md:text-sm mt-1">
            Control granular: Define quién ve y quién edita cada módulo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-white px-4 py-3 rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="outline-none text-xs font-bold w-full md:w-40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 md:flex-none bg-brand text-white px-5 py-3 rounded-xl font-black uppercase text-xs hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* CABECERA USUARIO */}
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">
                    {user.email}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${user.role === "admin" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {user.role === "admin"
                        ? "ADMIN (Full Access)"
                        : "USUARIO (Configurable)"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* SELECTOR DE SOCIO (RESTAURADO) */}
                {user.role !== "admin" && (
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white border-gray-300">
                    <Building2 size={16} className="text-gray-400" />
                    <select
                      value={user.partner_id || ""}
                      onChange={(e) => updatePartner(user.id, e.target.value)}
                      className="bg-transparent text-xs font-black uppercase outline-none text-gray-800 max-w-[150px]"
                    >
                      <option value="">Sin Socio (Global)</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SELECTOR DE ROL GENERAL */}
                <div
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${user.role === "admin" ? "bg-red-50 border-red-200" : "bg-white border-gray-300"}`}
                >
                  <Shield
                    size={16}
                    className={
                      user.role === "admin" ? "text-red-500" : "text-gray-400"
                    }
                  />
                  <select
                    value={user.role || "user"}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    className="bg-transparent text-xs font-black uppercase outline-none text-gray-800"
                  >
                    <option value="user">Usuario (Restringido)</option>
                    <option value="admin">Admin (Total)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CUERPO: PERMISOS GRANULARES */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* COLUMNA 1: MATRIZ DE PERMISOS */}
              <div className="border border-gray-100 rounded-2xl overflow-x-auto">
                <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b border-gray-200 min-w-[300px]">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Módulo
                  </span>
                  <div className="flex gap-8">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-10 text-center">
                      Ver
                    </span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-10 text-center">
                      Editar
                    </span>
                  </div>
                </div>
                {user.role === "admin" ? (
                  <div className="p-10 text-center text-gray-400 text-xs italic bg-gray-50">
                    El administrador tiene acceso total y edición en todos los
                    módulos.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {modules.map((mod) => (
                      <div
                        key={mod.label}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-brand/5 text-brand rounded-lg">
                            <mod.icon size={14} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            {mod.label}
                          </span>
                        </div>
                        <div className="flex gap-8">
                          {/* SWITCH VER */}
                          <div
                            onClick={() =>
                              togglePermission(
                                user.id,
                                mod.viewCol,
                                user[mod.viewCol],
                                mod.editCol,
                              )
                            }
                            className={`cursor-pointer w-10 h-5 rounded-full p-1 transition-colors duration-200 ${user[mod.viewCol] ? "bg-emerald-500" : "bg-gray-200"}`}
                          >
                            <div
                              className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${user[mod.viewCol] ? "translate-x-5" : "translate-x-0"}`}
                            ></div>
                          </div>
                          {/* SWITCH EDITAR */}
                          <div
                            onClick={() =>
                              togglePermission(
                                user.id,
                                mod.editCol,
                                user[mod.editCol],
                                mod.viewCol,
                              )
                            }
                            className={`cursor-pointer w-10 h-5 rounded-full p-1 transition-colors duration-200 ${user[mod.editCol] ? "bg-blue-500" : "bg-gray-200"}`}
                          >
                            <div
                              className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${user[mod.editCol] ? "translate-x-5" : "translate-x-0"}`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* COLUMNA 2: PROYECTOS */}
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase flex items-center gap-2 mb-4">
                  <Briefcase size={14} /> Acceso a Proyectos
                </h4>
                {user.role === "admin" ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold text-center">
                    Acceso Global Habilitado
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {projects.map((proj) => {
                      const hasAccess = accessMap[user.id]?.includes(proj.id);
                      return (
                        <div
                          key={proj.id}
                          onClick={() =>
                            toggleProjectAccess(user.id, proj.id, hasAccess)
                          }
                          className={`cursor-pointer p-3 rounded-xl border flex justify-between items-center transition-all ${hasAccess ? "bg-brand/5 border-brand/30" : "bg-white border-gray-200 hover:border-gray-400"}`}
                        >
                          <div className="overflow-hidden">
                            <p
                              className={`text-[10px] font-black uppercase truncate ${hasAccess ? "text-brand" : "text-gray-700"}`}
                            >
                              {proj.name}
                            </p>
                            <p className="text-[9px] text-gray-400 truncate">
                              {proj.partners?.name}
                            </p>
                          </div>
                          {hasAccess && (
                            <CheckCircle2 size={16} className="text-brand" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR USUARIO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-4">
              Nuevo Acceso
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold outline-none"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Contraseña"
                required
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-bold outline-none"
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-brand text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-black transition-colors"
              >
                {creating ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  "Crear Usuario"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
