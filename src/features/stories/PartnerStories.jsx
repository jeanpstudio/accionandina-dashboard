import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  User,
  Edit,
  XCircle,
  FileText,
  CheckSquare,
  Square,
  ClipboardList,
  ExternalLink,
  Layout,
  Star,
  Check,
  Film,
  Instagram,
  AlignLeft,
} from "lucide-react";

// --- IMPORTAMOS TUS MÓDULOS ---
import RichEditor from "../../components/RichEditor";
import VideoModule from "../../components/modules/VideoModule";
import SocialModule from "../../components/modules/SocialModule";
import ArticleModule from "../../components/modules/ArticleModule";

// --- CONFIGURACIÓN ---
const STORY_FLAGS = [
  {
    id: "REVISED",
    label: "Revisado",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "PHOTO_OK",
    label: "Fotos OK",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    id: "DRAFTED",
    label: "Redactado",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    id: "APPROVED",
    label: "Aprobado",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];

const MONTHS_LIST = [
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

const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes("drive.google.com") && url.includes("/view"))
    return url.replace("/view", "/preview");
  return url;
};

export default function PartnerStories() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [partners, setPartners] = useState([]);
  const [generalTasks, setGeneralTasks] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [selectedSeason, setSelectedSeason] = useState("2025-2026");
  const [activeTab, setActiveTab] = useState("PLAN");
  const [selectedMonthTab, setSelectedMonthTab] = useState("Todos");

  const [storySubTabs, setStorySubTabs] = useState({});

  const [formData, setFormData] = useState({
    partner_id: "",
    month: "",
    title: "",
    content: "",
    media_link: "",
    rating: 0,
    is_favorite: false,
  });
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    fetchData();
  }, [selectedSeason]);

  async function fetchData() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setIsReadOnly(
          !(profile?.role === "admin" || profile?.edit_stories === true),
        );
      }
    } catch (e) {
      console.error(e);
    }

    const { data: partnersData } = await supabase
      .from("partners")
      .select("id, name, logo_url")
      .eq("is_active", true)
      .order("name");
    setPartners(partnersData || []);

    const { data: storiesData } = await supabase
      .from("partner_stories")
      .select("*, partners(name, logo_url)")
      .eq("season", selectedSeason)
      .order("created_at", { ascending: false });

    const processed = (storiesData || []).map((s) => ({
      ...s,
      video_data: s.video_data || {
        script: "",
        shots: [],
        reference_images: [],
      },
      social_data: s.social_data || { copy: "", hashtags: "", image_url: "" },
      article_data: s.article_data || { title: "", body: "", cover_url: "" },
    }));
    setStories(processed);

    const { data: tasksData } = await supabase
      .from("general_plan_tasks")
      .select("*")
      .eq("season", selectedSeason)
      .order("created_at", { ascending: true });
    setGeneralTasks(tasksData || []);
    setLoading(false);
  }

  const handleUpdateModule = async (storyId, field, newData) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, [field]: newData } : s)),
    );
    if (!isReadOnly)
      await supabase
        .from("partner_stories")
        .update({ [field]: newData })
        .eq("id", storyId);
  };

  const toggleFlag = async (story, flagId) => {
    if (isReadOnly) return;
    const currentFlags = story.status_flags || [];
    const newFlags = currentFlags.includes(flagId)
      ? currentFlags.filter((f) => f !== flagId)
      : [...currentFlags, flagId];
    setStories(
      stories.map((s) =>
        s.id === story.id ? { ...s, status_flags: newFlags } : s,
      ),
    );
    await supabase
      .from("partner_stories")
      .update({ status_flags: newFlags })
      .eq("id", story.id);
  };
  const toggleWorkPlan = async (story) => {
    if (isReadOnly) return;
    const newValue = !story.in_work_plan;
    setStories(
      stories.map((s) =>
        s.id === story.id ? { ...s, in_work_plan: newValue } : s,
      ),
    );
    await supabase
      .from("partner_stories")
      .update({ in_work_plan: newValue })
      .eq("id", story.id);
  };
  const toggleFavorite = async (story) => {
    if (isReadOnly) return;
    const newValue = !story.is_favorite;
    setStories(
      stories.map((s) =>
        s.id === story.id ? { ...s, is_favorite: newValue } : s,
      ),
    );
    await supabase
      .from("partner_stories")
      .update({ is_favorite: newValue })
      .eq("id", story.id);
  };
  const updateRating = async (story, newRating) => {
    if (isReadOnly) return;
    setStories(
      stories.map((s) => (s.id === story.id ? { ...s, rating: newRating } : s)),
    );
    await supabase
      .from("partner_stories")
      .update({ rating: newRating })
      .eq("id", story.id);
  };
  const updateUsageDetails = (id, text) =>
    setStories(
      stories.map((s) => (s.id === id ? { ...s, usage_details: text } : s)),
    );
  const saveUsageDetails = async (id, text) => {
    if (!isReadOnly)
      await supabase
        .from("partner_stories")
        .update({ usage_details: text })
        .eq("id", id);
  };

  const addGeneralTask = async () => {
    if (!newTaskText.trim() || isReadOnly) return;
    const { data } = await supabase
      .from("general_plan_tasks")
      .insert([{ task_text: newTaskText, season: selectedSeason }])
      .select();
    if (data) {
      setGeneralTasks([...generalTasks, data[0]]);
      setNewTaskText("");
    }
  };
  const toggleGeneralTask = async (task) => {
    if (isReadOnly) return;
    setGeneralTasks(
      generalTasks.map((t) =>
        t.id === task.id ? { ...t, is_completed: !task.is_completed } : t,
      ),
    );
    await supabase
      .from("general_plan_tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);
  };
  const deleteGeneralTask = async (id) => {
    if (isReadOnly) return;
    setGeneralTasks(generalTasks.filter((t) => t.id !== id));
    await supabase.from("general_plan_tasks").delete().eq("id", id);
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!formData.partner_id || !formData.title || !formData.month)
      return alert("Faltan datos básicos.");
    const payload = {
      season: selectedSeason,
      partner_id: formData.partner_id,
      month: formData.month,
      title: formData.title,
      content: formData.content,
      media_link: formData.media_link,
    };
    if (editingId)
      await supabase
        .from("partner_stories")
        .update(payload)
        .eq("id", editingId);
    else await supabase.from("partner_stories").insert([payload]);
    setEditingId(null);
    setFormData({
      partner_id: "",
      month: "",
      title: "",
      content: "",
      media_link: "",
      rating: 0,
      is_favorite: false,
    });
    fetchData();
  };
  const handleDelete = async (id) => {
    if (confirm("¿Borrar?")) {
      await supabase.from("partner_stories").delete().eq("id", id);
      fetchData();
    }
  };
  const handleEdit = (story) => {
    setEditingId(story.id);
    setFormData({
      partner_id: story.partner_id,
      month: story.month,
      title: story.title,
      content: story.content || "",
      media_link: story.media_link || "",
      rating: story.rating || 0,
      is_favorite: story.is_favorite || false,
    });
    window.scrollTo(0, 0);
  };

  const exportToDoc = async () => {
    const exportStories = displayedStories;
    if (exportStories.length === 0)
      return alert("No hay historias en esta vista.");

    let checklistHtml = "";
    if (activeTab === "PLAN")
      checklistHtml = `<h3>Tareas Generales</h3><ul>${generalTasks.map((t) => `<li>[${t.is_completed ? "X" : " "}] ${t.task_text}</li>`).join("")}</ul><hr/>`;

    let htmlContent = `<html><head><meta charset='utf-8'></head><body>
      <h1 style="color:#166534">${activeTab === "PLAN" ? "PLAN DE TRABAJO" : "BANCO DE HISTORIAS"}</h1>
      ${checklistHtml}
    `;

    exportStories.forEach((story) => {
      let planContent = "";
      if (activeTab === "PLAN") {
        if (story.video_data?.script)
          planContent += `<div style="background:#eff6ff; padding:10px;"><h4>📺 Video</h4><p>${story.video_data.script}</p></div>`;
        if (story.social_data?.copy)
          planContent += `<div style="background:#fdf2f8; padding:10px;"><h4>📱 Redes</h4><p>${story.social_data.copy}</p></div>`;
        if (story.article_data?.body)
          planContent += `<div style="background:#f0fdf4; padding:10px;"><h4>📰 Artículo: ${story.article_data.title}</h4>${story.article_data.body}</div>`;
      }
      htmlContent += `<div style="border:1px solid #ddd; padding:20px; margin-bottom:20px;"><h2>${story.title}</h2><p>${story.content}</p>${planContent}</div><br/>`;
    });
    htmlContent += "</body></html>";

    try {
      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob(["Contenido copiado."], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText }),
      ]);
      window.open("https://docs.new", "_blank");
      alert("✅ Copiado. Pega en Docs.");
    } catch (err) {
      alert("Error al copiar.");
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-brand font-bold animate-pulse">
        Cargando...
      </div>
    );

  let filteredStories =
    activeTab === "PLAN" ? stories.filter((s) => s.in_work_plan) : stories;
  if (selectedMonthTab !== "Todos")
    filteredStories = filteredStories.filter(
      (s) => s.month === selectedMonthTab,
    );
  const displayedStories = filteredStories;

  return (
    <div className="max-w-7xl mx-auto p-8 bg-gray-50/30 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <BookOpen className="text-brand" size={32} /> Gestión de Historias
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic">
            Temporada {selectedSeason}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={exportToDoc}
            className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
          >
            <FileText size={16} /> Exportar
          </button>
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab("PLAN")}
              className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "PLAN" ? "bg-brand text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
            >
              <ClipboardList size={16} /> Plan de Trabajo
            </button>
            <button
              onClick={() => setActiveTab("BANK")}
              className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "BANK" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
            >
              <Layout size={16} /> Banco General
            </button>
          </div>
        </div>
      </div>

      {/* TAREAS GENERALES */}
      {activeTab === "PLAN" && (
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-4 text-gray-900">
            <CheckCircle2 size={18} className="text-brand" /> Tareas Generales
          </h3>
          <div className="space-y-2 mb-4">
            {generalTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl group"
              >
                <button
                  onClick={() => toggleGeneralTask(task)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.is_completed ? "bg-brand border-brand text-white" : "bg-white border-gray-300"}`}
                >
                  <Check size={12} strokeWidth={4} />
                </button>
                <span
                  className={`text-sm font-medium flex-1 ${task.is_completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                >
                  {task.task_text}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => deleteGeneralTask(task.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+ Agregar tarea general..."
                className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGeneralTask()}
              />
              <button
                onClick={addGeneralTask}
                className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MESES */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 custom-scrollbar">
        <button
          onClick={() => setSelectedMonthTab("Todos")}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border ${selectedMonthTab === "Todos" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
        >
          Todas ({displayedStories.length})
        </button>
        {MONTHS_LIST.map((m) => {
          const count =
            activeTab === "PLAN"
              ? stories.filter((s) => s.in_work_plan && s.month === m).length
              : stories.filter((s) => s.month === m).length;
          if (count === 0 && selectedMonthTab !== m) return null;
          return (
            <button
              key={m}
              onClick={() => setSelectedMonthTab(m)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border ${selectedMonthTab === m ? "bg-brand text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              {m} ({count})
            </button>
          );
        })}
      </div>

      {/* FORMULARIO */}
      {!isReadOnly && (activeTab === "BANK" || editingId) && (
        <div
          className={`bg-white p-6 rounded-[32px] border shadow-sm mb-10 ${editingId ? "border-brand ring-4 ring-brand/5" : "border-gray-100"}`}
        >
          <div className="flex justify-between mb-4">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              {editingId ? "Editando Historia" : "Nueva Historia"}
            </h3>
            {editingId && (
              <button onClick={() => setEditingId(null)}>
                <XCircle className="text-red-500" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <select
                className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                value={formData.partner_id}
                onChange={(e) =>
                  setFormData({ ...formData, partner_id: e.target.value })
                }
              >
                <option value="">-- Socio --</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 md:col-span-3">
              <select
                className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                value={formData.month}
                onChange={(e) =>
                  setFormData({ ...formData, month: e.target.value })
                }
              >
                <option value="">-- Mes --</option>
                {MONTHS_LIST.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 md:col-span-6">
              <input
                type="text"
                placeholder="Título..."
                className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="col-span-12">
              <RichEditor
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
                placeholder="Escribe la historia..."
              />
            </div>
            <div className="col-span-12 md:col-span-10">
              <input
                type="text"
                placeholder="Link Fotos (Drive)..."
                className="w-full bg-gray-50 p-3 rounded-xl text-xs outline-none border focus:border-brand"
                value={formData.media_link}
                onChange={(e) =>
                  setFormData({ ...formData, media_link: e.target.value })
                }
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <button
                onClick={handleSubmit}
                className="w-full bg-gray-900 text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-black transition-colors"
              >
                {editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LISTA DE HISTORIAS --- */}
      <div className="grid grid-cols-1 gap-8">
        {displayedStories.map((story) => (
          <div
            key={story.id}
            className={`bg-white rounded-[32px] border p-6 shadow-sm transition-all hover:shadow-lg ${story.in_work_plan && activeTab === "BANK" ? "border-brand/30 bg-brand/5" : "border-gray-100"}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 p-1 flex items-center justify-center relative">
                  {story.partners?.logo_url ? (
                    <img
                      src={story.partners.logo_url}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <User size={20} className="text-gray-300" />
                  )}
                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(story);
                      }}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-100 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={14}
                        className={
                          story.is_favorite
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {story.partners?.name} • {story.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {story.title}
                    </h3>
                    <div className="flex items-center ml-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          disabled={isReadOnly}
                          onClick={() => updateRating(story, star)}
                        >
                          <Star
                            size={12}
                            className={`transition-colors ${star <= (story.rating || 0) ? "fill-orange-400 text-orange-400" : "text-gray-200"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => toggleWorkPlan(story)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${story.in_work_plan ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-brand text-white hover:brightness-110 shadow-lg"}`}
                >
                  {story.in_work_plan ? (
                    <>
                      <XCircle size={14} /> Quitar
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Agregar al Plan
                    </>
                  )}
                </button>
              )}
            </div>

            {activeTab === "PLAN" ? (
              <div className="flex flex-col gap-6">
                {/* 1. CHECKLIST */}
                <div className="flex flex-wrap gap-2">
                  {STORY_FLAGS.map((flag) => {
                    const isActive = story.status_flags?.includes(flag.id);
                    return (
                      <button
                        key={flag.id}
                        onClick={() => toggleFlag(story, flag.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isActive ? flag.color : "bg-white text-gray-400 border-gray-200"}`}
                      >
                        {isActive ? (
                          <CheckSquare size={14} />
                        ) : (
                          <Square size={14} />
                        )}{" "}
                        {flag.label}
                      </button>
                    );
                  })}
                </div>

                {/* 2. HISTORIA ORIGINAL (¡ESTO FALTABA!) */}
                <div className="bg-white p-5 rounded-2xl border-l-4 border-gray-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={12} /> Historia Original (Referencia)
                  </h4>
                  <div
                    className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: story.content }}
                  />
                </div>

                {/* 3. MÓDULOS (Video, Redes, etc) */}
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                  <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
                    {[
                      { id: "VIDEO", icon: Film, label: "Video/Guion" },
                      { id: "SOCIAL", icon: Instagram, label: "Copy Redes" },
                      { id: "ARTICLE", icon: AlignLeft, label: "Artículo" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() =>
                          setStorySubTabs({
                            ...storySubTabs,
                            [story.id]: tab.id,
                          })
                        }
                        className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase transition-colors relative ${storySubTabs[story.id] === tab.id ? "text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        <tab.icon size={16} /> {tab.label}
                        {storySubTabs[story.id] === tab.id && (
                          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-full"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  {storySubTabs[story.id] === "VIDEO" && (
                    <VideoModule
                      data={story.video_data}
                      onUpdate={(d) =>
                        handleUpdateModule(story.id, "video_data", d)
                      }
                      storyTitle={story.title}
                      partnerId={story.partner_id}
                    />
                  )}
                  {storySubTabs[story.id] === "SOCIAL" && (
                    <SocialModule
                      data={story.social_data}
                      onUpdate={(d) =>
                        handleUpdateModule(story.id, "social_data", d)
                      }
                    />
                  )}
                  {storySubTabs[story.id] === "ARTICLE" && (
                    <ArticleModule
                      data={story.article_data}
                      onUpdate={(d) =>
                        handleUpdateModule(story.id, "article_data", d)
                      }
                      // AGREGAR ESTE PROP:
                      storyTitle={story.title}
                    />
                  )}

                  {!storySubTabs[story.id] && (
                    <div className="text-center py-8 text-gray-400 text-xs italic">
                      Selecciona una herramienta para crear contenido.
                    </div>
                  )}
                </div>

                {/* 4. USO FINAL */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">
                    Uso Final:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none focus:border-brand"
                    placeholder="Ej: Publicado el 12/05..."
                    value={story.usage_details || ""}
                    onChange={(e) =>
                      updateUsageDetails(story.id, e.target.value)
                    }
                    onBlur={(e) => saveUsageDetails(story.id, e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-gray-700 leading-relaxed pl-4 border-l-4 border-gray-100 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: story.content }}
              />
            )}

            <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-50">
              <div className="flex gap-2">
                {story.media_link && (
                  <a
                    href={story.media_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 w-fit"
                  >
                    <ExternalLink size={12} /> Drive
                  </a>
                )}
                {story.media_link?.includes("drive.google.com") &&
                  activeTab === "PLAN" && (
                    <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 mt-2 max-w-md hidden md:block">
                      <iframe
                        src={getEmbedUrl(story.media_link)}
                        className="w-full h-full"
                        frameBorder="0"
                      ></iframe>
                    </div>
                  )}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(story)}
                    className="p-2 text-gray-400 hover:text-brand bg-gray-50 hover:bg-brand/10 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
