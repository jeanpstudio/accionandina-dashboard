/**
 * COMPONENTE: MeetingsDashboard (Meeting Room)
 * -------------------------------------------
 * Sistema centralizado para el agendamiento y seguimiento de reuniones estratégicas.
 * Actúa como una "Sala de Guerra" donde se registran agendas, participantes y acuerdos.
 * 
 * FUNCIONALIDADES CLAVE:
 * 1. SINCRONIZACIÓN ESPEJO: Al agendar una reunión, el sistema crea automáticamente 
 *    una tarea en el tablero personal (Personal Tasks) del usuario para garantizar seguimiento.
 * 2. GESTIÓN DE PARTICIPANTES: Soporta diferentes perfiles (Socio, Donante, Equipo, Externo)
 *    con visualización de logotipos corporativos.
 * 3. MÉTRICAS MENSUALES: Panel resumido de horas de coordinación y tipos de contraparte.
 * 4. ACTAS (Minutas): Espacios dedicados para Agenda (pre-reunión) y Acuerdos (post-reunión).
 * 
 * SEGURIDAD:
 * - Implementa RBAC para diferenciar entre editores de actas y consultores (Read-Only).
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../app/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Calendar,
  Clock,
  Video,
  Users,
  CheckCircle,
  FileText,
  Trash2,
  X,
  Layout,
  Briefcase,
  Heart,
  User,
  Timer,
  Edit3,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function MeetingsDashboard() {
  const { user } = useAuth();

  // --- ESTADOS ---
  const [meetings, setMeetings] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- SEGURIDAD: ESTADO DE LECTURA ---
  const [isReadOnly, setIsReadOnly] = useState(true);

  const sliderRef = useRef(null);

  // UI
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Formulario
  const [formData, setFormData] = useState(initialFormState());

  // Inputs Temporales
  const [tempType, setTempType] = useState("PARTNER");
  const [tempPartnerId, setTempPartnerId] = useState("");
  const [tempName, setTempName] = useState("");

  function initialFormState() {
    return {
      title: "",
      date: "",
      time: "",
      duration: "60",
      platform: "Google Meet",
      link: "",
      participants_list: [],
      agenda: "",
      agreements: "",
      status: "PROGRAMADA",
    };
  }

  useEffect(() => {
    fetchDataAndPermissions();
  }, [currentMonth]);

  async function fetchDataAndPermissions() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let canEdit = false;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          canEdit = true;
        } else if (profile?.edit_meetings === true) {
          canEdit = true;
        }
      }
      setIsReadOnly(!canEdit);
    } catch (e) {
      console.error("Error permisos:", e);
    }

    const { data: meets } = await supabase
      .from("meetings")
      .select("*")
      .order("date", { ascending: false });

    const { data: parts } = await supabase
      .from("partners")
      .select("id, name, logo_url");

    setMeetings(meets || []);
    setPartners(parts || []);
    setLoading(false);
  }

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const { current } = sliderRef;
      const scrollAmount = 320;
      current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const addParticipant = () => {
    if (isReadOnly) return;
    let newPart = null;
    if (tempType === "PARTNER") {
      if (!tempPartnerId) return;
      const p = partners.find((x) => x.id === tempPartnerId);
      newPart = { type: "PARTNER", id: p.id, name: p.name, logo: p.logo_url };
    } else {
      if (!tempName.trim()) return;
      newPart = { type: tempType, name: tempName, id: Date.now().toString() };
    }
    const exists = formData.participants_list.some(
      (x) => x.name === newPart.name,
    );
    if (!exists)
      setFormData({
        ...formData,
        participants_list: [...formData.participants_list, newPart],
      });
    setTempPartnerId("");
    setTempName("");
  };

  const removeParticipant = (name) => {
    if (isReadOnly) return;
    setFormData({
      ...formData,
      participants_list: formData.participants_list.filter(
        (p) => p.name !== name,
      ),
    });
  };

  const handleSelectMeeting = (meeting) => {
    if (selectedMeetingId === meeting.id) {
      handleClosePanel();
      return;
    }
    setSelectedMeetingId(meeting.id);
    setFormData({
      ...meeting,
      participants_list: Array.isArray(meeting.participants_list)
        ? meeting.participants_list
        : [],
    });
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    if (isReadOnly) return;
    setSelectedMeetingId("NEW");
    setFormData(initialFormState());
    setIsEditing(true);
  };

  const handleClosePanel = () => {
    setSelectedMeetingId(null);
    setFormData(initialFormState());
    setIsEditing(false);
  };

  const liveUpdate = (field, value) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getMonthKey = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const getTargetWeek = (dateStr) => {
    const d = new Date(dateStr);
    return Math.ceil(d.getUTCDate() / 7);
  };

  // --- FUNCIÓN GUARDAR REPARADA Y ASYNC ---
  const handleSave = async () => {
    // <--- AQUÍ ESTABA EL ERROR (Faltaba async)
    if (isReadOnly) return;
    if (!formData.title || !formData.date)
      return alert("Título y Fecha obligatorios");

    const payload = {
      title: formData.title,
      date: formData.date,
      time: formData.time,
      duration: parseInt(formData.duration),
      platform: formData.platform,
      link: formData.link,
      status: formData.status,
      agenda: formData.agenda,
      agreements: formData.agreements,
      participants_list: formData.participants_list,
    };

    try {
      // 1. GUARDAR EN MEETINGS
      if (selectedMeetingId === "NEW") {
        const { error } = await supabase.from("meetings").insert([payload]);
        if (error) throw error;
        alert("Reunión agendada 📅");
      } else {
        const { error } = await supabase
          .from("meetings")
          .update(payload)
          .eq("id", selectedMeetingId);
        if (error) throw error;
        alert("¡Guardado exitoso! ✅");
      }

      // 2. SINCRONIZAR CON TAREAS PERSONALES
      if (user) {
        const taskStatus =
          formData.status === "REALIZADA" ? "COMPLETADO" : "PENDIENTE";
        const taskProgress = formData.status === "REALIZADA" ? 100 : 0;
        const taskDescriptionPrefix = `📅 Reunión: ${formData.title}`;

        if (selectedMeetingId === "NEW") {
          const taskPayload = {
            user_id: user.id,
            description: taskDescriptionPrefix,
            category: "Reuniones",
            priority: "2",
            target_week: getTargetWeek(formData.date),
            month_key: getMonthKey(formData.date),
            status: taskStatus,
            progress: taskProgress,
            start_date: formData.date,
            due_date: formData.date,
          };
          // AQUÍ DABA EL ERROR SI LA FUNCIÓN NO ERA ASYNC
          await supabase.from("personal_tasks").insert([taskPayload]);
        } else {
          // Actualización espejo
          const { data: matchingTasks } = await supabase
            .from("personal_tasks")
            .select("id")
            .ilike("description", `%${formData.title}%`);

          if (matchingTasks && matchingTasks.length > 0) {
            const idsToUpdate = matchingTasks.map((t) => t.id);
            await supabase
              .from("personal_tasks")
              .update({
                status: taskStatus,
                progress: taskProgress,
                start_date: formData.date,
              })
              .in("id", idsToUpdate);
          }
        }
      }

      await fetchDataAndPermissions();
      setIsEditing(false);
      if (selectedMeetingId === "NEW") handleClosePanel();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (isReadOnly) return;
    if (!confirm("¿Seguro que quieres borrar esta reunión?")) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", selectedMeetingId);

    if (error) {
      alert("Error al borrar: " + error.message);
      return;
    }

    // Borrar tarea asociada (Búsqueda por descripción aproximada)
    if (user) {
      const { data: matchingTasks } = await supabase
        .from("personal_tasks")
        .select("id")
        .ilike("description", `%${formData.title}%`);

      if (matchingTasks && matchingTasks.length > 0) {
        const ids = matchingTasks.map((t) => t.id);
        await supabase.from("personal_tasks").delete().in("id", ids);
      }
    }

    handleClosePanel();
    fetchDataAndPermissions();
  };

  const getMonthlyStats = () => {
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const monthMeetings = meetings.filter((m) => m.date.startsWith(monthKey));
    const totalCount = monthMeetings.length;
    const totalHours = Math.round(
      monthMeetings.reduce((acc, curr) => acc + (curr.duration || 60), 0) / 60,
    );
    let partnersCount = 0;
    let donorsCount = 0;
    monthMeetings.forEach((m) => {
      if (m.participants_list?.some((p) => p.type === "PARTNER"))
        partnersCount++;
      if (m.participants_list?.some((p) => p.type === "DONOR")) donorsCount++;
    });
    return { totalCount, totalHours, partnersCount, donorsCount };
  };
  const stats = getMonthlyStats();

  const getStatusColor = (status) => {
    if (status === "PROGRAMADA")
      return "bg-blue-50 text-blue-600 border-blue-200";
    if (status === "REALIZADA")
      return "bg-emerald-50 text-emerald-600 border-emerald-200";
    return "bg-red-50 text-red-600 border-red-200";
  };

  const getTypeIcon = (type) => {
    if (type === "PARTNER") return <Users size={12} />;
    if (type === "DONOR") return <Heart size={12} />;
    if (type === "TEAM") return <Briefcase size={12} />;
    return <User size={12} />;
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xs font-black uppercase tracking-widest text-brand">
        Cargando...
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-8 py-6 flex justify-between items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <Calendar className="text-brand" size={32} /> Meeting Room
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic flex items-center gap-2">
            Coordinación & Acuerdos
            {isReadOnly && (
              <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                <Lock size={10} /> SOLO LECTURA
              </span>
            )}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg text-xs uppercase tracking-[0.2em]"
          >
            <Plus size={16} /> Agendar
          </button>
        )}
      </div>

      {/* SLIDER */}
      <div className="h-auto md:h-[220px] border-b border-gray-200 bg-gray-50/30 flex flex-col shrink-0 relative group/slider">
        <button
          onClick={() => scrollSlider("left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center text-gray-600 hover:text-brand hover:scale-110 transition-all opacity-0 group-hover/slider:opacity-100"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scrollSlider("right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-lg items-center justify-center text-gray-600 hover:text-brand hover:scale-110 transition-all opacity-0 group-hover/slider:opacity-100"
        >
          <ChevronRight size={20} />
        </button>

        <div
          ref={sliderRef}
          className="flex-1 overflow-x-auto md:overflow-y-hidden overflow-y-auto px-8 py-5 custom-scrollbar"
        >
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full items-stretch md:items-center">
            {meetings.map((meet) => {
              const isActive = selectedMeetingId === meet.id;
              const meetDate = new Date(meet.date);
              const isToday =
                new Date().toDateString() === meetDate.toDateString();
              const participants = Array.isArray(meet.participants_list)
                ? meet.participants_list
                : [];
              return (
                <div
                  key={meet.id}
                  onClick={() => handleSelectMeeting(meet)}
                  className={`w-full md:w-[300px] md:min-w-[300px] h-auto md:h-[130px] bg-white rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden flex flex-row relative shadow-sm hover:shadow-xl ${isActive ? "border-brand ring-4 ring-brand/5 scale-[1.01] md:scale-[1.02]" : "border-gray-100 hover:border-brand/30"}`}
                >
                  <div
                    className={`w-[80px] flex flex-col items-center justify-center shrink-0 border-r border-gray-50 ${isToday ? "bg-brand text-white" : "bg-gray-50 text-gray-500"}`}
                  >
                    <span className="text-2xl font-black">
                      {meetDate.getUTCDate()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {meetDate.toLocaleDateString("es-ES", {
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-between gap-2 md:gap-0">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${getStatusColor(meet.status)}`}
                        >
                          {meet.status}
                        </span>
                        {meet.time && (
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {meet.time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-xs font-black uppercase leading-tight line-clamp-2 ${isActive ? "text-brand" : "text-gray-900"}`}
                      >
                        {meet.title}
                      </h3>
                    </div>
                    {participants[0] ? (
                      <div className="flex items-center gap-2 mt-1">
                        {participants[0].logo ? (
                          <img
                            src={participants[0].logo}
                            className="w-5 h-5 rounded-full bg-gray-100 object-cover"
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getTypeIcon(participants[0].type)}
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-gray-500 uppercase truncate max-w-[120px]">
                          {participants[0].name}{" "}
                          {participants.length > 1 && (
                            <span className="text-brand">
                              +{participants.length - 1}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-300 italic">
                        Sin participantes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {meetings.length === 0 && (
              <div className="w-full text-center py-10 text-gray-300 font-black uppercase text-xs">
                Agenda libre
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL GESTIÓN */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-100">
        {!selectedMeetingId ? (
          <div className="flex-1 flex items-center justify-center p-12 bg-gray-50/30">
            <div className="max-w-4xl w-full bg-white rounded-[40px] shadow-sm border border-gray-100 p-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                  Resumen{" "}
                  {currentMonth.toLocaleDateString("es-ES", { month: "long" })}
                </h2>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.setMonth(currentMonth.getMonth() - 1),
                        ),
                      )
                    }
                    className="px-4 py-2 hover:bg-white rounded-lg text-xs font-bold"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.setMonth(currentMonth.getMonth() + 1),
                        ),
                      )
                    }
                    className="px-4 py-2 hover:bg-white rounded-lg text-xs font-bold"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                    <Users size={24} />
                  </div>
                  <span className="text-4xl font-black text-blue-900">
                    {stats.totalCount}
                  </span>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-2">
                    Reuniones
                  </p>
                </div>
                <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 text-center">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 shadow-sm">
                    <Timer size={24} />
                  </div>
                  <span className="text-4xl font-black text-purple-900">
                    {stats.totalHours}
                  </span>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mt-2">
                    Horas
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
                    <Briefcase size={24} />
                  </div>
                  <span className="text-4xl font-black text-emerald-900">
                    {stats.partnersCount}
                  </span>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2">
                    Con Socios
                  </p>
                </div>
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                    <Heart size={24} />
                  </div>
                  <span className="text-4xl font-black text-rose-900">
                    {stats.donorsCount}
                  </span>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-2">
                    Con Donantes
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-6 duration-500">
            {/* TOOLBAR */}
            <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-20">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-2 rounded-xl text-gray-500">
                  <FileText size={20} />
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="bg-gray-50 px-2 py-1 rounded text-lg font-black text-gray-900 outline-none w-64"
                      value={formData.title}
                      onChange={(e) => liveUpdate("title", e.target.value)}
                    />
                  ) : (
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">
                      {formData.title || "Nueva Reunión"}
                    </h2>
                  )}
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {isEditing
                      ? "Editando Detalles..."
                      : `${formData.participants_list.length} Participantes`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedMeetingId !== "NEW" && (
                  <button
                    onClick={() => {
                      if (!isReadOnly) setIsEditing(!isEditing);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isEditing ? "bg-gray-100 text-gray-600" : "bg-brand text-white shadow-lg"} ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isReadOnly ? (
                      <>
                        <Eye size={14} /> Solo Lectura
                      </>
                    ) : isEditing ? (
                      <>
                        <Eye size={14} /> Ver
                      </>
                    ) : (
                      <>
                        <Edit3 size={14} /> Editar
                      </>
                    )}
                  </button>
                )}
                {isEditing && selectedMeetingId !== "NEW" && !isReadOnly && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={handleClosePanel}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CONTENIDO */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto grid grid-cols-12 gap-8">
                {/* COLUMNA IZQUIERDA */}
                <div className="col-span-12 md:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
                    {isEditing ? (
                      <>
                        <div className="bg-yellow-50 p-3 rounded-xl mb-4 border border-yellow-100">
                          <p className="text-[10px] font-bold text-yellow-700 uppercase flex items-center gap-2">
                            <Edit3 size={12} /> Estás editando
                          </p>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                            Agregar
                          </label>
                          <div className="flex gap-2 mb-2">
                            {[
                              { id: "PARTNER", label: "Socio" },
                              { id: "DONOR", label: "Donante" },
                              { id: "TEAM", label: "Equipo" },
                              { id: "OTHER", label: "Otro" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setTempType(t.id)}
                                className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${tempType === t.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            {tempType === "PARTNER" ? (
                              <select
                                className="flex-1 bg-gray-50 p-2 rounded-lg text-xs font-bold"
                                value={tempPartnerId}
                                onChange={(e) =>
                                  setTempPartnerId(e.target.value)
                                }
                              >
                                <option value="">Socio...</option>
                                {partners.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="flex-1 bg-gray-50 p-2 rounded-lg text-xs font-bold"
                                placeholder="Nombre"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                              />
                            )}
                            <button
                              onClick={addParticipant}
                              className="bg-gray-900 text-white p-2 rounded-lg"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {formData.participants_list.map((p, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border text-[9px] font-bold uppercase"
                              >
                                {p.name}
                                <button
                                  onClick={() => removeParticipant(p.name)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                              Fecha
                            </label>
                            <input
                              type="date"
                              className="w-full bg-gray-50 p-2 rounded-xl text-xs font-bold"
                              value={formData.date}
                              onChange={(e) =>
                                liveUpdate("date", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                              Hora
                            </label>
                            <input
                              type="time"
                              className="w-full bg-gray-50 p-2 rounded-xl text-xs font-bold"
                              value={formData.time}
                              onChange={(e) =>
                                liveUpdate("time", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                              Link
                            </label>
                            <input
                              type="text"
                              className="w-full bg-gray-50 p-2 rounded-xl text-xs"
                              value={formData.link}
                              onChange={(e) =>
                                liveUpdate("link", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                              Estado
                            </label>
                            <select
                              className="w-full bg-gray-50 p-2 rounded-xl text-xs font-bold"
                              value={formData.status}
                              onChange={(e) =>
                                liveUpdate("status", e.target.value)
                              }
                            >
                              <option value="PROGRAMADA">Pendiente</option>
                              <option value="REALIZADA">Finalizada</option>
                              <option value="CANCELADA">Cancelada</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={handleSave}
                          className="w-full bg-brand text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest mt-4"
                        >
                          Guardar Cambios
                        </button>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Cuándo
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
                              <Calendar size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {new Date(formData.date).toLocaleDateString(
                                  "es-ES",
                                  {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                  },
                                )}
                              </p>
                              <p className="text-xs font-bold text-brand">
                                {formData.time} ({formData.duration} min)
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            Quienes
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.participants_list.length === 0 ? (
                              <span className="text-xs italic text-gray-300">
                                Nadie asignado
                              </span>
                            ) : (
                              formData.participants_list.map((p, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2"
                                >
                                  {p.logo ? (
                                    <img
                                      src={p.logo}
                                      className="w-4 h-4 rounded-full"
                                    />
                                  ) : (
                                    <User size={12} />
                                  )}
                                  {p.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            Dónde
                          </p>
                          {formData.link ? (
                            <a
                              href={formData.link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-xs uppercase hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                              <Video size={16} /> Unirse a la Reunión
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Sin enlace
                            </span>
                          )}
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                          <span
                            className={`block text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusColor(formData.status)}`}
                          >
                            {formData.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: DOCUMENTACIÓN */}
                <div className="col-span-12 md:col-span-8 space-y-6">
                  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col">
                    {/* AGENDA */}
                    <div className="mb-8">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                        <Layout size={16} /> Agenda
                      </h3>
                      {isEditing ? (
                        <textarea
                          className="w-full h-32 bg-gray-50 border border-gray-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-brand transition-all resize-none"
                          value={formData.agenda}
                          onChange={(e) => liveUpdate("agenda", e.target.value)}
                          placeholder="- Puntos a tratar..."
                        />
                      ) : (
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-brand/20 min-h-[60px]">
                          {formData.agenda || (
                            <span className="text-gray-300 italic">
                              Sin agenda definida.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACUERDOS */}
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-emerald-100 pb-2">
                        <CheckCircle size={16} /> Acuerdos / Minuta
                      </h3>
                      {isEditing ? (
                        <textarea
                          className="flex-1 w-full bg-emerald-50/30 border border-emerald-100 p-6 rounded-2xl text-sm font-mono text-gray-800 leading-relaxed outline-none focus:bg-white focus:border-emerald-300 transition-all custom-scrollbar resize-none"
                          value={formData.agreements}
                          onChange={(e) =>
                            liveUpdate("agreements", e.target.value)
                          }
                          placeholder="Escribe los acuerdos..."
                        />
                      ) : (
                        <div className="flex-1 bg-emerald-50/10 p-6 rounded-2xl text-sm font-medium text-gray-800 leading-loose whitespace-pre-line border border-emerald-100/50">
                          {formData.agreements || (
                            <span className="text-gray-400 italic">
                              No hay acuerdos registrados.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
