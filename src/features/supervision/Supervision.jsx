import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  Users,
  MapPin,
  Plus,
  Trash2,
  FileText,
  Search,
  ChevronRight,
  Settings,
  BarChart3,
  Eye,
  Briefcase,
  Shield,
  Key,
  UserPlus,
  Mail,
  X,
  Megaphone,
  Image as ImageIcon,
  Lock, // <--- Icono seguridad
} from "lucide-react";

export default function Supervision() {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState("partners");
  const [selectedPartnerForHistory, setSelectedPartnerForHistory] =
    useState(null);
  const [selectedPartnerForReport, setSelectedPartnerForReport] =
    useState(null);

  const [partners, setPartners] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SEGURIDAD: ESTADO DE LECTURA ---
  const [isReadOnly, setIsReadOnly] = useState(true);

  // Modales
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    partner_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let canEdit = false;
      let allowedProjectIds = []; // Lista de proyectos permitidos
      let isAdmin = false;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // 1. DETERMINAR PODER DE EDICIÓN
        if (profile?.role === "admin") {
          canEdit = true;
          isAdmin = true;
        } else if (
          profile?.role === "editor" &&
          profile?.edit_supervision === true
        ) {
          canEdit = true;
        }

        // 2. OBTENER LISTA DE PROYECTOS PERMITIDOS (Si no es admin)
        if (!isAdmin) {
          const { data: accessData } = await supabase
            .from("user_project_access")
            .select("project_id")
            .eq("user_id", user.id);

          allowedProjectIds = accessData
            ? accessData.map((a) => a.project_id)
            : [];
        }
      }
      setIsReadOnly(!canEdit);

      // 3. CARGAR DATOS GENERALES
      // Cargamos socios y sus proyectos anidados
      const { data: partnersData } = await supabase
        .from("partners")
        .select(
          `
            *, 
            logo_url, 
            projects (
              *,
              monthly_reports (id, report_month, report_year, photo_count)
            )
          `,
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*, partners(name)");

      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title, status, partner_ids")
        .neq("status", "PUBLICADO");

      // 4. FILTRADO DE SEGURIDAD (La magia ocurre aquí)
      let filteredPartnersData = partnersData || [];

      if (!isAdmin) {
        // Recorremos cada socio y filtramos sus proyectos
        filteredPartnersData = filteredPartnersData
          .map((partner) => {
            // Solo mantenemos los proyectos cuyo ID esté en la lista permitida
            const visibleProjects = partner.projects.filter((proj) =>
              allowedProjectIds.includes(proj.id),
            );
            return { ...partner, projects: visibleProjects };
          })
          // Eliminamos socios que se quedaron sin proyectos visibles (para no mostrar tarjetas vacías)
          .filter((partner) => partner.projects.length > 0);
      }

      setPartners(filteredPartnersData);
      setProfiles(profilesData || []);
      setCampaigns(campaignsData || []);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- HELPERS ---
  const getPartnerEmail = (partnerId) => {
    const linkedUser = profiles.find((p) => p.partner_id === partnerId);
    return linkedUser ? linkedUser.email : "Sin usuario asignado";
  };

  const getPartnerStats = (partner) => {
    const activeCampaignsCount = campaigns.filter(
      (c) => Array.isArray(c.partner_ids) && c.partner_ids.includes(partner.id),
    ).length;

    let totalPhotos = 0;
    partner.projects?.forEach((proj) => {
      proj.monthly_reports?.forEach((rep) => {
        totalPhotos += parseInt(rep.photo_count || 0);
      });
    });

    const hasRecentActivity = partner.projects?.some(
      (p) => p.monthly_reports?.length > 0,
    );

    return {
      campaigns: activeCampaignsCount,
      photos: totalPhotos,
      status: hasRecentActivity ? "Activo" : "Sin Reportes",
      statusColor: hasRecentActivity
        ? "text-emerald-500 bg-emerald-50"
        : "text-orange-500 bg-orange-50",
    };
  };

  // --- GESTIÓN (BLOQUEADA SI READONLY) ---
  async function softDeletePartner(id, name) {
    if (isReadOnly) return; // CANDADO
    if (confirm(`¿Estás seguro de eliminar a "${name}"?`)) {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: false })
        .eq("id", id);
      if (error) alert(error.message);
      else fetchData();
    }
  }

  const handleCreateUser = async () => {
    if (isReadOnly) return; // CANDADO
    if (!newUser.email || !newUser.password) return;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
    });
    if (authError) {
      alert(authError.message);
      return;
    }
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          email: newUser.email,
          role: newUser.partner_id ? "PARTNER" : "ADMIN",
          partner_id: newUser.partner_id || null,
        },
      ]);
      if (profileError) alert(profileError.message);
      else {
        alert("✅ Usuario creado");
        setIsUserModalOpen(false);
        setNewUser({ email: "", password: "", partner_id: "" });
        fetchData();
      }
    }
  };

  const handleDeleteUser = async (id) => {
    if (isReadOnly) return; // CANDADO
    if (confirm("¿Borrar acceso?")) {
      await supabase.from("profiles").delete().eq("id", id);
      fetchData();
    }
  };

  const filteredPartners = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.country.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Total partners ahora refleja solo lo visible
  const totalPartners = partners.length;
  const totalProjects = partners.reduce(
    (acc, p) => acc + (p.projects?.length || 0),
    0,
  );

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <Eye className="text-brand" size={24} md:size={32} /> Supervision
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic flex items-center gap-2">
            Control de socios y paisajes.
            {isReadOnly && (
              <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                <Lock size={10} /> SOLO LECTURA
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab("partners")}
              className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "partners" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Briefcase size={14} /> Socios
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "users" ? "bg-white text-brand shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Users size={14} /> Usuarios
            </button>
          </div>
          <button
            onClick={() => navigate("/global-report")}
            className="bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-black hover:border-brand hover:text-brand transition-all flex items-center gap-2 text-xs uppercase tracking-[0.1em] shadow-sm"
          >
            <BarChart3 size={16} /> Reporte Global
          </button>

          {/* BOTONES DE CREACIÓN: OCULTOS SI ES READONLY */}
          {!isReadOnly &&
            (activeTab === "partners" ? (
              <button
                onClick={() => navigate("/new-partner")}
                className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs uppercase tracking-[0.2em]"
              >
                <Plus size={16} /> Nuevo Socio
              </button>
            ) : (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs uppercase tracking-[0.2em]"
              >
                <UserPlus size={16} /> Nuevo Usuario
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* --- VISTA SOCIOS --- */}
          {activeTab === "partners" && (
            <>
              {/* Contadores */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white px-6 md:px-8 py-4 md:py-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 flex-1">
                  <div className="bg-brand/10 p-3 rounded-2xl text-brand">
                    <Users size={24} />
                  </div>
                  <div>
                    <strong className="text-gray-900 text-2xl md:text-3xl font-black block tracking-tighter">
                      {totalPartners}
                    </strong>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Socios Visibles
                    </span>
                  </div>
                </div>
                <div className="bg-white px-6 md:px-8 py-4 md:py-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 flex-1">
                  <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <strong className="text-gray-900 text-2xl md:text-3xl font-black block tracking-tighter">
                      {totalProjects}
                    </strong>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Paisajes Asignados
                    </span>
                  </div>
                </div>
              </div>

              {/* Búsqueda */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar organización o país..."
                  className="w-full pl-14 pr-4 py-5 bg-white border-2 border-transparent focus:border-brand rounded-2xl text-sm font-bold outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Grid Tarjetas */}
              {loading ? (
                <div className="text-center py-20">
                  <div className="text-brand font-black text-xs uppercase tracking-widest animate-pulse">
                    Cargando...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {filteredPartners.map((partner) => {
                    const dynamicEmail = getPartnerEmail(partner.id);
                    const hasUser = dynamicEmail.includes("@");
                    const stats = getPartnerStats(partner);

                    return (
                      <div
                        key={partner.id}
                        className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col hover:shadow-xl hover:border-brand/20 transition-all duration-300 overflow-hidden group"
                      >
                        {/* Header Tarjeta */}
                        <div className="p-8 flex justify-between items-start bg-gray-50/50 relative">
                          <div className="flex gap-5 items-center z-10">
                            <div className="w-16 h-16 rounded-2xl shadow-md overflow-hidden flex items-center justify-center bg-white border border-gray-100 p-1">
                              {partner.logo_url ? (
                                <img
                                  src={partner.logo_url}
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              ) : (
                                <Users size={24} className="text-gray-300" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                                {partner.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${hasUser ? "bg-emerald-500" : "bg-orange-300"}`}
                                  ></span>
                                  <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wide max-w-[150px] truncate">
                                    {dynamicEmail}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${stats.statusColor}`}
                                >
                                  {stats.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BOTONES EDICIÓN SOCIO: OCULTOS SI ES READONLY */}
                          {!isReadOnly && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={() =>
                                  navigate(`/edit-partner/${partner.id}`)
                                }
                                className="text-gray-400 hover:text-brand p-2 hover:bg-white rounded-xl transition-all"
                                title="Editar Info Socio"
                              >
                                <Settings size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  softDeletePartner(partner.id, partner.name)
                                }
                                className="text-gray-400 hover:text-red-500 p-2 hover:bg-white rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stats Resumen */}
                        <div className="px-8 py-4 border-b border-gray-50 grid grid-cols-3 gap-4 divide-x divide-gray-100 bg-white">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <Megaphone size={10} /> Campañas
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.campaigns}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <MapPin size={10} /> Paisajes
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {partner.projects?.length || 0}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <ImageIcon size={10} /> Contenido
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.photos}{" "}
                              <span className="text-[8px] text-gray-400 font-bold">
                                FOTOS
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Lista Paisajes */}
                        <div className="p-8 flex-1 bg-white">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Paisajes Asignados
                            </h4>
                            {/* BOTÓN +AGREGAR PAISAJE: OCULTO SI ES READONLY */}
                            {!isReadOnly && (
                              <button
                                onClick={() =>
                                  navigate(`/new-project/${partner.id}`)
                                }
                                className="text-[9px] font-bold text-brand hover:underline uppercase"
                              >
                                + Agregar
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {partner.projects?.slice(0, 3).map((project) => (
                              <div
                                key={project.id}
                                className={`flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand/30 transition-all cursor-pointer group/item`}
                                // --- LÓGICA DE CLIC BLINDADA ---
                                onClick={() => {
                                  if (isReadOnly) {
                                    navigate(
                                      `/supervision/historial/${project.id}`,
                                    );
                                  } else {
                                    navigate(
                                      `/supervision/nuevo-reporte/${project.id}`,
                                    );
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-white rounded-lg text-gray-300 group-hover/item:text-brand transition-colors">
                                    <MapPin size={14} />
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 uppercase">
                                    {project.name}
                                  </span>
                                </div>

                                {/* BOTÓN SETTINGS PAISAJE: OCULTO SI ES READONLY */}
                                <div className="flex items-center gap-1">
                                  {!isReadOnly && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/edit-project/${project.id}`);
                                      }}
                                      className="p-1.5 text-gray-300 hover:text-brand hover:bg-white rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                      title="Configurar Paisaje"
                                    >
                                      <Settings size={14} />
                                    </button>
                                  )}
                                  <ChevronRight
                                    size={14}
                                    className="text-gray-300 group-hover/item:text-brand"
                                  />
                                </div>
                              </div>
                            ))}
                            {partner.projects?.length === 0 && (
                              <p className="text-[10px] text-gray-300 italic">
                                No hay paisajes registrados.
                              </p>
                            )}
                            {partner.projects?.length > 3 && (
                              <p className="text-[9px] text-center text-gray-400 font-bold mt-2">
                                ... y {partner.projects.length - 3} más
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Footer Acciones */}
                        <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                if (partner.projects?.length === 1)
                                  navigate(
                                    `/supervision/historial/${partner.projects[0].id}`,
                                  );
                                else if (partner.projects?.length > 1)
                                  setSelectedPartnerForHistory(partner);
                                else alert("Este socio aún no tiene paisajes.");
                              }}
                              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-black hover:border-brand hover:text-brand transition-all text-[9px] tracking-[0.1em] uppercase shadow-sm"
                            >
                              <FileText size={14} /> Historial
                            </button>

                            {/* BOTÓN NUEVO REPORTE: VISIBLE SOLO PARA EDITOR/ADMIN */}
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  if (partner.projects?.length === 1)
                                    navigate(
                                      `/supervision/nuevo-reporte/${partner.projects[0].id}`,
                                    );
                                  else if (partner.projects?.length > 1)
                                    setSelectedPartnerForReport(partner);
                                  else alert("Añade un paisaje primero.");
                                }}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white font-black hover:bg-black transition-all text-[9px] tracking-[0.1em] uppercase shadow-md"
                              >
                                <Plus size={14} /> Nuevo Reporte
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* --- VISTA USUARIOS (TABLA BLINDADA) --- */}
          {activeTab === "users" && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Usuario / Email
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Rol Asignado
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Organización Asignada
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {profiles.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                              {user.email.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-gray-700">
                              {user.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${user.role === "ADMIN" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          {user.partners ? (
                            <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                              <Shield size={14} className="text-brand" />{" "}
                              {user.partners.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic font-medium">
                              Global (Acción Andina)
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {/* BOTÓN BORRAR USUARIO: OCULTO SI ES READONLY */}
                          {!isReadOnly && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALES DE SELECCIÓN Y USUARIOS --- */}
      {/* ... (Se mantienen iguales, pero con la lógica de isReadOnly aplicada en los botones) ... */}

      {/* SELECCIÓN PARA REPORTE */}
      {selectedPartnerForReport && !isReadOnly && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Seleccionar Paisaje
            </h2>
            <div className="space-y-3">
              {selectedPartnerForReport.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/supervision/nuevo-reporte/${project.id}`);
                    setSelectedPartnerForReport(null);
                  }}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-50 hover:border-brand hover:bg-brand/5 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-black text-gray-800 group-hover:text-brand uppercase text-sm">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {project.landscape}
                    </p>
                  </div>
                  <Plus
                    size={16}
                    className="text-gray-300 group-hover:text-brand"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPartnerForReport(null)}
              className="w-full mt-6 py-3 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* SELECCIÓN PARA HISTORIAL */}
      {selectedPartnerForHistory && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Ver Historial
            </h2>
            <div className="space-y-3">
              {selectedPartnerForHistory.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/supervision/historial/${project.id}`);
                    setSelectedPartnerForHistory(null);
                  }}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-50 hover:border-brand hover:bg-brand/5 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-black text-gray-800 group-hover:text-brand uppercase text-sm">
                      {project.name}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-300 group-hover:text-brand"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPartnerForHistory(null)}
              className="w-full mt-6 py-3 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {isUserModalOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase">
                Nuevo Usuario
              </h3>
              <button onClick={() => setIsUserModalOpen(false)}>
                <X className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Correo
                </label>
                <input
                  type="email"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border focus:border-brand"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Contraseña
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border focus:border-brand"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Organización
                </label>
                <select
                  className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand uppercase"
                  value={newUser.partner_id}
                  onChange={(e) =>
                    setNewUser({ ...newUser, partner_id: e.target.value })
                  }
                >
                  <option value="">-- Admin (Staff) --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateUser}
                className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black mt-2"
              >
                Crear Acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
