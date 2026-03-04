import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  Save,
  Image as ImageIcon,
  Globe,
  ArrowLeft,
  Calendar,
  X,
  Star,
  MessageSquare,
  CheckCircle2,
  Link as LinkIcon,
  Clock,
  Edit,
  Video, // Icono de video
} from "lucide-react";

export default function ReportForm() {
  const { projectId, reportId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const isEditing = Boolean(reportId);

  // Estados temporales
  const [currentLink, setCurrentLink] = useState("");
  const [tempCamp, setTempCamp] = useState({ title: "", comment: "" });
  const [tempVideo, setTempVideo] = useState({ topic: "", comment: "" });
  const [tempMilky, setTempMilky] = useState({ topic: "", comment: "" });

  const [noCamps, setNoCamps] = useState(false);
  const [noVideos, setNoVideos] = useState(false);
  const [noMilky, setNoMilky] = useState(false);

  const [formData, setFormData] = useState({
    project_id: projectId,
    report_month: "",
    report_year: new Date().getFullYear(),
    season_name: "",
    photo_count: 0,
    photo_comment: "",
    post_count: 0,
    post_comment: "",
    web_progress_percent: 0,
    web_url: "",
    web_comment: "",
    video_comment: "",
    campaign_comment: "",
    season_comment: "",
    social_links: [],
    campaigns: [],
    videos: [],
    milkywire_material: [],
    milkywire_comment: "",
    is_season_start: false,
    is_last_month: false,
  });

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const seasons = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];

  // Opciones para el desplegable de Videos
  const videoCuts = ["Corte 1 (Julio)", "Corte 2 (Octubre)", "Corte 3 (Marzo)"];

  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  };

  useEffect(() => {
    if (isEditing) fetchReportForEdit();
    else fetchInitialDataForNew();
  }, [projectId, reportId]);

  async function fetchInitialDataForNew() {
    setLoading(true);
    try {
      const { data: projData } = await supabase
        .from("projects")
        .select("*, partners(name)")
        .eq("id", projectId)
        .single();
      setProject(projData);

      const { data: reports } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        const last = reports[0];
        const lastMonthIndex = months.indexOf(last.report_month);

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
        });
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

  const addSocialLink = () => {
    if (currentLink.trim()) {
      setFormData((prev) => ({
        ...prev,
        social_links: [...prev.social_links, currentLink.trim()],
      }));
      setCurrentLink("");
    }
  };

  const addItem = (type, tempData, setTemp, field) => {
    if (tempData[field]?.trim()) {
      let newItem = { ...tempData };

      // CONFIGURACIÓN INICIAL SIMPLE PARA VIDEO
      if (type === "videos") {
        // Por defecto asignamos la fecha de hoy y el primer corte, luego el usuario lo cambia
        newItem.cut = "Corte 1 (Julio)";
        newItem.delivery_date = new Date().toISOString().split("T")[0];
      }

      setFormData((prev) => ({
        ...prev,
        [type]: [...ensureArray(prev[type]), newItem],
      }));

      if (type === "videos") setTemp({ topic: "", comment: "" });
      else if (type === "milkywire_material")
        setTemp({ topic: "", comment: "" });
      else setTemp({ title: "", comment: "" });
    }
  };

  // Función para editar campos específicos de un video ya agregado
  const updateVideoField = (index, field, value) => {
    const updatedVideos = [...ensureArray(formData.videos)];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    setFormData((prev) => ({ ...prev, videos: updatedVideos }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.season_name) return alert("Selecciona una Temporada.");

    setLoading(true);
    let error = null;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from("monthly_reports")
        .update(formData)
        .eq("id", reportId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("monthly_reports")
        .insert([formData]);
      error = insertError;
    }

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      navigate(`/supervision/historial/${projectId}`);
    }
  };

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
            {isEditing ? <Edit className="text-brand" size={32} /> : null}
            {isEditing ? "Editar Reporte" : "Nuevo Reporte"}
          </h1>
          <p className="text-brand font-bold text-sm md:text-lg mt-1 italic">
            {project?.partners?.name} / {project?.name}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="bg-brand hover:bg-brand-light text-white w-14 h-14 rounded-2xl transition-all shadow-xl shadow-brand/20 flex items-center justify-center group active:scale-90 border border-brand/10"
        >
          <Save size={24} className="text-white" />
        </button>
      </div>

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
                  onChange={(e) => setCurrentLink(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addSocialLink}
                  className="bg-brand text-white px-5 rounded-xl font-black"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(formData.social_links) &&
                  formData.social_links.map((l, i) => (
                    <div
                      key={i}
                      className="bg-brand/10 text-brand text-[9px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-black border border-brand/5 max-w-full"
                    >
                      <span className="truncate max-w-[150px]">{l}</span>
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
          {[
            {
              id: "campaigns",
              label: "Campañas",
              temp: tempCamp,
              setTemp: setTempCamp,
              field: "title",
              commentField: "campaign_comment",
              no: noCamps,
              setNo: setNoCamps,
            },
            {
              id: "videos",
              label: "Videos",
              temp: tempVideo,
              setTemp: setTempVideo,
              field: "topic",
              commentField: "video_comment",
              no: noVideos,
              setNo: setNoVideos,
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
            },
          ].map((sec) => (
            <div
              key={sec.id}
              className="space-y-4 pt-8 border-t border-gray-50 first:pt-0 first:border-0"
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {sec.label}{" "}
                  <span className="text-brand ml-1">
                    ({formData[sec.id]?.length || 0})
                  </span>
                </label>
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100/30">
                  <input
                    type="checkbox"
                    className="accent-red-500 scale-110"
                    checked={sec.no}
                    onChange={(e) => sec.setNo(e.target.checked)}
                  />
                  <span className="text-[10px] font-bold text-red-600 uppercase">
                    Sin Actividad
                  </span>
                </div>
              </div>

              {!sec.no ? (
                <div className="bg-gray-50 p-6 rounded-2xl space-y-3 shadow-inner">
                  <input
                    type="text"
                    placeholder={`Nombre del ${sec.label}...`}
                    className="w-full bg-white border-none rounded-xl p-4 text-sm font-bold shadow-sm"
                    value={sec.temp[sec.field]}
                    onChange={(e) =>
                      sec.setTemp((p) => ({
                        ...p,
                        [sec.field]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      addItem(sec.id, sec.temp, sec.setTemp, sec.field)
                    }
                    className="w-full py-3 bg-brand text-white text-[10px] font-black rounded-xl uppercase tracking-[0.1em] active:scale-95 transition-all shadow-md"
                  >
                    + Registrar
                  </button>
                </div>
              ) : (
                <textarea
                  placeholder="Motivo..."
                  className="w-full bg-red-50 border-2 border-red-100/20 rounded-2xl p-4 text-sm italic text-red-800 outline-none"
                  value={formData[sec.commentField]}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [sec.commentField]: e.target.value,
                    }))
                  }
                />
              )}

              <div className="space-y-3">
                {Array.isArray(formData[sec.id]) &&
                  formData[sec.id].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div className="flex justify-between items-center p-4 bg-gray-50/50">
                        <span className="text-xs font-black text-gray-800 uppercase">
                          {item[sec.field]}
                        </span>
                        <X
                          size={16}
                          className="cursor-pointer text-gray-400 hover:text-red-500"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              [sec.id]: p[sec.id].filter((_, idx) => idx !== i),
                            }))
                          }
                        />
                      </div>

                      {/* VISUALIZACIÓN SIMPLIFICADA PARA VIDEOS */}
                      {sec.id === "videos" && (
                        <div className="p-4 grid grid-cols-2 gap-4 bg-brand/5 border-t border-gray-100">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-brand uppercase block">
                              Tipo de Entrega
                            </label>
                            <select
                              value={item.cut || "Corte 1 (Julio)"}
                              onChange={(e) =>
                                updateVideoField(i, "cut", e.target.value)
                              }
                              className="w-full bg-white border border-brand/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-600 outline-none"
                            >
                              {videoCuts.map((cut) => (
                                <option key={cut} value={cut}>
                                  {cut}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-brand uppercase block">
                              Fecha Entrega
                            </label>
                            <div className="flex items-center gap-2 bg-white border border-brand/10 rounded-lg px-2 py-1.5">
                              <Clock size={12} className="text-brand/40" />
                              <input
                                type="date"
                                value={item.delivery_date || ""}
                                onChange={(e) =>
                                  updateVideoField(
                                    i,
                                    "delivery_date",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-transparent border-none text-[10px] font-bold text-gray-600 p-0 focus:ring-0 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* COLUMNA 3 */}
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
