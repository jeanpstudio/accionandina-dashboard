/**
 * PESTAÑA: CampaignWorkplan
 * -------------------------
 * El motor operativo de la campaña. Gestiona el ciclo de vida de cada entregable.
 * 
 * LÓGICA DE OPERACIONES:
 * 1. FASES: Agrupación lógica de tareas (ej. Pre-producción, Lanzamiento). Soporta reordenamiento por Drag & Drop.
 * 2. TIPOS DE TAREA: Contenido (Social Media), Gestión (Envío de material), Reuniones, Revisión.
 * 3. SHOTLIST: Lista de verificación táctica dentro de cada tarea de contenido.
 * 4. DELIVERY TRACKING: Control de subida y revisión de materiales por socio asignado.
 * 
 * INTEGRACIONES:
 * - Buckets de Supabase: Para la subida directa de referencias o artes.
 * - Previewers dinámicos: Soporta visualización de imágenes, videos y Google Docs in-app.
 */
import { useState, useRef } from "react";
import {
  Plus,
  CalendarDays,
  X,
  Star,
  Check,
  ImageIcon,
  Briefcase,
  Video,
  FileSearch,
  Trash2,
  Link as LinkIcon,
  Pencil,
  GripVertical,
  Shield,
  ExternalLink,
  Hash,
  Facebook,
  Instagram,
  Linkedin,
  CloudUpload,
  Loader2,
  Clock,
  AlertCircle,
  Camera,
  Youtube,
  Twitter,
  List,
  FileText,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../../../app/supabase";
import RichEditor from "../../../components/RichEditor";

// --- HELPER: PREVIEW ---
const getPreviewContent = (url) => {
  if (!url) return null;
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))
    return (
      <img
        src={url}
        className="w-full h-full object-contain bg-gray-50"
        alt="Preview"
      />
    );
  if (url.match(/\.(mp4|mov|webm|ogg)$/i))
    return (
      <video controls className="w-full h-full object-contain bg-black">
        <source src={url} />
        Tu navegador no soporta este video.
      </video>
    );
  if (url.includes("docs.google.com") && url.includes("/edit"))
    return (
      <iframe
        src={url.replace(/\/edit.*/, "/preview")}
        className="w-full h-full border-none"
        title="Doc Preview"
        allowFullScreen
      />
    );
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let embed = url;
    if (url.includes("watch?v=")) embed = url.replace("watch?v=", "embed/");
    else if (url.includes("youtu.be/"))
      embed = url.replace("youtu.be/", "youtube.com/embed/");
    return (
      <iframe
        src={embed}
        className="w-full h-full border-none"
        title="Video"
        allowFullScreen
      />
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
      <LinkIcon size={40} className="mb-2 opacity-30" />
      <span className="text-xs font-bold uppercase tracking-widest opacity-60">
        Vista previa no disponible
      </span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2"
      >
        Abrir enlace <ExternalLink size={12} />
      </a>
    </div>
  );
};

