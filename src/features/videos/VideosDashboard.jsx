import { useState, useEffect, useRef } from "react";
import { supabase } from "../../app/supabase";
import {
  Plus,
  Calendar,
  Save,
  X,
  Clapperboard,
  Film,
  Image as ImageIcon,
  FileText,
  Youtube,
  User,
  Users,
  Briefcase,
  Trash2,
  PlayCircle,
  Target,
  Truck,
  MousePointer2,
  Copy,
  Check,
  DollarSign,
  Pencil,
  Lock,
  CloudUpload,
  Loader2,
  FileDown,
} from "lucide-react";

// --- COMPONENTE INTERNO: UPLOAD UNIFICADO ---
const MediaUploader = ({
  onUpload,
  placeholder = "URL o Subir...",
  initialValue = "",
  disabled = false,
}) => {
  const [url, setUrl] = useState(initialValue);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUrl(initialValue);
  }, [initialValue]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fileName = `vid_asset_${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);
      setUrl(data.publicUrl);
      onUpload(data.publicUrl); // Callback al padre
    } catch (err) {
      alert("Error subiendo archivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    onUpload(val);
  };

  return (
    <div className="flex gap-2 w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFile}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded-xl transition-colors border border-gray-200 flex items-center justify-center min-w-[40px]"
        title="Subir imagen"
      >
        {isUploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CloudUpload size={16} />
        )}
      </button>
      <input
        type="text"
        disabled={disabled}
        className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-medium outline-none border border-transparent focus:bg-white focus:border-brand/20 transition-all"
        placeholder={placeholder}
        value={url}
        onChange={handleUrlChange}
      />
    </div>
  );
};

export default function VideosDashboard() {
  // --- ESTADOS ---
  const [videos, setVideos] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(true);

  // UI
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [activeTab, setActiveTab] = useState("strategy");
  const [filterType, setFilterType] = useState("ALL");
  const [isEditing, setIsEditing] = useState(true);

  // Formulario
  const [formData, setFormData] = useState(initialFormState());

  // Inputs Temporales (Storyboard)
  const [tempShotUrl, setTempShotUrl] = useState("");
  const [tempShotCaption, setTempShotCaption] = useState("");

  function initialFormState() {
    return {
      title: "",
      production_type: "IN_HOUSE",
      status: "IDEA",
      production_date: "",
      publish_date: "",
      assignee: "",
      budget: "",
      partner_ids: [],
      concept: "",
      objective: "",
      social_copy: "",
      script_content: "",
      storyboard: [],
      logistics: [],
      final_url: "",
      cover_image: "",
    };
  }

  useEffect(() => {
    fetchDataAndPermissions();
  }, []);

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
        if (profile?.role === "admin" || profile?.edit_videos === true)
          canEdit = true;
      }
      setIsReadOnly(!canEdit);
    } catch (e) {
      console.error(e);
    }

    const { data: vids } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: parts } = await supabase
      .from("partners")
      .select("id, name, logo_url")
      .order("name", { ascending: true });
    setVideos(vids || []);
    setPartners(parts || []);
    setLoading(false);
  }

  const getDisplayImage = (video) => {
    if (video.final_url) {
      const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = video.final_url.match(regExp);
      if (match && match[2].length === 11)
        return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`;
    }
    return video.cover_image || null;
  };

  // --- ACTIONS ---
  const handleSelectVideo = (video) => {
    if (selectedVideoId === video.id) {
      handleClosePanel();
      return;
    }
    setSelectedVideoId(video.id);
    setFormData({
      ...video,
      partner_ids: video.partner_ids || [],
      storyboard: Array.isArray(video.storyboard) ? video.storyboard : [],
      logistics: Array.isArray(video.logistics) ? video.logistics : [],
    });
    setIsEditing(false);
    setActiveTab("strategy");
  };

  const handleCreateNew = () => {
    if (isReadOnly) return;
    setSelectedVideoId("NEW");
    setFormData(initialFormState());
    setIsEditing(true);
    setActiveTab("strategy");
  };

  const handleClosePanel = () => {
    setSelectedVideoId(null);
    setFormData(initialFormState());
  };
  const liveUpdate = (field, newData) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: newData }));
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!formData.title) return alert("El título es obligatorio");
    const payload = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : 0,
    };
    if (selectedVideoId === "NEW")
      await supabase.from("videos").insert([payload]);
    else
      await supabase.from("videos").update(payload).eq("id", selectedVideoId);
    fetchDataAndPermissions();
    if (selectedVideoId === "NEW") handleClosePanel();
    else setIsEditing(false);
  };

  const handleDelete = async () => {
    if (isReadOnly || !confirm("¿Eliminar proyecto?")) return;
    await supabase.from("videos").delete().eq("id", selectedVideoId);
    handleClosePanel();
    fetchDataAndPermissions();
  };

  // --- EXPORTAR A DOCS ---
  const handleExport = async () => {
    if (!formData.title) return;

    // Construir HTML Bonito
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px;">🎬 Proyecto: ${formData.title}</h1>
        <p><b>Estado:</b> ${formData.status} | <b>Tipo:</b> ${formData.production_type}</p>
        
        <h2 style="background: #f0fdf4; padding: 10px; border-left: 5px solid #166534; margin-top: 20px;">🎯 Estrategia</h2>
        <p><b>Concepto:</b> ${formData.concept || "N/A"}</p>
        <p><b>Objetivo:</b> ${formData.objective || "N/A"}</p>
        
        <h2 style="background: #fff7ed; padding: 10px; border-left: 5px solid #ea580c; margin-top: 20px;">📝 Guion & Copy</h2>
        <h3>Guion Técnico</h3>
        <div style="white-space: pre-wrap; font-family: monospace; background: #fafafa; padding: 15px; border: 1px solid #ddd;">${formData.script_content || "Sin guion"}</div>
        <h3>Copy Redes</h3>
        <p style="font-style: italic;">${formData.social_copy || "Sin copy"}</p>

        <h2 style="background: #eff6ff; padding: 10px; border-left: 5px solid #2563eb; margin-top: 20px;">📅 Logística</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #e5e7eb;">
            <th style="padding: 8px; border: 1px solid #ddd;">Fecha</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Actividad</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Quiénes</th>
          </tr>
          ${formData.logistics
            .map(
              (l) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${l.date}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${l.activity}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${l.participants}</td>
            </tr>
          `,
            )
            .join("")}
        </table>

        <h2 style="background: #fdf2f8; padding: 10px; border-left: 5px solid #db2777; margin-top: 20px;">📸 Storyboard & Visuals</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${formData.storyboard
            .map(
              (s, i) => `
            <div style="width: 200px; border: 1px solid #ddd; padding: 5px;">
              ${s.url ? `<img src="${s.url}" style="width: 100%; height: 120px; object-fit: cover;" />` : '<div style="height:120px; background:#eee;">Sin img</div>'}
              <p style="font-size: 10px; font-weight: bold;">Toma ${i + 1}</p>
              <p style="font-size: 12px;">${s.caption}</p>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    try {
      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob(["Contenido copiado. Pega en Docs."], {
        type: "text/plain",
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText }),
      ]);

      // Abrir docs.new en pestaña nueva
      window.open("https://docs.new", "_blank");

      alert("✅ ¡Proyecto copiado! Presiona Ctrl+V en el documento nuevo.");
    } catch (err) {
      alert("Error al copiar. Tu navegador no lo permite.");
    }
  };

  // --- LOGIC HELPERS ---
  const handleAddPartner = (e) => {
    if (isReadOnly) return;
    const id = e.target.value;
    if (!id) return;
    if (!formData.partner_ids?.includes(id))
      liveUpdate("partner_ids", [...(formData.partner_ids || []), id]);
    e.target.value = "";
  };
  const handleRemovePartner = (id) =>
    liveUpdate(
      "partner_ids",
      formData.partner_ids.filter((pid) => pid !== id),
    );

  const addLogisticsRow = () =>
    setFormData({
      ...formData,
      logistics: [
        ...formData.logistics,
        {
          id: Date.now(),
          date: "",
          activity: "",
          participants: "",
          status: "Pendiente",
        },
      ],
    });
  const updateLogisticsRow = (id, field, value) =>
    setFormData({
      ...formData,
      logistics: formData.logistics.map((r) =>
        r.id === id ? { ...r, [field]: value } : r,
      ),
    });
  const removeLogisticsRow = (id) =>
    setFormData({
      ...formData,
      logistics: formData.logistics.filter((r) => r.id !== id),
    });

  const addShot = () => {
    if (!tempShotUrl) return;
    setFormData({
      ...formData,
      storyboard: [
        ...formData.storyboard,
        { id: Date.now(), url: tempShotUrl, caption: tempShotCaption },
      ],
    });
    setTempShotUrl("");
    setTempShotCaption("");
  };
  const removeShot = (id) =>
    setFormData({
      ...formData,
      storyboard: formData.storyboard.filter((s) => s.id !== id),
    });

  const getTypeBadge = (type) => {
    switch (type) {
      case "IN_HOUSE":
        return { label: "In-House", icon: User };
      case "AGENCY":
        return { label: "Agencia", icon: Briefcase };
      case "PARTNER":
        return { label: "Socio", icon: Users };
      default:
        return { label: "General", icon: Film };
    }
  };
  const getStatusColor = (s) =>
    ({
      IDEA: "bg-gray-100 text-gray-500",
      SCRIPT: "bg-yellow-100 text-yellow-700",
      PROD: "bg-blue-100 text-blue-700",
      EDITING: "bg-purple-100 text-purple-700",
      PUBLISHED: "bg-emerald-100 text-emerald-700",
    })[s] || "bg-gray-100";

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xs font-black uppercase text-brand">
        Cargando Estudio...
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* 1. SLIDER SUPERIOR */}
      <div className="h-[40vh] min-h-[350px] border-b border-gray-200 bg-gray-50/30 flex flex-col shrink-0">
        <div className="px-8 py-6 flex justify-between items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase flex items-center gap-3">
              <Clapperboard className="text-brand" size={32} /> Video Lab
            </h1>
            <p className="text-brand font-bold text-lg mt-1 italic flex items-center gap-2">
              Producción Audiovisual{" "}
              {isReadOnly && (
                <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                  <Lock size={10} /> READ ONLY
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 p-1 rounded-2xl shadow-sm">
              {["ALL", "IN_HOUSE", "AGENCY", "PARTNER"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filterType === f ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {f === "ALL" ? "Todos" : f}
                </button>
              ))}
            </div>
            {!isReadOnly && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black shadow-lg text-xs uppercase tracking-[0.2em]"
              >
                <Plus size={16} /> Nuevo
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-8 py-6 custom-scrollbar">
          <div className="flex gap-6 h-full items-center">
            {videos
              .filter(
                (v) => filterType === "ALL" || v.production_type === filterType,
              )
              .map((video) => {
                const isActive = selectedVideoId === video.id;
                const displayImage = getDisplayImage(video);
                const TypeIcon = getTypeBadge(video.production_type).icon;
                const assignedPartners = partners.filter((p) =>
                  video.partner_ids?.includes(p.id),
                );

                return (
                  <div
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    className={`min-w-[380px] h-[140px] group bg-white rounded-[24px] border cursor-pointer transition-all flex flex-row relative shadow-sm hover:shadow-xl ${isActive ? "border-brand ring-4 ring-brand/5 scale-[1.02]" : "border-gray-100 hover:border-brand/30"}`}
                  >
                    <div className="w-[120px] h-full bg-gray-900 relative overflow-hidden shrink-0 border-r border-gray-50">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Film size={24} opacity={0.3} />
                        </div>
                      )}
                      {video.final_url && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <PlayCircle
                            size={20}
                            className="text-white drop-shadow-md"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusColor(video.status)}`}
                          >
                            {video.status}
                          </span>
                          {video.budget > 0 && (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              ${video.budget}
                            </span>
                          )}
                        </div>
                        <h3
                          className={`text-sm font-black uppercase leading-tight mb-2 line-clamp-2 ${isActive ? "text-brand" : "text-gray-900"}`}
                        >
                          {video.title}
                        </h3>
                        <div className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 truncate">
                          <TypeIcon size={12} />{" "}
                          {video.production_type === "PARTNER" &&
                          assignedPartners.length > 0
                            ? assignedPartners.map((p) => p.name).join(", ")
                            : video.production_type}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-50 flex justify-between text-gray-400">
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase">
                          <Calendar size={10} /> {video.production_date || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            {videos.length === 0 && (
              <div className="w-full text-center py-20 text-gray-300 font-black uppercase text-xs">
                No hay proyectos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. GESTIÓN INFERIOR */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col relative z-10 shadow-t border-t border-gray-100">
        {!selectedVideoId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
            <MousePointer2 size={48} className="mb-4 text-gray-200" />
            <p className="font-black text-xs uppercase tracking-[0.2em]">
              Selecciona un video
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-6 duration-500">
            {/* Toolbar */}
            <div className="px-8 py-3 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-20">
              <div className="flex items-center gap-6">
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {[
                    { id: "strategy", label: "Estrategia", icon: Target },
                    { id: "logistics", label: "Logística", icon: Truck },
                    { id: "script", label: "Guion & Copy", icon: FileText },
                    { id: "visuals", label: "Visuals", icon: ImageIcon },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:bg-gray-200"}`}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>
                <div className="h-6 w-px bg-gray-100"></div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-tighter truncate max-w-md">
                  {selectedVideoId === "NEW"
                    ? "Nuevo Proyecto"
                    : formData.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* BOTÓN EXPORTAR (NUEVO) */}
                <button
                  onClick={handleExport}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider border border-transparent hover:border-blue-100 mr-2"
                >
                  <FileDown size={16} /> Exportar
                </button>

                {!isReadOnly && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${isEditing ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                  >
                    {isEditing ? (
                      <>
                        <Check size={14} /> Editando
                      </>
                    ) : (
                      <>
                        <Pencil size={14} /> Editar
                      </>
                    )}
                  </button>
                )}
                <div className="h-6 w-px bg-gray-100 mx-2"></div>
                {formData.final_url && (
                  <a
                    href={formData.final_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100"
                  >
                    <Youtube size={14} /> Ver
                  </a>
                )}
                {selectedVideoId !== "NEW" && isEditing && !isReadOnly && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={handleClosePanel}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-8 custom-scrollbar">
              <div className="max-w-5xl mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 min-h-[500px] p-8">
                {/* TAB 1: ESTRATEGIA */}
                {activeTab === "strategy" && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 md:col-span-8 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Título
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full bg-gray-50 p-4 rounded-2xl font-black text-lg outline-none focus:bg-white focus:border-brand border-2 border-transparent transition-all"
                              value={formData.title}
                              onChange={(e) =>
                                liveUpdate("title", e.target.value)
                              }
                            />
                          ) : (
                            <h2 className="text-2xl font-black text-gray-900 p-2">
                              {formData.title}
                            </h2>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                              Concepto
                            </label>
                            {isEditing ? (
                              <textarea
                                rows="3"
                                className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-medium outline-none resize-none focus:bg-white"
                                value={formData.concept}
                                onChange={(e) =>
                                  liveUpdate("concept", e.target.value)
                                }
                              ></textarea>
                            ) : (
                              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-2xl">
                                {formData.concept || "N/A"}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                              Objetivo
                            </label>
                            {isEditing ? (
                              <textarea
                                rows="3"
                                className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-medium outline-none resize-none focus:bg-white"
                                value={formData.objective}
                                onChange={(e) =>
                                  liveUpdate("objective", e.target.value)
                                }
                              ></textarea>
                            ) : (
                              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-2xl">
                                {formData.objective || "N/A"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex gap-4 mb-4">
                          {[
                            { id: "IN_HOUSE", label: "Propio", icon: User },
                            {
                              id: "AGENCY",
                              label: "Contratado",
                              icon: Briefcase,
                            },
                            { id: "PARTNER", label: "Socio", icon: Users },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() =>
                                isEditing &&
                                liveUpdate("production_type", opt.id)
                              }
                              disabled={!isEditing}
                              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border-2 transition-all ${formData.production_type === opt.id ? "border-brand text-brand bg-white shadow-sm" : "border-transparent text-gray-400"}`}
                            >
                              <opt.icon size={14} /> {opt.label}
                            </button>
                          ))}
                        </div>
                        {formData.production_type === "PARTNER" && (
                          <div className="animate-in fade-in">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                              Socios
                            </label>
                            {isEditing && (
                              <div className="relative mb-3">
                                <select
                                  onChange={handleAddPartner}
                                  className="w-full bg-white p-3 rounded-xl text-sm font-bold outline-none border border-gray-200"
                                >
                                  <option value="">+ Añadir Socio...</option>
                                  {partners
                                    .filter(
                                      (p) =>
                                        !formData.partner_ids?.includes(p.id),
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {partners
                                .filter((p) =>
                                  formData.partner_ids?.includes(p.id),
                                )
                                .map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-2 bg-white border border-brand px-3 py-1.5 rounded-xl shadow-sm"
                                  >
                                    <img
                                      src={p.logo_url}
                                      className="w-5 h-5 rounded-full object-cover"
                                    />
                                    <span className="text-[10px] font-bold text-brand uppercase">
                                      {p.name}
                                    </span>
                                    {isEditing && (
                                      <button
                                        onClick={() =>
                                          handleRemovePartner(p.id)
                                        }
                                        className="text-gray-300 hover:text-red-500 ml-1"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        {formData.production_type === "AGENCY" && (
                          <div className="animate-in fade-in">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                              Agencia
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full bg-white p-3 rounded-xl text-sm font-bold outline-none border border-gray-200"
                                value={formData.assignee || ""}
                                onChange={(e) =>
                                  liveUpdate("assignee", e.target.value)
                                }
                              />
                            ) : (
                              <p className="text-sm font-bold p-2">
                                {formData.assignee}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Estado
                          </label>
                          <select
                            disabled={!isEditing}
                            className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold uppercase outline-none"
                            value={formData.status}
                            onChange={(e) =>
                              liveUpdate("status", e.target.value)
                            }
                          >
                            <option value="IDEA">💡 Idea</option>
                            <option value="SCRIPT">📝 Guion</option>
                            <option value="PROD">🎥 Rodaje</option>
                            <option value="EDITING">🎬 Edición</option>
                            <option value="PUBLISHED">✅ Publicado</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Rodaje
                          </label>
                          <input
                            disabled={!isEditing}
                            type="date"
                            className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                            value={formData.production_date}
                            onChange={(e) =>
                              liveUpdate("production_date", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Publicación
                          </label>
                          <input
                            disabled={!isEditing}
                            type="date"
                            className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                            value={formData.publish_date}
                            onChange={(e) =>
                              liveUpdate("publish_date", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Presupuesto
                          </label>
                          <input
                            disabled={!isEditing}
                            type="number"
                            className="w-full bg-gray-50 p-3 rounded-xl text-sm font-black outline-none"
                            value={formData.budget}
                            onChange={(e) =>
                              liveUpdate("budget", e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={handleSave}
                          className="w-full bg-brand text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                          Guardar Cambios
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: LOGÍSTICA */}
                {activeTab === "logistics" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
                        <Truck size={18} /> Plan de Rodaje
                      </h3>
                      {isEditing && (
                        <button
                          onClick={addLogisticsRow}
                          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                          + Fila
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200">
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Actividad</th>
                            <th className="p-4">Participantes</th>
                            <th className="p-4">Estado</th>
                            {isEditing && <th className="p-4"></th>}
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {formData.logistics.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-gray-100 hover:bg-white"
                            >
                              <td className="p-2">
                                <input
                                  disabled={!isEditing}
                                  type="text"
                                  className="bg-transparent w-full p-2 font-bold outline-none"
                                  value={row.date}
                                  onChange={(e) =>
                                    updateLogisticsRow(
                                      row.id,
                                      "date",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  disabled={!isEditing}
                                  type="text"
                                  className="bg-transparent w-full p-2 font-medium outline-none"
                                  value={row.activity}
                                  onChange={(e) =>
                                    updateLogisticsRow(
                                      row.id,
                                      "activity",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  disabled={!isEditing}
                                  type="text"
                                  className="bg-transparent w-full p-2 font-medium outline-none"
                                  value={row.participants}
                                  onChange={(e) =>
                                    updateLogisticsRow(
                                      row.id,
                                      "participants",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  disabled={!isEditing}
                                  className="bg-transparent p-2 font-bold uppercase text-[9px] outline-none"
                                  value={row.status}
                                  onChange={(e) =>
                                    updateLogisticsRow(
                                      row.id,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="OK">OK</option>
                                </select>
                              </td>
                              {isEditing && (
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => removeLogisticsRow(row.id)}
                                    className="text-gray-300 hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {isEditing && (
                      <div className="flex justify-end">
                        <button
                          onClick={handleSave}
                          className="bg-brand text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg"
                        >
                          Guardar Plan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: GUION & COPY */}
                {activeTab === "script" && (
                  <div className="grid grid-cols-12 gap-8 h-full">
                    <div className="col-span-8 flex flex-col h-[500px]">
                      <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 mb-4">
                        <FileText size={16} /> Guion Técnico
                      </h3>
                      <textarea
                        disabled={!isEditing}
                        className="flex-1 w-full bg-yellow-50/30 border border-yellow-100 p-6 rounded-2xl text-sm font-mono text-gray-800 leading-relaxed outline-none focus:bg-white focus:border-yellow-300 transition-all resize-none custom-scrollbar"
                        placeholder="ESCENA 1..."
                        value={formData.script_content}
                        onChange={(e) =>
                          liveUpdate("script_content", e.target.value)
                        }
                      ></textarea>
                    </div>
                    <div className="col-span-4 flex flex-col h-[500px]">
                      <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2 mb-4">
                        <Copy size={16} /> Copy Redes
                      </h3>
                      <textarea
                        disabled={!isEditing}
                        className="flex-1 w-full bg-blue-50/30 border border-blue-100 p-6 rounded-2xl text-xs font-medium text-gray-700 leading-relaxed outline-none focus:bg-white focus:border-blue-300 transition-all resize-none custom-scrollbar"
                        placeholder="Copy..."
                        value={formData.social_copy}
                        onChange={(e) =>
                          liveUpdate("social_copy", e.target.value)
                        }
                      ></textarea>
                      {isEditing && (
                        <button
                          onClick={handleSave}
                          className="mt-4 w-full bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-black"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: VISUALS (CON UPLOAD UNIFICADO) */}
                {activeTab === "visuals" && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <ImageIcon size={14} /> Imagen Portada
                        </label>
                        {/* COMPONENTE DE UPLOAD REUTILIZABLE */}
                        <MediaUploader
                          onUpload={(url) => liveUpdate("cover_image", url)}
                          initialValue={formData.cover_image}
                          disabled={!isEditing}
                          placeholder="URL o Cargar Imagen..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Youtube size={14} /> Link Final
                        </label>
                        <input
                          disabled={!isEditing}
                          type="url"
                          className="w-full bg-gray-50 p-3 rounded-xl text-xs font-medium outline-none text-blue-600 font-bold"
                          value={formData.final_url}
                          onChange={(e) =>
                            liveUpdate("final_url", e.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <MediaUploader
                              onUpload={(url) => setTempShotUrl(url)}
                              initialValue={tempShotUrl}
                              placeholder="Subir Toma o Pegar URL..."
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Descripción..."
                            className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                            value={tempShotCaption}
                            onChange={(e) => setTempShotCaption(e.target.value)}
                          />
                          <button
                            onClick={addShot}
                            className="bg-gray-900 text-white px-6 rounded-xl hover:bg-black transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {formData.storyboard.map((shot, index) => (
                        <div
                          key={shot.id}
                          className="group relative aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-sm border border-gray-200"
                        >
                          {shot.url ? (
                            <img
                              src={shot.url}
                              className="w-full h-full object-cover"
                              alt="Shot"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <span className="text-white text-[10px] font-bold uppercase tracking-widest mb-1">
                              Toma {index + 1}
                            </span>
                            <p className="text-white text-xs font-medium leading-tight truncate">
                              {shot.caption}
                            </p>
                          </div>
                          {isEditing && (
                            <button
                              onClick={() => removeShot(shot.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={handleSave}
                          className="bg-brand text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg"
                        >
                          Guardar Visuals
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
