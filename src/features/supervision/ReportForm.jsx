/**
 * COMPONENTE: ReportForm (Motor de Reportabilidad)
 * -----------------------------------------------
 * Formulario dinámico e inteligente para la captura de KPIs mensuales.
 * 
 * LOGICA "SMART" JIT (Just-In-Time):
 * 1. PRE-POBLADO: Al crear un reporte, el sistema detecta el último mes registrado y 
 *    clona automáticamente: Season, Web URL, Social Links y % de avance para minimizar fricción.
 * 2. VALIDACIÓN DE TEMPORADA: Cruza datos con el 'Chocolateo' Global. Si es mes de Milkywire 
 *    o hito de Video, el sistema bloquea el envío sin la entrega o su debida justificación.
 * 3. CAMPOS DINÁMICOS: Inyecta campañas globales configuradas por el Admin en 
 *    tiempo real.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  ArrowLeft,
  Save,
  Edit,
  Calendar,
  Star,
  CheckCircle2,
  Image as ImageIcon,
  Globe,
  X,
  Plus,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

/**
 * COMPONENTE: ReportForm
 * ---------------------
 * Este componente es el formulario dinámico para la creación y edición de reportes mensuales.
 * Es una de las piezas más complejas del sistema debido a su lógica de "Just-in-Time":
 * 
 * CARACTERÍSTICAS CLAVE:
 * 1. PERSISTENCIA INTELIGENTE: Al crear un nuevo reporte, busca el mes anterior y precarga datos 
 *    como el porcentaje de avance web y enlaces sociales para ahorrar tiempo al usuario.
 * 2. RESTRICCIONES REQUERIDAS: Si es mes de entrega de video o Milkywire, el formulario obliga 
 *    al usuario a registrar el material o justificar la falta.
 * 3. CAMPOS DINÁMICOS: Las campañas mostradas dependen de la configuración global de la temporada.
 * */