// --- COMPONENTE INPUT HÍBRIDO ---
const UnifiedMediaInput = ({
  url,
  onChange,
  placeholder,
  isReadOnly,
  icon: Icon,
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fileName = `campaign_asset_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);
      onChange(data.publicUrl);
    } catch (err) {
      alert("Error al subir archivo");
    } finally {
      setIsUploading(false);
    }
  };

  if (isReadOnly) {
    if (!url)
      return (
        <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-400 italic border border-gray-100">
          Sin archivo adjunto.
        </div>
      );
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 w-full bg-blue-50 text-blue-700 p-3 rounded-xl text-sm font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
      >
        {Icon ? <Icon size={16} /> : <LinkIcon size={16} />}
        <span className="truncate flex-1">{url}</span>
        <ExternalLink size={14} className="opacity-50" />
      </a>
    );
  }

  return (
    <div className="flex gap-2 w-full">
      <div className="relative flex-1">
        {Icon && (
          <div className="absolute left-3 top-3.5 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          type="text"
          className={`w-full bg-white border border-gray-200 ${Icon ? "pl-10" : "p-3"} p-3 rounded-xl text-sm font-medium outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all placeholder:text-gray-400`}
          placeholder={placeholder}
          value={url || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
        accept="image/*,video/*,application/pdf"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 rounded-xl transition-colors border border-gray-200 flex items-center justify-center min-w-[50px]"
        title="Subir archivo"
      >
        {isUploading ? (
          <Loader2 size={18} className="animate-spin text-brand" />
        ) : (
          <CloudUpload size={18} />
        )}
      </button>
    </div>
  );
};

export default function CampaignWorkplan({
  formData,
  liveUpdate,
  isReadOnly,
  partners,
}) {
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState("");
  const [editingTask, setEditingTask] = useState(null);

  // Estado local para agregar items a la Shotlist
  const [newShotDesc, setNewShotDesc] = useState("");
  const [newShotAssignee, setNewShotAssignee] = useState("");

  // --- LOGICA ---
  const addPhase = () => {
    if (isReadOnly || !newPhaseName.trim()) return;
    const newPhase = { id: Date.now().toString(), name: newPhaseName };
    liveUpdate("phases", [...formData.phases, newPhase]);
    setNewPhaseName("");
  };
  const deletePhase = (phaseId) => {
    if (!isReadOnly && confirm("¿Borrar fase?"))
      liveUpdate(
        "phases",
        formData.phases.filter((p) => p.id !== phaseId),
      );
  };
  const addTask = (phaseId) => {
    if (isReadOnly || !newTaskTitle.trim()) return;
    const task = {
      id: Date.now(),
      title: newTaskTitle,
      phase_id: phaseId,
      task_type: "CONTENT",
      done: false,
      is_highlighted: false,
      assigned_to: [],
      platform: [],
    };
    liveUpdate("tasks", [...formData.tasks, task]);
    setNewTaskTitle("");
    setTimeout(() => setEditingTask(task), 50);
  };
  const updateEditingTask = (field, value) =>
    setEditingTask((prev) => ({ ...prev, [field]: value }));
  const saveTaskDetails = () => {
    const updatedTasks = formData.tasks.map((t) =>
      t.id === editingTask.id ? editingTask : t,
    );
    liveUpdate("tasks", updatedTasks);
    setEditingTask(null);
  };
  const deleteTask = (taskId) => {
    if (isReadOnly || !confirm("¿Borrar tarea?")) return;
    liveUpdate(
      "tasks",
      formData.tasks.filter((t) => t.id !== taskId),
    );
    if (editingTask?.id === taskId) setEditingTask(null);
  };
  const toggleTaskStatus = (taskId) => {
    liveUpdate(
      "tasks",
      formData.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t,
      ),
    );
  };
  const handleDropTaskToPhase = (e, targetPhaseId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    liveUpdate(
      "tasks",
      formData.tasks.map((t) =>
        t.id == taskId ? { ...t, phase_id: targetPhaseId } : t,
      ),
    );
  };

  const togglePlatform = (p) => {
    const current = Array.isArray(editingTask.platform)
      ? editingTask.platform
      : editingTask.platform
        ? [editingTask.platform]
        : [];
    const updated = current.includes(p)
      ? current.filter((item) => item !== p)
      : [...current, p];
    updateEditingTask("platform", updated);
  };

  // --- LOGICA SHOTLIST ---
  const addShot = () => {
    if (!newShotDesc.trim()) return;
    const currentShots = editingTask.shot_list || [];
    updateEditingTask("shot_list", [
      ...currentShots,
      { id: Date.now(), desc: newShotDesc, assignee: newShotAssignee },
    ]);
    setNewShotDesc("");
    setNewShotAssignee("");
  };
  const removeShot = (id) =>
    updateEditingTask(
      "shot_list",
      (editingTask.shot_list || []).filter((s) => s.id !== id),
    );

  // --- LOGICA DELIVERY TRACKING ---
  const toggleDeliveryStatus = (partnerId, field) => {
    // field = 'uploaded' | 'reviewed'
    const currentTracking = editingTask.delivery_tracking || {};
    const partnerStatus = currentTracking[partnerId] || {
      uploaded: false,
      reviewed: false,
    };

    const newStatus = {
      ...currentTracking,
      [partnerId]: { ...partnerStatus, [field]: !partnerStatus[field] },
    };
    updateEditingTask("delivery_tracking", newStatus);
  };

  const getTaskColor = (type) => {
    switch (type) {
      case "MEETING":
        return "border-l-purple-400";
      case "MANAGEMENT":
        return "border-l-orange-400";
      case "REVIEW":
        return "border-l-pink-400";
      default:
        return "border-l-blue-400";
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case "MEETING":
        return <Video size={14} className="text-purple-500" />;
      case "MANAGEMENT":
        return <Briefcase size={14} className="text-orange-500" />;
      case "REVIEW":
        return <FileSearch size={14} className="text-pink-500" />;
      default:
        return <ImageIcon size={14} className="text-blue-500" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(24, 0, 0, 0);
    return d < today;
  };

  const getPartnerName = (id) => {
    if (id === "INTERNAL_AA") return "Acción Andina";
    return partners.find((p) => p.id === id)?.name || "Socio";
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER: FECHAS GLOBALES */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 w-full sm:w-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
              Inicio Campaña
            </p>
            <input
              disabled={isReadOnly}
              type="date"
              className="bg-transparent text-lg font-black text-gray-900 outline-none w-full sm:w-auto text-center sm:text-left"
              value={formData.start_date}
              onChange={(e) => liveUpdate("start_date", e.target.value)}
            />
          </div>
          <div className="hidden sm:block w-px bg-gray-200 h-10 self-center"></div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
              Cierre Campaña
            </p>
            <input
              disabled={isReadOnly}
              type="date"
              className="bg-transparent text-lg font-black text-gray-900 outline-none"
              value={formData.end_date}
              onChange={(e) => liveUpdate("end_date", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* FASES */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
            Plan de Trabajo
          </h3>
          {!isReadOnly && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Nombre de Fase..."
                className="bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold outline-none w-full sm:w-72 focus:border-brand shadow-sm"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPhase()}
              />
              <button
                onClick={addPhase}
                className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-black uppercase tracking-wider shadow-lg transition-all whitespace-nowrap"
              >
                + Fase
              </button>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {formData.phases.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 text-sm font-bold">
              No hay fases creadas aún.
            </div>
          )}
          {formData.phases.map((phase) => {
            const phaseTasks = formData.tasks
              .filter((t) => t.phase_id === phase.id)
              .sort(
                (a, b) =>
                  (b.is_highlighted === true) - (a.is_highlighted === true),
              );
            return (
              <div
                key={phase.id}
                className="border border-gray-200 rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                onDragOver={(e) => !isReadOnly && e.preventDefault()}
                onDrop={(e) => handleDropTaskToPhase(e, phase.id)}
              >
                <div className="bg-gray-50/80 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 gap-4">
                  <div className="flex items-center gap-3 flex-1 w-full text-left">
                    <CalendarDays size={20} className="text-brand shrink-0" />
                    <input
                      disabled={isReadOnly}
                      type="text"
                      className="bg-transparent border-none outline-none font-black text-base md:text-lg text-gray-900 uppercase w-full p-0 tracking-tight"
                      value={phase.name}
                      onChange={(e) => {
                        const newPhases = formData.phases.map((p) =>
                          p.id === phase.id
                            ? { ...p, name: e.target.value }
                            : p,
                        );
                        liveUpdate("phases", newPhases);
                      }}
                    />
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-500 border border-gray-200 shadow-sm">
                      {phaseTasks.length} tareas
                    </span>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => deletePhase(phase.id)}
                      className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* LISTA DE TAREAS COMPACTA */}
                <div className="p-4 bg-white space-y-2">
                  {phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={!isReadOnly}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("taskId", task.id);
                      }}
                      onClick={() => setEditingTask(task)}
                      className={`group relative p-3 rounded-xl border transition-all ${!isReadOnly ? "cursor-grab active:cursor-grabbing" : "cursor-default"} 
                        ${task.is_highlighted ? "bg-yellow-50/50 border-yellow-200 shadow-sm" : "bg-white border-gray-200 hover:border-brand/40 hover:shadow-md"}
                        ${task.done ? "opacity-60 bg-gray-50 border-gray-100" : ""}
                        border-l-[3px] ${getTaskColor(task.task_type)}`}
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {!isReadOnly && (
                            <div className="text-gray-300 group-hover:text-gray-400">
                              <GripVertical size={12} />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {getTaskTypeIcon(task.task_type)}
                            <span className="text-[10px] font-bold uppercase tracking-wide">
                              {task.task_type === "CONTENT"
                                ? "Contenido"
                                : task.task_type === "MANAGEMENT"
                                  ? "Envío Material"
                                  : task.task_type || "General"}
                            </span>
                          </div>
                          {(Array.isArray(task.platform)
                            ? task.platform
                            : [task.platform]
                          ).filter(Boolean).length > 0 && (
                              <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
                                {(Array.isArray(task.platform)
                                  ? task.platform
                                  : [task.platform]
                                )
                                  .filter(Boolean)
                                  .slice(0, 3)
                                  .map((p) => (
                                    <span
                                      key={p}
                                      className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase"
                                    >
                                      {p}
                                    </span>
                                  ))}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {task.status === "CHANGES_REQUESTED" && (
                            <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">
                              Cambios
                            </span>
                          )}
                          <button
                            disabled={isReadOnly}
                            onClick={(e) => {
                              e.stopPropagation();
                              const up = formData.tasks.map((t) =>
                                t.id === task.id
                                  ? { ...t, is_highlighted: !t.is_highlighted }
                                  : t,
                              );
                              liveUpdate("tasks", up);
                            }}
                            className={`hover:scale-110 transition-transform p-1 ${task.is_highlighted ? "text-yellow-500 fill-yellow-500" : "text-gray-200 group-hover:text-yellow-400"}`}
                          >
                            <Star size={14} />
                          </button>
                        </div>
                      </div>

                      {/* TÍTULO */}
                      <p
                        className={`text-xs font-bold leading-snug mb-2 pl-5 pr-2 ${task.done ? "text-gray-400 line-through" : "text-gray-800"}`}
                      >
                        {task.title}
                      </p>

                      {/* FOOTER */}
                      <div className="flex justify-between items-center pl-5 pt-1.5 border-t border-gray-50">
                        {task.date ? (
                          <span
                            className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue(task.date) && !task.done ? "text-red-500" : "text-gray-400"}`}
                          >
                            <Clock size={10} /> {formatDate(task.date)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">
                            Sin fecha
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 flex-wrap justify-end">
                            {partners
                              .filter((p) => task.assigned_to?.includes(p.id))
                              .map((p) => (
                                <span
                                  key={p.id}
                                  className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[60px]"
                                >
                                  {p.name}
                                </span>
                              ))}
                            {task.assigned_to?.includes("INTERNAL_AA") && (
                              <span className="text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded border border-brand/20">
                                AA
                              </span>
                            )}
                          </div>
                          <button
                            disabled={isReadOnly}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(task.id);
                            }}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-300 hover:border-emerald-400 text-transparent hover:text-emerald-200"}`}
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!isReadOnly && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-gray-100">
                      <input
                        type="text"
                        placeholder="+ Añadir nueva tarea..."
                        className="flex-1 text-xs font-medium bg-gray-50 p-2 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-brand transition-all"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && addTask(phase.id)
                        }
                        onFocus={() => setNewTaskPhase(phase.id)}
                      />
                      <button
                        onClick={() => {
                          if (newTaskPhase === phase.id) addTask(phase.id);
                        }}
                        className="text-brand hover:bg-brand/10 p-2 rounded-lg"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL EDICIÓN MEJORADO --- */}
      {editingTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95">
          <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl p-4 md:p-8 max-w-7xl w-full h-full sm:h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-2xl">
                  {getTaskTypeIcon(editingTask.task_type)}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    disabled={isReadOnly}
                    type="text"
                    className="text-2xl font-black text-gray-900 uppercase tracking-tight bg-transparent outline-none placeholder:text-gray-300 w-[600px]"
                    value={editingTask.title}
                    onChange={(e) => updateEditingTask("title", e.target.value)}
                    placeholder="Título de la tarea..."
                  />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {editingTask.task_type === "MANAGEMENT"
                      ? "Envío de Material"
                      : editingTask.task_type || "General"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!isReadOnly && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {[
                      { id: "CONTENT", icon: ImageIcon },
                      { id: "REVIEW", icon: FileSearch },
                      { id: "MEETING", icon: Video },
                      { id: "MANAGEMENT", icon: Briefcase },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateEditingTask("task_type", t.id)}
                        title={t.id}
                        className={`p-2 rounded-lg transition-all ${editingTask.task_type === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        <t.icon size={16} />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal */}
            <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
              <div className="col-span-8 h-full overflow-y-auto custom-scrollbar pr-2 flex flex-col">
                {/* A. VISTA "CONTENT" (Social Media) */}
                {(!editingTask.task_type ||
                  editingTask.task_type === "CONTENT") && (
                    <div className="flex flex-col h-full gap-6">
                      {/* ... (Contenido Social Media igual al anterior) ... */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">
                            Plataformas
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "Instagram",
                              "Facebook",
                              "TikTok",
                              "Linkedin",
                              "Youtube",
                              "Twitter",
                            ].map((p) => {
                              const platforms = Array.isArray(
                                editingTask.platform,
                              )
                                ? editingTask.platform
                                : editingTask.platform
                                  ? [editingTask.platform]
                                  : [];
                              const isSelected = platforms.includes(p);
                              return (
                                <button
                                  key={p}
                                  disabled={isReadOnly}
                                  onClick={() => togglePlatform(p)}
                                  className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center ${isSelected ? "border-brand bg-brand/5 text-brand" : "border-gray-100 text-gray-400 hover:bg-gray-50"}`}
                                >
                                  {p === "Instagram" && <Instagram size={18} />}
                                  {p === "Facebook" && <Facebook size={18} />}
                                  {p === "Linkedin" && <Briefcase size={18} />}
                                  {p === "TikTok" && <Video size={18} />}
                                  {p === "Youtube" && <Youtube size={18} />}
                                  {p === "Twitter" && <ExternalLink size={18} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">
                            Formato
                          </label>
                          <select
                            disabled={isReadOnly}
                            className="w-full bg-gray-50 p-3.5 rounded-xl text-sm font-bold outline-none border-r-[12px] border-transparent"
                            value={editingTask.format}
                            onChange={(e) =>
                              updateEditingTask("format", e.target.value)
                            }
                          >
                            <option value="">Seleccionar...</option>
                            <optgroup label="Video">
                              <option value="Video 9:16 (Reel/TikTok)">
                                Video 9:16 (Reel/TikTok)
                              </option>
                              <option value="Video 16:9 (YouTube)">
                                Video 16:9 (YouTube)
                              </option>
                              <option value="Video 1:1 (Cuadrado)">
                                Video 1:1 (Cuadrado)
                              </option>
                            </optgroup>
                            <optgroup label="Imagen">
                              <option value="Post 1:1">
                                Post 1:1 (Cuadrado)
                              </option>
                              <option value="Post 4:5">Post 4:5 (Retrato)</option>
                              <option value="Story 9:16">Story 9:16</option>
                              <option value="Carrusel">
                                Carrusel (Múltiple)
                              </option>
                            </optgroup>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 flex-1 min-h-[300px]">
                        <div className="flex flex-col gap-4">
                          <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              Copy / Texto
                            </label>
                            <textarea
                              disabled={isReadOnly}
                              className="flex-1 w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-medium outline-none resize-none focus:border-brand transition-all"
                              placeholder="Escribe el copy aquí..."
                              value={editingTask.copy || ""}
                              onChange={(e) =>
                                updateEditingTask("copy", e.target.value)
                              }
                            ></textarea>
                          </div>
                          <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                              <Camera size={14} /> Tomas Recomendadas
                            </label>
                            <textarea
                              disabled={isReadOnly}
                              className="flex-1 w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-medium outline-none resize-none focus:border-brand transition-all"
                              placeholder="Describe planos, ángulos o ideas visuales..."
                              value={editingTask.shots || ""}
                              onChange={(e) =>
                                updateEditingTask("shots", e.target.value)
                              }
                            ></textarea>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                            <ImageIcon size={14} /> Multimedia
                          </label>
                          <UnifiedMediaInput
                            url={editingTask.assets_url}
                            onChange={(v) => updateEditingTask("assets_url", v)}
                            placeholder="Subir archivo o pegar link..."
                            isReadOnly={isReadOnly}
                            icon={ImageIcon}
                          />
                          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner flex items-center justify-center mt-2 min-h-[250px]">
                            {getPreviewContent(editingTask.assets_url)}
                          </div>
                          <div className="space-y-1 pt-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                              <Hash size={14} /> Hashtags
                            </label>
                            <input
                              disabled={isReadOnly}
                              type="text"
                              className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm text-blue-600 font-bold outline-none focus:border-brand"
                              value={editingTask.hashtags || ""}
                              onChange={(e) =>
                                updateEditingTask("hashtags", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* B. VISTA "REVIEW" */}
                {editingTask.task_type === "REVIEW" && (
                  <div className="flex flex-col h-full gap-4">
                    <div className="bg-gray-100 rounded-3xl border border-gray-200 overflow-hidden shadow-inner flex-1 min-h-[500px] relative">
                      {editingTask.review_doc_url ? (
                        getPreviewContent(editingTask.review_doc_url)
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <FileSearch size={64} className="mb-4 opacity-30" />
                          <p className="text-sm font-bold text-gray-500">
                            Pega un enlace a la derecha para visualizar
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* C. VISTA "MANAGEMENT" (ENVÍO DE MATERIAL - MEJORADO) */}
                {editingTask.task_type === "MANAGEMENT" && (
                  <div className="flex flex-col h-full gap-6">
                    {/* 1. SECCIÓN INSTRUCCIONES CON MODOS */}
                    <div className="flex-1 bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
                      {/* Header Tabs */}
                      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
                        {[
                          { id: "SIMPLE", label: "Texto", icon: FileText },
                          { id: "SCRIPT", label: "Guion", icon: FileSearch },
                          { id: "SHOTLIST", label: "Lista Tomas", icon: List },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() =>
                              updateEditingTask("instruction_mode", mode.id)
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${editingTask.instruction_mode === mode.id ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                          >
                            <mode.icon size={14} /> {mode.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {/* MODO TEXTO SIMPLE */}
                        {(!editingTask.instruction_mode ||
                          editingTask.instruction_mode === "SIMPLE") && (
                            <textarea
                              disabled={isReadOnly}
                              className="w-full h-full p-6 outline-none text-sm font-medium resize-none leading-relaxed"
                              placeholder="Escribe las indicaciones aquí..."
                              value={editingTask.delivery_notes || ""}
                              onChange={(e) =>
                                updateEditingTask(
                                  "delivery_notes",
                                  e.target.value,
                                )
                              }
                            ></textarea>
                          )}

                        {/* MODO GUION (RICH TEXT) */}
                        {editingTask.instruction_mode === "SCRIPT" && (
                          <RichEditor
                            value={editingTask.script_content || ""}
                            onChange={(val) =>
                              updateEditingTask("script_content", val)
                            }
                            placeholder="Escribe el guion técnico..."
                            minHeight="100%"
                          />
                        )}

                        {/* MODO SHOTLIST (TOMAS) */}
                        {editingTask.instruction_mode === "SHOTLIST" && (
                          <div className="p-6 space-y-4">
                            {!isReadOnly && (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Descripción de la toma..."
                                  className="flex-1 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none border border-gray-200 focus:border-brand"
                                  value={newShotDesc}
                                  onChange={(e) =>
                                    setNewShotDesc(e.target.value)
                                  }
                                />
                                <select
                                  className="bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-gray-200"
                                  value={newShotAssignee}
                                  onChange={(e) =>
                                    setNewShotAssignee(e.target.value)
                                  }
                                >
                                  <option value="">-- Asignar --</option>
                                  {partners
                                    .filter((p) =>
                                      editingTask.assigned_to?.includes(p.id),
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  {editingTask.assigned_to?.includes(
                                    "INTERNAL_AA",
                                  ) && <option value="INTERNAL_AA">Yo</option>}
                                </select>
                                <button
                                  onClick={addShot}
                                  className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                            )}
                            <div className="space-y-2">
                              {(editingTask.shot_list || []).map((shot) => (
                                <div
                                  key={shot.id}
                                  className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
                                >
                                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                                    <Camera size={12} />
                                  </div>
                                  <span className="flex-1 text-sm text-gray-700 font-medium">
                                    {shot.desc}
                                  </span>
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold border border-blue-100">
                                    {getPartnerName(shot.assignee)}
                                  </span>
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => removeShot(shot.id)}
                                      className="text-gray-300 hover:text-red-500"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(editingTask.shot_list || []).length === 0 && (
                                <p className="text-gray-400 text-xs italic text-center">
                                  No hay tomas registradas.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. SECCIÓN CHECKLIST DE ENTREGA (NUEVO) */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UploadCloud size={14} /> Seguimiento de Entrega
                      </h4>
                      <div className="space-y-3">
                        {(editingTask.assigned_to || []).length === 0 && (
                          <p className="text-xs text-gray-400 italic">
                            Asigna socios primero para ver el seguimiento.
                          </p>
                        )}

                        {(editingTask.assigned_to || []).map((partnerId) => {
                          const status = (editingTask.delivery_tracking &&
                            editingTask.delivery_tracking[partnerId]) || {
                            uploaded: false,
                            reviewed: false,
                          };
                          return (
                            <div
                              key={partnerId}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                {partnerId === "INTERNAL_AA" ? (
                                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                                    AA
                                  </div>
                                ) : (
                                  <img
                                    src={
                                      partners.find((p) => p.id === partnerId)
                                        ?.logo_url
                                    }
                                    className="w-8 h-8 rounded-full object-cover bg-gray-100"
                                  />
                                )}
                                <span className="text-sm font-bold text-gray-800">
                                  {getPartnerName(partnerId)}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {/* Toggle SUBIDO */}
                                <button
                                  onClick={() =>
                                    toggleDeliveryStatus(partnerId, "uploaded")
                                  }
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${status.uploaded ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full border ${status.uploaded ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                                  ></div>
                                  <span className="text-[10px] font-bold uppercase">
                                    Subido
                                  </span>
                                </button>
                                {/* Toggle REVISADO */}
                                <button
                                  onClick={() =>
                                    toggleDeliveryStatus(partnerId, "reviewed")
                                  }
                                  disabled={!status.uploaded}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${status.reviewed ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 disabled:opacity-50"}`}
                                >
                                  <CheckCircle2
                                    size={14}
                                    className={
                                      status.reviewed
                                        ? "fill-emerald-500 text-white"
                                        : ""
                                    }
                                  />
                                  <span className="text-[10px] font-bold uppercase">
                                    Revisado
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* D. VISTA "MEETING" */}
                {editingTask.task_type === "MEETING" && (
                  <div className="flex flex-col h-full gap-4">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Agenda de Reunión
                    </label>
                    <textarea
                      disabled={isReadOnly}
                      className="flex-1 w-full bg-white border border-gray-200 p-6 rounded-2xl text-sm font-medium outline-none resize-none focus:border-brand"
                      value={editingTask.agenda || ""}
                      onChange={(e) =>
                        updateEditingTask("agenda", e.target.value)
                      }
                      placeholder="Puntos a tratar..."
                    ></textarea>
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA */}
              <div className="col-span-4 h-full flex flex-col gap-6 border-l border-gray-100 pl-8 overflow-y-auto custom-scrollbar">
                {editingTask.task_type !== "CONTENT" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      {editingTask.task_type === "REVIEW" ? (
                        <FileSearch size={14} />
                      ) : editingTask.task_type === "MEETING" ? (
                        <Video size={14} />
                      ) : (
                        <LinkIcon size={14} />
                      )}
                      {editingTask.task_type === "REVIEW"
                        ? "Documento a Revisar"
                        : editingTask.task_type === "MEETING"
                          ? "Link Videollamada"
                          : "Recurso / Insumo"}
                    </label>
                    <UnifiedMediaInput
                      url={
                        editingTask.task_type === "REVIEW"
                          ? editingTask.review_doc_url
                          : editingTask.task_type === "MEETING"
                            ? editingTask.meeting_link
                            : editingTask.assets_url
                      }
                      onChange={(v) =>
                        updateEditingTask(
                          editingTask.task_type === "REVIEW"
                            ? "review_doc_url"
                            : editingTask.task_type === "MEETING"
                              ? "meeting_link"
                              : "assets_url",
                          v,
                        )
                      }
                      placeholder="Pegar link o subir archivo..."
                      isReadOnly={isReadOnly}
                      icon={
                        editingTask.task_type === "REVIEW"
                          ? FileSearch
                          : LinkIcon
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Fecha Límite
                  </label>
                  <input
                    disabled={isReadOnly}
                    type="date"
                    className="w-full bg-gray-50 border-2 border-transparent p-3 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-brand transition-all"
                    value={editingTask.date}
                    onChange={(e) => updateEditingTask("date", e.target.value)}
                  />
                </div>
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Responsables
                  </label>
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-3 rounded-2xl border border-gray-100 max-h-64">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={isReadOnly}
                        onClick={() => {
                          const c = editingTask.assigned_to || [];
                          const n = c.includes("INTERNAL_AA")
                            ? c.filter((i) => i !== "INTERNAL_AA")
                            : [...c, "INTERNAL_AA"];
                          updateEditingTask("assigned_to", n);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all w-full ${editingTask.assigned_to?.includes("INTERNAL_AA") ? "border-brand bg-brand/5 text-brand" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
                      >
                        <Shield size={14} /> Yo (Acción Andina)
                      </button>
                      {partners.map((p) => (
                        <button
                          key={p.id}
                          disabled={isReadOnly}
                          onClick={() => {
                            const curr = editingTask.assigned_to || [];
                            const neo = curr.includes(p.id)
                              ? curr.filter((id) => id !== p.id)
                              : [...curr, p.id];
                            updateEditingTask("assigned_to", neo);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all w-full ${editingTask.assigned_to?.includes(p.id) ? "border-brand bg-brand/5 text-brand" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
                        >
                          <img
                            src={p.logo_url}
                            className="w-4 h-4 rounded-full bg-gray-100"
                          />{" "}
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {editingTask.task_type === "REVIEW" && (
                  <div className="space-y-2 mt-auto pt-4 border-t border-gray-100">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Feedback
                    </label>
                    <textarea
                      disabled={isReadOnly}
                      rows="4"
                      className="w-full bg-yellow-50 border border-yellow-100 p-3 rounded-xl text-sm font-medium outline-none resize-none text-gray-800 focus:border-yellow-300"
                      placeholder="Deja tus comentarios aquí..."
                      value={editingTask.feedback || ""}
                      onChange={(e) =>
                        updateEditingTask("feedback", e.target.value)
                      }
                    ></textarea>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button
                        onClick={() => {
                          updateEditingTask("status", "CHANGES_REQUESTED");
                          saveTaskDetails();
                        }}
                        className="py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold text-xs hover:bg-red-50 transition-all"
                      >
                        Corregir
                      </button>
                      <button
                        onClick={() => {
                          updateEditingTask("done", true);
                          saveTaskDetails();
                        }}
                        className="py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Aprobar
                      </button>
                    </div>
                  </div>
                )}
                {editingTask.task_type !== "REVIEW" && !isReadOnly && (
                  <button
                    onClick={saveTaskDetails}
                    className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase hover:bg-black transition-all shadow-lg mt-auto"
                  >
                    Guardar Cambios
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
