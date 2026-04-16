/**
 * COMPONENTE: ProjectForm
 * -----------------------
 * Configuración técnica de los paisajes asignados a un socio.
 *
 * PARÁMETROS:
 * - 'start_date' y 'season_duration_months': Cronograma base.
 * - 'monthly_photos_target' y 'monthly_posts_target': Umbral semáforo.
 * - 'override_season_rules': Si es true, usa custom_video_months y custom_campaign_requirements.
 * - 'custom_video_months': JSONB array de meses de video personalizados.
 * - 'custom_campaign_requirements': JSONB array de {title, start_month, end_month}.
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  Save,
  ArrowLeft,
  Target,
  Layout,
  MapPin,
  CalendarDays,
  Settings2,
  Trash2,
  Plus,
  Video,
  Megaphone,
} from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function ProjectForm() {
  const navigate = useNavigate();
  const { partnerId, projectId } = useParams();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const isEditing = Boolean(projectId);

  const [formData, setFormData] = useState({
    name: "",
    partner_id: partnerId || "",
    landscape: "",
    season_duration_months: 12,
    monthly_photos_target: 10,
    monthly_posts_target: 4,
    start_date: "",
    override_season_rules: false,
    custom_video_months: [],
    custom_campaign_requirements: [],
  });

  // EFECTO 1: SI ESTAMOS EDITANDO, CARGAR DATOS DEL PROYECTO
  useEffect(() => {
    if (isEditing) {
      setFetching(true);
      const fetchProject = async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("*, partners(name)")
          .eq("id", projectId)
          .single();

        if (error) {
          alert("Error cargando proyecto");
          navigate("/supervision");
        } else {
          setFormData({
            name: data.name,
            partner_id: data.partner_id,
            landscape: data.landscape,
            season_duration_months: data.season_duration_months || 12,
            monthly_photos_target: data.monthly_photos_target || 10,
            monthly_posts_target: data.monthly_posts_target || 4,
            start_date: data.start_date || "",
            override_season_rules: data.override_season_rules || false,
            custom_video_months: Array.isArray(data.custom_video_months)
              ? data.custom_video_months
              : [],
            custom_campaign_requirements: Array.isArray(data.custom_campaign_requirements)
              ? data.custom_campaign_requirements
              : [],
          });
          setPartnerName(data.partners?.name);
        }
        setFetching(false);
      };
      fetchProject();
    }
  }, [projectId]);

  // EFECTO 2: SI ES NUEVO, CARGAR NOMBRE DEL SOCIO
  useEffect(() => {
    if (!isEditing && partnerId) {
      const getPartner = async () => {
        const { data } = await supabase
          .from("partners")
          .select("name")
          .eq("id", partnerId)
          .single();
        if (data) setPartnerName(data.name);
      };
      getPartner();
    }
  }, [partnerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 🔍 DEBUG: verificar qué se está enviando
    console.log("=== GUARDANDO PROYECTO ===");
    console.log("projectId:", projectId);
    console.log("season_duration_months:", formData.season_duration_months);
    console.log("typeof:", typeof formData.season_duration_months);

    try {
      // Campos base: siempre se guardan (existen en la tabla original)
      const basePayload = {
        name: formData.name,
        partner_id: formData.partner_id,
        landscape: formData.landscape,
        season_duration_months: Number(formData.season_duration_months),
        monthly_photos_target: Number(formData.monthly_photos_target),
        monthly_posts_target: Number(formData.monthly_posts_target),
        start_date: formData.start_date || null,
      };

      console.log("basePayload:", basePayload);

      // Primero intentamos solo con los campos base para garantizar el guardado
      if (isEditing) {
        const { data, error } = await supabase
          .from("projects")
          .update(basePayload)
          .eq("id", projectId)
          .select(); // <-- importante: retorna la fila actualizada

        console.log("Resultado update:", { data, error });

        if (error) {
          console.error("Error en update:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.warn("⚠️ Update no afectó ninguna fila. ¿projectId correcto?", projectId);
          throw new Error(`No se encontró el proyecto con ID ${projectId}. Puede ser un problema de permisos (RLS) o ID incorrecto.`);
        }

        // Si los campos de override existen, intentamos guardarlos también
        try {
          const overridePayload = {
            override_season_rules: formData.override_season_rules,
            custom_video_months: formData.custom_video_months,
            custom_campaign_requirements: formData.custom_campaign_requirements,
          };
          await supabase.from("projects").update(overridePayload).eq("id", projectId);
        } catch (overrideErr) {
          console.warn("campos override no disponibles todavía (SQL pendiente):", overrideErr);
        }

      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert([basePayload])
          .select();

        console.log("Resultado insert:", { data, error });
        if (error) throw error;
      }

      alert(
        isEditing
          ? "✅ Paisaje actualizado con éxito"
          : "✅ Paisaje creado con éxito"
      );
      navigate("/supervision");
    } catch (err) {
      console.error("Error guardando proyecto:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers para la sección de override ---
  const toggleVideoMonth = (month) => {
    const current = formData.custom_video_months || [];
    const updated = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month];
    setFormData({ ...formData, custom_video_months: updated });
  };

  const addCustomCampaign = () => {
    const updated = [
      ...(formData.custom_campaign_requirements || []),
      { title: "", start_month: "Enero", end_month: "Diciembre" },
    ];
    setFormData({ ...formData, custom_campaign_requirements: updated });
  };

  const updateCustomCampaign = (idx, field, value) => {
    const updated = [...formData.custom_campaign_requirements];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, custom_campaign_requirements: updated });
  };

  const removeCustomCampaign = (idx) => {
    const updated = formData.custom_campaign_requirements.filter((_, i) => i !== idx);
    setFormData({ ...formData, custom_campaign_requirements: updated });
  };

  if (fetching)
    return (
      <div className="p-20 text-center animate-pulse font-black text-brand uppercase tracking-widest">
        Cargando datos...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-gray-50/20 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand mb-4 font-bold text-[10px] uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">
            {isEditing ? "Editar Paisaje" : "Nuevo Paisaje"}
          </h1>
          <p className="text-brand font-bold text-sm md:text-lg mt-1 italic">
            Socio: {partnerName || "Cargando..."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* DATOS GENERALES */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl text-brand">
              <Layout size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
              Información General
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Nombre del Paisaje
              </label>
              <input
                type="text"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Tipo de Ecosistema
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20"
                  value={formData.landscape}
                  onChange={(e) => setFormData({ ...formData, landscape: e.target.value })}
                  required
                />
                <MapPin size={16} className="absolute right-4 top-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* REGLAS DE AUDITORÍA */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl text-brand">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none">
                Reglas de Auditoría
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Define fechas y metas para el semáforo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand uppercase tracking-widest pl-1">
                Fecha Inicio Temporada
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="start_date"
                  className="w-full bg-brand/5 border-none rounded-xl p-4 font-bold text-brand text-sm outline-none focus:ring-2 focus:ring-brand/20 uppercase cursor-pointer"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <CalendarDays size={16} className="absolute right-4 top-4 text-brand/40 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meses Temporada
              </label>
              <input
                type="number"
                min="1"
                max="36"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.season_duration_months}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFormData({ ...formData, season_duration_months: isNaN(val) ? formData.season_duration_months : val });
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meta Fotos / Mes
              </label>
              <input
                type="number"
                min="0"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.monthly_photos_target}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFormData({ ...formData, monthly_photos_target: isNaN(val) ? formData.monthly_photos_target : val });
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meta Posts / Mes
              </label>
              <input
                type="number"
                min="0"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.monthly_posts_target}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFormData({ ...formData, monthly_posts_target: isNaN(val) ? formData.monthly_posts_target : val });
                }}
              />
            </div>
          </div>
        </div>

        {/* MODIFICACIÓN MANUAL DE PRODUCTOS (OVERRIDE) */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-xl text-brand">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none">
                  Productos Manuales
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Anular reglas globales de temporada para este proyecto
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, override_season_rules: !formData.override_season_rules })
              }
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all tracking-widest border-2 ${
                formData.override_season_rules
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-gray-100 text-gray-500 border-gray-100 hover:border-brand hover:text-brand"
              }`}
            >
              {formData.override_season_rules ? "✓ Manual Activo" : "Activar Manual"}
            </button>
          </div>

          {formData.override_season_rules && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Meses de Video Personalizados */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={16} className="text-brand" />
                  <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                    Meses de Video (Personalizados)
                  </p>
                </div>
                <p className="text-[9px] font-medium text-gray-400">
                  Estos meses reemplazarán los globales de la temporada para este proyecto específico.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {MONTHS.map((mes) => {
                    const isSelected = (formData.custom_video_months || []).includes(mes);
                    return (
                      <button
                        key={mes}
                        type="button"
                        onClick={() => toggleVideoMonth(mes)}
                        className={`p-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${
                          isSelected
                            ? "bg-brand/10 border-brand text-brand"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {mes}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campañas Personalizadas */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone size={16} className="text-brand" />
                  <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                    Metas de Campañas (Personalizadas)
                  </p>
                </div>
                <p className="text-[9px] font-medium text-gray-400">
                  Define campañas con su rango de meses activos específicos para este proyecto.
                </p>

                <div className="space-y-3">
                  {(formData.custom_campaign_requirements || []).map((req, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
                    >
                      <input
                        className="flex-1 bg-gray-50 border-none rounded-lg p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Nombre Campaña..."
                        value={req.title}
                        onChange={(e) => updateCustomCampaign(idx, "title", e.target.value)}
                      />
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inicio</label>
                          <select
                            className="bg-gray-50 border-none rounded-lg p-3 text-xs font-bold outline-none"
                            value={req.start_month}
                            onChange={(e) => updateCustomCampaign(idx, "start_month", e.target.value)}
                          >
                            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Límite</label>
                          <select
                            className="bg-gray-50 border-none rounded-lg p-3 text-xs font-bold outline-none"
                            value={req.end_month}
                            onChange={(e) => updateCustomCampaign(idx, "end_month", e.target.value)}
                          >
                            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomCampaign(idx)}
                          className="mt-4 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCustomCampaign}
                    className="w-full py-3 bg-white border-2 border-dashed border-gray-200 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Añadir Meta de Campaña
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 md:py-6 rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 text-sm tracking-[0.2em] uppercase active:scale-[0.98]"
        >
          {loading
            ? "Guardando..."
            : isEditing
              ? "Actualizar Paisaje"
              : "Crear Paisaje"}
          <Save size={20} className="text-brand" />
        </button>
      </form>
    </div>
  );
}