// Parámetros de la URL: projectId siempre presente, reportId solo en modo edición.
export default function ReportForm({ isViewMode = false }) {
  const { projectId, reportId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const isEditing = Boolean(reportId);

  // --- ESTADOS TEMPORALES (Buffers para inputs de listas) ---
  const [currentLink, setCurrentLink] = useState("");
  const [tempCamp, setTempCamp] = useState({ title: "", comment: "" });
  const [tempVideo, setTempVideo] = useState({ topic: "", comment: "" });
  const [tempMilky, setTempMilky] = useState({ topic: "", comment: "" });

  // Flags para marcar secciones como "No hubo entrega este mes"
  const [noCamps, setNoCamps] = useState(false);
  const [noVideos, setNoVideos] = useState(false);
  const [noMilky, setNoMilky] = useState(false);

  // --- ESTADOS DE CONFIGURACIÓN GLOBAL ---
  const [globalCampaigns, setGlobalCampaigns] = useState([]); // Campañas de temporada
  const [partnerCampaigns, setPartnerCampaigns] = useState([]); // Campañas del dashboard de campañas
  const [isMilkyMonth, setIsMilkyMonth] = useState(false); // ¿A este socio le toca Milkywire hoy?

  // --- MODELO DE DATOS PRINCIPAL (Sincronizado con Supabase 'monthly_reports') ---
  const [formData, setFormData] = useState({
    project_id: projectId,
    report_month: "",
    report_year: new Date().getFullYear(),
    season_name: "", // Ej: "2025-2026"
    photo_count: 0,
    photo_comment: "",
    post_count: 0,
    post_comment: "",
    web_progress_percent: 0,
    web_url: "",
    web_comment: "",
    video_comment: "",
    campaign_comment: "",
    season_comment: "", // Conclusión final
    social_links: [],
    campaigns: [], // JSONB: [{title, comment}, ...]
    videos: [],    // JSONB: [{topic, comment}, ...]
    milkywire_material: [],
    milkywire_comment: "",
    is_season_start: false,
    is_last_month: false,
    corrections: [], // <--- NUEVO CAMPO: Historial de cambios
  });

  // Meses donde el equipo de comunicación exige videos de corte.
  const videoMonths = ["Junio", "Octubre", "Marzo"];
  const isVideoMonth = videoMonths.includes(formData?.report_month);

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const seasons = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];

  // Sanitización de datos: Asegura que campos JSONB sean siempre arrays para evitar errores de .map()
  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  };

  // Carga inicial de datos
  useEffect(() => {
    if (isEditing) fetchReportForEdit();
    else fetchInitialDataForNew();
  }, [projectId, reportId]);

  // Sincronización Global: Cuando cambia el mes o temporada, re-calculamos si toca Milkywire o qué campañas mostrar.
  useEffect(() => {
    if (formData.season_name && project?.partners?.id) {
      loadGlobalSettings(formData.season_name, project.partners.id, formData.report_month);
    }
  }, [formData.season_name, formData.report_month, project?.partners?.id]);

  /**
   * loadGlobalSettings: Cruza los datos del reporte actual con las configuraciones del Admin.
   */
  async function loadGlobalSettings(season, partnerId, currentMonth) {
    try {
      // 1. Cargamos las campañas que el admin habilitó para esta temporada específica.
      const { data: camps } = await supabase.from("season_campaigns").select("*").eq("season_name", season);
      setGlobalCampaigns(camps || []);

      // 2. Cargamos las campañas específicas del socio (del Dashboard de Campañas)
      // Buscamos campañas donde esté incluido este partner.
      const { data: partCamps } = await supabase
        .from("campaigns")
        .select("*")
        .contains("partner_ids", [partnerId]);

      setPartnerCampaigns(partCamps || []);

      // 3. Verificamos el 'Chocolateo': ¿Está este socio agendado para Milkywire en este mes?
      if (currentMonth) {
        const { data: milky } = await supabase.from("milkywire_schedules")
          .select("*")
          .eq("season_name", season)
          .eq("target_month", currentMonth)
          .eq("partner_id", partnerId);
        setIsMilkyMonth(milky && milky.length > 0);
      } else {
        setIsMilkyMonth(false);
      }
    } catch (err) {
      console.error("Error loading global settings:", err);
    }
  }

  /**
   * fetchInitialDataForNew: "Smart Creation"
   * Busca el último reporte cronológico de este proyecto para autopoblar el nuevo.
   */
  async function fetchInitialDataForNew() {
    setLoading(true);
    try {
      const { data: projData } = await supabase
        .from("projects")
        .select("*, partners(name)")
        .eq("id", projectId)
        .single();
      setProject(projData);

      // Obtenemos el último reporte para heredar configuraciones
      const { data: reports } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        const last = reports[0];
        const lastMonthIndex = months.indexOf(last.report_month);

        // Lógica de avance temporal automático: Si el último fue Enero, el nuevo es Febrero.
        setFormData((prev) => ({
          ...prev,
          season_name: last.season_name || "2025-2026",
          report_month:
            lastMonthIndex === 11 ? months[0] : months[lastMonthIndex + 1],
          report_year:
            lastMonthIndex === 11 ? last.report_year + 1 : last.report_year,
          web_progress_percent: last.web_progress_percent || 0,
          campaigns: ensureArray(last.campaigns),
          videos: ensureArray(last.videos),
          milkywire_material: ensureArray(last.milkywire_material),
          social_links: ensureArray(last.social_links),
          web_url: last.web_url || "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, season_name: "2025-2026" }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Carga un reporte existente para su edición.
   */
  async function fetchReportForEdit() {
    setLoading(true);
    try {
      const { data: projData } = await supabase
        .from("projects")
        .select("*, partners(name)")
        .eq("id", projectId)
        .single();
      setProject(projData);

      const { data: report, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      if (report) {
        setFormData({
          ...report,
          social_links: ensureArray(report.social_links),
          campaigns: ensureArray(report.campaigns),
          videos: ensureArray(report.videos),
          milkywire_material: ensureArray(report.milkywire_material),
          corrections: ensureArray(report.corrections),
        });

        // Marcamos flags de "Sin Entrega" si hay comentario pero no hay items en los arrays
        if (report.video_comment && ensureArray(report.videos).length === 0)
          setNoVideos(true);
        if (
          report.campaign_comment &&
          ensureArray(report.campaigns).length === 0
        )
          setNoCamps(true);
        if (
          report.milkywire_comment &&
          ensureArray(report.milkywire_material).length === 0
        )
          setNoMilky(true);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Añade una URL a la lista de enlaces sociales del reporte.
   */
  const addSocialLink = () => {
    if (currentLink.trim()) {
      setFormData((prev) => ({
        ...prev,
        social_links: [...prev.social_links, currentLink.trim()],
      }));
      setCurrentLink("");
    }
  };

  /**
   * addItem: Añade un nuevo item (Video/Campaña/Milkywire) a su respectiva lista JSONB.
   */
  const addItem = (type, tempData, setTemp, field) => {
    if (tempData[field]?.trim()) {
      let newItem = { ...tempData };
      setFormData((prev) => ({
        ...prev,
        [type]: [...ensureArray(prev[type]), newItem],
      }));

      // Limpieza del buffer temporal según el tipo de dato
      if (type === "videos") setTemp({ topic: "", comment: "" });
      else if (type === "milkywire_material") setTemp({ topic: "", comment: "" });
      else setTemp({ title: "", comment: "" });
    }
  };

  /**
   * handleToggleCampaign: Gestión de los checkboxes de campañas globales.
   * Si se marca, se añade al array de campañas del reporte. Si se desmarca, se elimina.
   */
  const handleToggleCampaign = (campTitle) => {
    const currentCamps = ensureArray(formData.campaigns);
    const exists = currentCamps.some(c => c.title === campTitle);

    if (exists) {
      setFormData(prev => ({
        ...prev,
        campaigns: currentCamps.filter(c => c.title !== campTitle)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        campaigns: [...currentCamps, { title: campTitle, comment: "" }]
      }));
    }
  };

  /**
   * Actualiza el comentario específico de una participación en campaña global.
   */
  const updateCampaignComment = (campTitle, text) => {
    const updated = ensureArray(formData.campaigns).map(c => {
      if (c.title === campTitle) return { ...c, comment: text };
      return c;
    });
    setFormData(prev => ({ ...prev, campaigns: updated }));
  };

  /**
   * updateGenericField: Utilidad para editar campos dentro de objetos anidados en arrays JSONB.
   */
  const updateGenericField = (type, index, field, value) => {
    const updated = [...ensureArray(formData[type])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, [type]: updated }));
  };

  // --- ENVÍO DEL REPORTE (LÓGICA DE NEGOCIO Y VALIDACIÓN) ---

  /**
   * handleSubmit: Procesa el guardado del reporte con validaciones estrictas de temporada.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. VALIDACIONES DE NEGOCIO (REGLAS DE COMUNICACIÓN)
      // Si el equipo comunicó que es mes de video o Milkywire, el socio NO puede dejar el reporte vacío
      // sin al menos explicar por qué no se cumplió la entrega.

      // Regla de Video (Meses fijos: Junio, Octubre, Marzo)
      if (isVideoMonth && ensureArray(formData.videos).length === 0 && !formData.video_comment?.trim()) {
        throw new Error("⚠️ Es mes de entrega de Video (Junio/Octubre/Marzo). Debes registrar el video o dejar una justificación obligatoria.");
      }

      // Regla de Milkywire (Basada en el Chocolateo Admin)
      if (isMilkyMonth && ensureArray(formData.milkywire_material).length === 0 && !formData.milkywire_comment?.trim()) {
        throw new Error("⚠️ Estás asignado para Milkywire este mes. Debes registrar el material o dejar una justificación obligatoria.");
      }

      // 2. PREPARACIÓN FINAL DE DATOS
      const dataToSave = {
        ...formData,
        project_id: projectId,
        // Sanitización final: Nos aseguramos de que no viajen nulos a los campos JSONB
        social_links: ensureArray(formData.social_links),
        campaigns: ensureArray(formData.campaigns),
        videos: ensureArray(formData.videos),
        milkywire_material: ensureArray(formData.milkywire_material),
      };

      // 3. PERSISTENCIA EN SUPABASE
      let error;
      if (isEditing) {
        // --- LÓGICA DE HISTORIAL DE CORRECCIONES ---
        // Obtenemos la versión actual antes de guardar para comparar
        const { data: currentReport } = await supabase
          .from("monthly_reports")
          .select("*")
          .eq("id", reportId)
          .single();

        if (currentReport) {
          const newCorrections = [];
          const timestamp = new Date().toISOString();

          // Campos a monitorear: fotos, posts, comentarios principales
          const fieldsToWatch = [
            { id: "photo_count", label: "Fotos" },
            { id: "post_count", label: "Posts" },
            { id: "web_progress_percent", label: "Avance Web" },
            { id: "photo_comment", label: "Comentario Fotos" },
            { id: "post_comment", label: "Comentario Posts" },
            { id: "web_comment", label: "Comentario Web" },
            { id: "video_comment", label: "Comentario Videos" },
            { id: "campaign_comment", label: "Comentario Campañas" },
            { id: "season_comment", label: "Observación General" }
          ];

          fieldsToWatch.forEach(field => {
            const oldVal = currentReport[field.id];
            const newVal = formData[field.id];

            // Comparamos valores (con conversión a string para ser seguros)
            if (String(oldVal) !== String(newVal)) {
              newCorrections.push({
                field: field.id,
                label: field.label,
                oldValue: oldVal,
                newValue: newVal,
                timestamp
              });
            }
          });

          // Si hay cambios, los añadimos al historial existente
          if (newCorrections.length > 0) {
            dataToSave.corrections = [
              ...ensureArray(currentReport.corrections),
              ...newCorrections
            ];
          }
        }

        // Modo Edición: UPDATE
        const { error: updErr } = await supabase
          .from("monthly_reports")
          .update(dataToSave)
          .eq("id", reportId);
        error = updErr;
      } else {
        // Modo Creación: INSERT
        const { error: insErr } = await supabase
          .from("monthly_reports")
          .insert([dataToSave]);
        error = insErr;
      }

      if (error) throw error;

      alert("✅ Reporte guardado con éxito");
      navigate(`/supervision/historial/${projectId}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * UI: Estado de Carga
   */
  if (loading)
    return (
      <div className="p-20 text-center text-brand font-black animate-pulse uppercase tracking-widest">
        {isEditing ? "Cargando..." : "Sincronizando..."}
      </div>
    );

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 bg-gray-50/20 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand mb-4 font-bold text-[10px] uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={16} /> Regresar
          </button>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            {isEditing && !isViewMode ? <Edit className="text-brand" size={32} /> : null}
            {isViewMode ? <CheckCircle2 className="text-brand" size={32} /> : null}
            {isViewMode ? "Ver Reporte" : isEditing ? "Editar Reporte" : "Nuevo Reporte"}
          </h1>
          <p className="text-brand font-bold text-sm md:text-lg mt-1 italic">
            {project?.partners?.name} / {project?.name}
          </p>
        </div>
        {!isViewMode && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-brand hover:bg-brand-light text-white w-14 h-14 rounded-2xl transition-all shadow-xl shadow-brand/20 flex items-center justify-center group active:scale-90 border border-brand/10"
          >
            <Save size={24} className="text-white" />
          </button>
        )}
      </div>

      {isViewMode && ensureArray(formData.corrections).length > 0 && (
        <div className="mb-10 bg-orange-50 border-2 border-orange-100 p-6 rounded-[32px] animate-in fade-in slide-in-from-top-4">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Edit size={14} /> Historial de Correcciones Visuales
          </p>
          <div className="flex flex-wrap gap-3">
            {ensureArray(formData.corrections).map((c, i) => (
              <div key={i} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-900 uppercase">{c.label}</span>
                <span className="text-[10px] text-gray-400 line-through">{c.oldValue || "Vacio"}</span>
                <ChevronRight size={10} className="text-orange-500" />
                <span className="text-[10px] font-bold text-orange-600">{c.newValue || "Vacio"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
      >
        {/* COLUMNA 1 */}
        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Periodo
            </p>
            <div className="grid grid-cols-2 gap-4">
              <select
                className="col-span-2 bg-gray-50 border-none rounded-xl p-4 font-bold text-sm uppercase cursor-pointer outline-none"
                value={formData.season_name}
                required
                disabled={isViewMode}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, season_name: e.target.value }))
                }
              >
                <option value="">-- Temporada --</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className="bg-gray-50 border-none rounded-xl p-4 font-bold text-sm"
                value={formData.report_month}
                required
                disabled={isViewMode}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, report_month: e.target.value }))
                }
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="bg-gray-50 border-none rounded-xl p-4 font-bold text-sm"
                value={formData.report_year}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    report_year: parseInt(e.target.value),
                  }))
                }
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <label className="cursor-pointer flex-1">
                <div
                  className={`py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${formData.is_season_start
                    ? "bg-brand border-brand text-white shadow-md"
                    : "bg-transparent border-gray-100 text-gray-400"
                    }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.is_season_start}
                    disabled={isViewMode}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        is_season_start: e.target.checked,
                      }))
                    }
                  />
                  <Star
                    size={12}
                    className={formData.is_season_start ? "fill-white" : ""}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Inicio
                  </span>
                </div>
              </label>
              <label className="cursor-pointer flex-1">
                <div
                  className={`py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${formData.is_last_month
                    ? "bg-gray-900 border-gray-900 text-white shadow-md"
                    : "bg-transparent border-gray-100 text-gray-400"
                    }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.is_last_month}
                    disabled={isViewMode}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        is_last_month: e.target.checked,
                      }))
                    }
                  />
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    Final
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-gray-800 uppercase flex items-center gap-2">
              <ImageIcon size={20} className="text-brand" /> Redes Sociales
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Pegar URL..."
                  className="flex-1 bg-gray-50 border-none rounded-xl p-4 text-sm italic"
                  value={currentLink}
                  disabled={isViewMode}
                  onChange={(e) => setCurrentLink(e.target.value)}
                />
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="bg-brand text-white px-5 rounded-xl font-black"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(formData.social_links) &&
                  formData.social_links.map((l, i) => (
                    <div
                      key={i}
                      className="bg-brand/10 text-brand text-[9px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-black border border-brand/5 max-w-full"
                    >
                      <span className="truncate max-w-[150px]">{l}</span>
                      {!isViewMode && (
                        <X
                          size={12}
                          className="cursor-pointer hover:text-red-500"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              social_links: p.social_links.filter(
                                (_, idx) => idx !== i
                              ),
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
              </div>
              <div className="space-y-6 pt-4 border-t border-gray-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Fotos Recibidas
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      className="w-16 h-12 bg-gray-50 border-none rounded-xl font-black text-center text-sm"
                      value={formData.photo_count}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          photo_count: e.target.value,
                        }))
                      }
                    />
                    <textarea
                      placeholder="Comentario..."
                      className="flex-1 bg-brand/5 rounded-2xl p-4 text-sm italic min-h-[80px] outline-none"
                      value={formData.photo_comment}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          photo_comment: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Posts Publicados
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      className="w-16 h-12 bg-gray-50 border-none rounded-xl font-black text-center text-sm"
                      value={formData.post_count}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          post_count: e.target.value,
                        }))
                      }
                    />
                    <textarea
                      placeholder="Comentario..."
                      className="flex-1 bg-brand/5 rounded-2xl p-4 text-sm italic min-h-[80px] outline-none"
                      value={formData.post_comment}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          post_comment: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-800 uppercase flex items-center gap-2">
                <Globe size={20} className="text-brand" /> Avance Web
              </h2>
              <span className="bg-brand/10 text-brand px-3 py-1 rounded-lg font-black text-xs">
                {formData.web_progress_percent}%
              </span>
            </div>
            <input
              type="range"
              className="w-full accent-brand cursor-pointer h-2"
              value={formData.web_progress_percent}
              disabled={isViewMode}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  web_progress_percent: e.target.value,
                }))
              }
            />
            <textarea
              placeholder="Detalles del avance..."
              className="w-full bg-brand/5 rounded-2xl p-5 text-sm italic min-h-[100px] outline-none shadow-inner"
              value={formData.web_comment}
              disabled={isViewMode}
              onChange={(e) =>
                setFormData((p) => ({ ...p, web_comment: e.target.value }))
              }
            />
          </div>
        </div>

        {/* COLUMNA 2: HITOS Y ENTREGABLES */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
          <h2 className="text-lg font-black text-gray-800 uppercase">
            Hitos de Difusión
          </h2>

          {/* =======================================================
              CAMPAÑAS GLOBALES (Reescrito)
             ======================================================= */}
          {/* =======================================================
              1. CAMPAÑAS DE TEMPORADA
             ======================================================= */}
          <div className="space-y-4 pt-8 border-t border-gray-50 first:pt-0 first:border-0">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Campañas de Temporada <span className="text-brand ml-1">({ensureArray(formData.campaigns).length})</span>
              </label>
            </div>

            {/* SECCIÓN A: Campañas Globales (Configuradas por Admin) */}
            {(globalCampaigns.length > 0 || partnerCampaigns.length > 0) && (
              <div className="space-y-3 bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-100 mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 italic">
                  Selecciona de la lista de campañas activas:
                </p>

                {/* 1. Campañas Globales de Temporada */}
                {globalCampaigns.map(camp => {
                  const isChecked = ensureArray(formData.campaigns).some(c => c.title === camp.title);
                  const currentCampData = ensureArray(formData.campaigns).find(c => c.title === camp.title);

                  return (
                    <div key={camp.id} className={`p-4 rounded-xl border-2 transition-all ${isChecked ? "bg-white border-brand shadow-sm" : "bg-white/50 border-gray-100 hover:border-gray-300"}`}>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-brand"
                          checked={isChecked}
                          disabled={isViewMode}
                          onChange={() => handleToggleCampaign(camp.title)}
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-black uppercase ${isChecked ? "text-brand" : "text-gray-600"}`}>{camp.title}</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Global AA</span>
                        </div>
                      </label>

                      {isChecked && (
                        <textarea
                          placeholder="Link de post o breve descripción de participación..."
                          className="w-full mt-3 bg-gray-50 border-none rounded-xl p-3 text-xs italic font-medium outline-none text-gray-700"
                          rows="2"
                          value={currentCampData?.comment || ""}
                          disabled={isViewMode}
                          onChange={(e) => updateCampaignComment(camp.title, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}

                {/* 2. Campañas Específicas del Socio */}
                {partnerCampaigns.map(camp => {
                  const isChecked = ensureArray(formData.campaigns).some(c => c.title === camp.title);
                  const currentCampData = ensureArray(formData.campaigns).find(c => c.title === camp.title);

                  return (
                    <div key={camp.id} className={`p-4 rounded-xl border-2 transition-all ${isChecked ? "bg-white border-blue-500 shadow-sm" : "bg-white/50 border-gray-100 hover:border-gray-300"}`}>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-blue-500"
                          checked={isChecked}
                          disabled={isViewMode}
                          onChange={() => handleToggleCampaign(camp.title)}
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-black uppercase ${isChecked ? "text-blue-600" : "text-gray-600"}`}>{camp.title}</span>
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Específica Socio</span>
                        </div>
                      </label>

                      {isChecked && (
                        <textarea
                          placeholder="Detalle de ejecución o resultados..."
                          className="w-full mt-3 bg-gray-50 border-none rounded-xl p-3 text-xs italic font-medium outline-none text-gray-700"
                          rows="2"
                          value={currentCampData?.comment || ""}
                          disabled={isViewMode}
                          onChange={(e) => updateCampaignComment(camp.title, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECCIÓN B: Carga Manual (Para campañas no listadas o históricas) */}
            <div className="bg-brand/5 p-6 rounded-2xl border border-brand/10 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand/60 pl-1">
                ¿Otra campaña o evento? (Carga Manual)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre de la campaña..."
                  className="flex-1 bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm"
                  value={tempCamp.title}
                  disabled={isViewMode}
                  onChange={(e) => setTempCamp(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <textarea
                placeholder="Detalle de participación o links..."
                className="w-full bg-white border-none rounded-xl p-4 text-xs italic font-medium outline-none text-gray-700 shadow-sm"
                rows="2"
                value={tempCamp.comment}
                disabled={isViewMode}
                onChange={(e) => setTempCamp(p => ({ ...p, comment: e.target.value }))}
              />
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => addItem("campaigns", tempCamp, setTempCamp, "title")}
                  className="w-full py-3 bg-brand/10 text-brand text-[10px] font-black rounded-xl uppercase tracking-[0.1em] hover:bg-brand hover:text-white transition-all border border-brand/20"
                >
                  + Agregar Campaña Manual
                </button>
              )}
            </div>

            {/* SECCIÓN C: Comentario General de Campañas (Siempre habilitado) */}
            <div className="space-y-2 pt-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Conclusión / Comentario General de Campañas del Mes
              </label>
              <textarea
                placeholder="Resumen general de las campañas de este mes..."
                className="w-full bg-gray-50 rounded-2xl p-5 text-sm italic min-h-[100px] outline-none shadow-inner border border-gray-100"
                value={formData.campaign_comment}
                disabled={isViewMode}
                onChange={(e) => setFormData(p => ({ ...p, campaign_comment: e.target.value }))}
              />
            </div>
          </div>


          {/* =======================================================
              VIDEOS Y MILKYWIRE (Mapeo dinámico modificado)
             ======================================================= */}
          {[
            {
              id: "videos",
              label: "Videos de Temporada",
              temp: tempVideo,
              setTemp: setTempVideo,
              field: "topic",
              commentField: "video_comment",
              no: noVideos,
              setNo: setNoVideos,
              isSpecialMonth: isVideoMonth,
              alertText: `⚠️ Entrega obligatoria configurada para el mes de ${formData.report_month}.`
            },
            {
              id: "milkywire_material",
              label: "Material Milkywire",
              temp: tempMilky,
              setTemp: setTempMilky,
              field: "topic",
              commentField: "milkywire_comment",
              no: noMilky,
              setNo: setNoMilky,
              isSpecialMonth: isMilkyMonth,
              alertText: `¡Felicidades! Fuiste seleccionado en el chocolateo global para subir video este mes de ${formData.report_month}.`
            },
          ].map((sec) => (
            <div
              key={sec.id}
              className="space-y-4 pt-8 border-t border-gray-50"
            >
              {sec.isSpecialMonth && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-xl">
                  <p className="text-xs font-black text-orange-800 uppercase tracking-tight">{sec.alertText}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {sec.label}{" "}
                  <span className="text-brand ml-1">
                    ({ensureArray(formData[sec.id]).length})
                  </span>
                </label>

                {/* Switch de "Sin Entrega" para modo justificación */}
                {!isViewMode && (
                  <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100/30">
                    <input
                      type="checkbox"
                      className="accent-red-500 scale-110 cursor-pointer"
                      checked={sec.no}
                      onChange={(e) => sec.setNo(e.target.checked)}
                    />
                    <span className="text-[10px] font-bold text-red-600 uppercase">
                      Sin Entrega
                    </span>
                  </div>
                )}
              </div>

              {/* ÁREA DE CARGA MANUAL (Ahora siempre disponible o por toggle) */}
              <div className="bg-gray-50 p-6 rounded-2xl space-y-3 shadow-inner border border-gray-100">
                {!sec.no ? (
                  <>
                    <input
                      type="text"
                      placeholder={`Link o Nombre del material...`}
                      className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm"
                      value={sec.temp[sec.field]}
                      disabled={isViewMode}
                      onChange={(e) =>
                        sec.setTemp((p) => ({
                          ...p,
                          [sec.field]: e.target.value,
                        }))
                      }
                    />
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() =>
                          addItem(sec.id, sec.temp, sec.setTemp, sec.field)
                        }
                        className="w-full py-3 bg-brand text-white text-[10px] font-black rounded-xl uppercase tracking-[0.1em] active:scale-95 hover:brightness-110 transition-all shadow-md"
                      >
                        + Registrar Entrega Manual
                      </button>
                    )}
                    {/* Visualización de items cargados con inputs para detalles adicionales */}
                    {ensureArray(formData[sec.id]).length > 0 && (
                      <div className="space-y-3 mt-6">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Entregas Registradas:</p>
                        {ensureArray(formData[sec.id]).map((item, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center p-3 bg-gray-50/50">
                              <span className="text-[10px] font-black text-brand uppercase truncate max-w-[80%]">
                                {item[sec.field]}
                              </span>
                              {!isViewMode && (
                                <X
                                  size={14}
                                  className="cursor-pointer text-gray-300 hover:text-red-500 transition-colors"
                                  onClick={() => {
                                    const updated = ensureArray(formData[sec.id]).filter((_, i) => i !== idx);
                                    setFormData(p => ({ ...p, [sec.id]: updated }));
                                  }}
                                />
                              )}
                            </div>
                            <div className="p-3 bg-white">
                              <textarea
                                placeholder="Añadir links de respaldo, descripción o notas..."
                                className="w-full bg-gray-50 border-none rounded-lg p-2 text-[11px] italic font-medium outline-none text-gray-600 min-h-[50px] resize-none"
                                value={item.comment || ""}
                                disabled={isViewMode}
                                onChange={(e) => updateGenericField(sec.id, idx, "comment", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-red-500/70 uppercase mb-2 pl-1 italic">Modo Justificación Activado</p>
                    <textarea
                      placeholder={sec.isSpecialMonth ? "Indica obligatoriamente el motivo por el que NO se cumplió la entrega este mes..." : "Motivo (Opcional)..."}
                      className={`w-full bg-red-50 border-2 rounded-2xl p-4 text-sm italic outline-none transition-all ${sec.isSpecialMonth && !formData[sec.commentField]?.trim() ? "border-red-400 text-red-900" : "border-red-100/20 text-red-800"}`}
                      value={formData[sec.commentField]}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          [sec.commentField]: e.target.value,
                        }))
                      }
                    />
                    {sec.isSpecialMonth && !formData[sec.commentField]?.trim() && (
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest pl-2 animate-pulse">* Justificación Requerida para guardar el reporte.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* COLUMNA 3: NOTA FINAL */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border-2 border-brand/5 shadow-sm space-y-6 bg-gradient-to-br from-white to-gray-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand/10 rounded-2xl text-brand">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                Nota General
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Conclusión del reporte
              </p>
            </div>
          </div>
          <textarea
            value={formData.season_comment}
            disabled={isViewMode}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                season_comment: e.target.value,
              }))
            }
            placeholder="Escribe la conclusión final aquí..."
            className="w-full bg-gray-50/50 border-none rounded-[24px] p-4 md:p-8 font-medium text-gray-700 min-h-[460px] outline-none italic text-sm leading-relaxed shadow-inner"
          />
        </div>
      </form>
    </div>
  );
}
