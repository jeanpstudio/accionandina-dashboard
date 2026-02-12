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
} from "lucide-react";

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
    start_date: "", // <--- CORREGIDO: Ahora coincide con tu Base de Datos
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
            start_date: data.start_date || "", // <--- LEEMOS LA COLUMNA CORRECTA
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

    try {
      let error;

      if (isEditing) {
        // ACTUALIZAR (UPDATE)
        const { error: updateError } = await supabase
          .from("projects")
          .update(formData) // formData ya tiene la clave 'start_date'
          .eq("id", projectId);
        error = updateError;
      } else {
        // CREAR (INSERT)
        const { error: insertError } = await supabase
          .from("projects")
          .insert([formData]);
        error = insertError;
      }

      if (error) throw error;

      alert(
        isEditing
          ? "✅ Paisaje actualizado con éxito"
          : "✅ Paisaje creado con éxito"
      );
      navigate("/supervision");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <div className="p-20 text-center animate-pulse font-black text-brand uppercase tracking-widest">
        Cargando datos...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50/20 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand mb-4 font-bold text-[10px] uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">
            {isEditing ? "Editar Paisaje" : "Nuevo Paisaje"}
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic">
            Socio: {partnerName || "Cargando..."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* DATOS GENERALES */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, landscape: e.target.value })
                  }
                  required
                />
                <MapPin
                  size={16}
                  className="absolute right-4 top-4 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* METAS DE CUMPLIMIENTO Y FECHAS */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
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
            {/* --- CAMPO CORREGIDO: Start Date --- */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand uppercase tracking-widest pl-1">
                Fecha Inicio Temporada
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="start_date" // Nombre coincide con BD
                  className="w-full bg-brand/5 border-none rounded-xl p-4 font-bold text-brand text-sm outline-none focus:ring-2 focus:ring-brand/20 uppercase cursor-pointer"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
                <CalendarDays
                  size={16}
                  className="absolute right-4 top-4 text-brand/40 pointer-events-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meses Temporada
              </label>
              <input
                type="number"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.season_duration_months}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    season_duration_months: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meta Fotos / Mes
              </label>
              <input
                type="number"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.monthly_photos_target}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_photos_target: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Meta Posts / Mes
              </label>
              <input
                type="number"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                value={formData.monthly_posts_target}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_posts_target: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-black text-white font-black py-6 rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 text-sm tracking-[0.2em] uppercase active:scale-[0.98]"
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
