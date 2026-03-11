/**
 * PESTAÑA: ExecutionTab
 * ---------------------
 * El "Daily Dashboard": Gestión del trabajo en tiempo real día por día.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * 1. VISTA DE CALENDARIO: Visualización de 4 días consecutivos con navegación temporal.
 * 2. GESTIÓN DE PROGRESO: Control detallado de subtareas, horas estimadas y porcentaje de avance.
 * 3. BITÁCORA DIARIA: Notas rápidas y enlaces de recursos asociados a fechas específicas.
 * 4. PREVIEW DE DOCS: Integración con IFrames para visualizar documentos de Google Drive directamente.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  GripVertical,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  CheckSquare,
  StickyNote,
  Link as LinkIcon,
  ExternalLink,
  CalendarDays,
  Save,
  Check,
  Clock,
} from "lucide-react";

export default function ExecutionTab({
  tasks,
  monthlyNotes,
  currentDate,
  onUpdate,
}) {
  const [columnStartDate, setColumnStartDate] = useState(new Date());

  // --- MODALES ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState(null);

  // Estado Tarea
  const [selectedTaskForDay, setSelectedTaskForDay] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    start_date: "",
    end_date: "",
    estimated_hours: 0,
    progress: 0,
    status: "EN_PROGRESO",
    resource_link: "",
  });
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Estado Notas
  const [dayData, setDayData] = useState({ notes: "", urls: [] });
  const [newUrl, setNewUrl] = useState({ title: "", url: "" });

  useEffect(() => {
    setColumnStartDate(new Date());
  }, [currentDate]);

  // Helper Preview
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("docs.google.com") && url.includes("/edit"))
      return url.replace(/\/edit.*/, "/preview");
    return url;
  };

  // Navegación
  const changeColumnDays = (days) => {
    const n = new Date(columnStartDate);
    n.setDate(n.getDate() + days);
    setColumnStartDate(n);
  };

  const handleDropToDay = async (e, targetDateStr) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    await supabase
      .from("personal_tasks")
      .update({ start_date: targetDateStr, end_date: targetDateStr })
      .eq("id", taskId);
    onUpdate();
  };

  const getPriorityColor = (p) =>
    p === 1
      ? "border-red-100 text-red-500"
      : p === 2
        ? "border-orange-100 text-orange-500"
        : "border-blue-100 text-blue-500";

  // --- ABRIR MODAL TAREA ---
  const openTaskModal = (day, taskId = null) => {
    setSelectedDay(day);
    if (taskId) handleSelectTaskInModal(taskId);
    else setSelectedTaskForDay(null);
    setIsTaskModalOpen(true);
  };

  // --- ABRIR MODAL NOTA ---
  const openNoteModal = async (day) => {
    setSelectedDay(day);
    const offset = day.getTimezoneOffset();
    const dateStr = new Date(day.getTime() - offset * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { data } = await supabase
      .from("personal_daily_logs_data")
      .select("*")
      .eq("date", dateStr)
      .maybeSingle();
    setDayData(data || { notes: "", urls: [] });
    setIsNoteModalOpen(true);
  };

  const handleSelectTaskInModal = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return setSelectedTaskForDay(null);
    setSelectedTaskForDay(task);
    setSubtasks(task.subtasks || []);

    const defDate = selectedDay
      ? selectedDay.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setScheduleData({
      start_date: task.start_date || defDate,
      end_date: task.end_date || task.start_date || defDate,
      estimated_hours: task.estimated_hours || 0,
      progress: task.progress || 0,
      status: task.status || "EN_PROGRESO",
      resource_link: task.resource_link || "",
    });
  };

  const handleSaveScheduleAndProgress = async () => {
    if (!selectedTaskForDay) return;
    const finalStatus =
      scheduleData.progress >= 100 ? "COMPLETADO" : scheduleData.status;
    await supabase
      .from("personal_tasks")
      .update({
        start_date: scheduleData.start_date,
        end_date: scheduleData.end_date,
        estimated_hours: scheduleData.estimated_hours,
        progress: scheduleData.progress,
        status: finalStatus,
        subtasks: subtasks,
        resource_link: scheduleData.resource_link,
      })
      .eq("id", selectedTaskForDay.id);
    alert("✅ Tarea guardada");
    onUpdate();
    setIsTaskModalOpen(false);
  };

  const handleSaveDayData = async () => {
    if (!selectedDay) return;
    const offset = selectedDay.getTimezoneOffset();
    const dateStr = new Date(selectedDay.getTime() - offset * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { data: existing } = await supabase
      .from("personal_daily_logs_data")
      .select("id")
      .eq("date", dateStr)
      .maybeSingle();
    if (existing)
      await supabase
        .from("personal_daily_logs_data")
        .update({ notes: dayData.notes, urls: dayData.urls })
        .eq("id", existing.id);
    else
      await supabase
        .from("personal_daily_logs_data")
        .insert([{ date: dateStr, notes: dayData.notes, urls: dayData.urls }]);
    alert("✅ Bitácora guardada");
    onUpdate();
    setIsNoteModalOpen(false);
  };

  // Subtareas
  const updateProgress = (currentSubtasks) => {
    if (currentSubtasks.length === 0) return;
    const completedCount = currentSubtasks.filter((t) => t.completed).length;
    const newProgress = Math.round(
      (completedCount / currentSubtasks.length) * 100,
    );
    setScheduleData((prev) => ({
      ...prev,
      progress: newProgress,
      status: newProgress === 100 ? "COMPLETADO" : "EN_PROGRESO",
    }));
  };
  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSubtasks = [
      ...subtasks,
      { id: Date.now(), text: newSubtaskText, completed: false },
    ];
    setSubtasks(newSubtasks);
    setNewSubtaskText("");
    updateProgress(newSubtasks);
  };
  const toggleSubtask = (id) => {
    const newSubtasks = subtasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setSubtasks(newSubtasks);
    updateProgress(newSubtasks);
  };
  const deleteSubtask = (id) => {
    const newSubtasks = subtasks.filter((t) => t.id !== id);
    setSubtasks(newSubtasks);
    updateProgress(newSubtasks);
  };

  // URLs
  const addDayUrl = () => {
    if (newUrl.url) {
      setDayData({
        ...dayData,
        urls: [
          ...(dayData.urls || []),
          {
            id: Date.now(),
            title: newUrl.title || newUrl.url,
            url: newUrl.url,
          },
        ],
      });
      setNewUrl({ title: "", url: "" });
    }
  };
  const removeDayUrl = (id) =>
    setDayData({ ...dayData, urls: dayData.urls.filter((u) => u.id !== id) });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER NAVEGACIÓN */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeColumnDays(-4)}
            className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 items-center">
            <button
              onClick={() => setColumnStartDate(new Date())}
              className="text-[10px] font-black uppercase bg-brand text-white px-3 py-1.5 rounded-md hover:bg-brand/90 mr-2"
            >
              Hoy
            </button>
            <input
              type="date"
              className="text-xs font-bold outline-none text-gray-600 w-24 bg-transparent cursor-pointer"
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split("-").map(Number);
                  setColumnStartDate(new Date(y, m - 1, d));
                }
              }}
            />
          </div>
          <button
            onClick={() => changeColumnDays(4)}
            className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* GRID DE DIAS (RESPONSIVO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[60vh] h-auto xl:h-[65vh]">
        {Array.from({ length: 4 }).map((_, i) => {
          const dayDate = new Date(columnStartDate);
          dayDate.setDate(columnStartDate.getDate() + i);
          const isToday = dayDate.toDateString() === new Date().toDateString();
          const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
          const dayTasks = tasks.filter(
            (t) =>
              t.start_date &&
              dateStr >= t.start_date &&
              dateStr <= (t.end_date || t.start_date),
          );

          return (
            <div
              key={i}
              className={`flex flex-col rounded-[24px] p-4 border-2 transition-all ${isToday ? "bg-brand/5 border-brand" : "bg-white border-gray-100"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToDay(e, dateStr)}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200/50 cursor-pointer">
                <div
                  className="flex flex-col"
                  onClick={() => openTaskModal(dayDate)}
                >
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    {dayDate.toLocaleDateString("es-ES", { weekday: "short" })}
                  </span>
                  <span
                    className={`text-2xl font-black ${isToday ? "text-brand" : "text-gray-900"}`}
                  >
                    {dayDate.getDate()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openNoteModal(dayDate)}
                    className="p-1.5 rounded-lg hover:bg-yellow-100 text-gray-400 hover:text-yellow-600"
                    title="Editar Nota"
                  >
                    <StickyNote size={14} />
                  </button>
                  <button
                    onClick={() => openTaskModal(dayDate)}
                    className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-400 hover:text-brand"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("taskId", t.id)}
                    onClick={() => {
                      openTaskModal(dayDate, t.id);
                    }}
                    className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-brand/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${getPriorityColor(t.priority)}`}
                      >
                        P{t.priority}
                      </span>
                      <GripVertical size={12} className="text-gray-300" />
                    </div>
                    <p
                      className={`text-xs font-bold leading-tight ${t.status === "COMPLETADO" ? "text-gray-300 line-through" : "text-gray-700"}`}
                    >
                      {t.description}
                    </p>
                    {t.status === "COMPLETADO" && (
                      <div className="mt-2 flex justify-end">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* BITÁCORA MES (MEJORADO Y AMPLIADO) */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-6">
        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3 mb-6">
          <StickyNote className="text-brand" size={24} /> Bitácora Mensual
        </h3>
        {monthlyNotes.length === 0 ? (
          <p className="text-center text-gray-400 text-xs italic py-4">
            Sin notas registradas.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlyNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  const d = new Date(note.date + "T12:00:00");
                  openNoteModal(d);
                }}
                className="p-6 bg-yellow-50/50 rounded-2xl border border-yellow-100 hover:shadow-md transition-all cursor-pointer group relative"
              >
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote size={14} className="text-yellow-500" />
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">
                    {new Date(note.date + "T12:00:00").toLocaleDateString(
                      "es-ES",
                      { weekday: "long", day: "numeric", month: "long" },
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-medium line-clamp-4">
                  {note.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL TAREA (OPTIMIZADO CON PREVIEW ALTO) --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl p-6 max-w-4xl w-full animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Gestionar Tarea
                </h3>
                <p className="text-xs font-bold text-brand uppercase">
                  {selectedDay?.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <select
                className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:border-brand"
                value={selectedTaskForDay?.id || ""}
                onChange={(e) => handleSelectTaskInModal(e.target.value)}
              >
                <option value="">-- Seleccionar Actividad --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.description}
                  </option>
                ))}
              </select>
            </div>

            {selectedTaskForDay && (
              <div className="animate-in fade-in space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                {/* FECHAS (GRID) */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                      Inicio
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none"
                      value={scheduleData.start_date}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                      Fin
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none"
                      value={scheduleData.end_date}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          end_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1 flex items-center gap-1">
                      <Clock size={10} /> Minutos
                    </label>
                    <input
                      type="number"
                      className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none"
                      value={scheduleData.estimated_hours}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          estimated_hours: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* SUBTAREAS */}
                <div className="border-t border-b border-gray-200 py-3">
                  <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {subtasks.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-100"
                      >
                        <button
                          onClick={() => toggleSubtask(i.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${i.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-gray-50"}`}
                        >
                          {i.completed && <Check size={10} strokeWidth={4} />}
                        </button>
                        <span
                          className={`text-xs font-medium flex-1 truncate ${i.completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                        >
                          {i.text}
                        </span>
                        <button
                          onClick={() => deleteSubtask(i.id)}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+ Agregar paso..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* LINK Y PROGRESO (SIDE BY SIDE) */}
                <div className="grid grid-cols-12 gap-4">
                  {/* COLUMNA IZQ: LINK + PREVIEW (ALTO) */}
                  <div className="col-span-8 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none"
                        placeholder="Link Docs/Drive..."
                        value={scheduleData.resource_link || ""}
                        onChange={(e) =>
                          setScheduleData({
                            ...scheduleData,
                            resource_link: e.target.value,
                          })
                        }
                      />
                      {scheduleData.resource_link && (
                        <a
                          href={scheduleData.resource_link}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {scheduleData.resource_link &&
                      scheduleData.resource_link.includes("docs.google.com") ? (
                      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-inner relative h-80">
                        <iframe
                          src={getEmbedUrl(scheduleData.resource_link)}
                          className="w-full h-full"
                          frameBorder="0"
                          title="Preview"
                        ></iframe>
                      </div>
                    ) : (
                      <div className="flex-1 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[10px] h-80">
                        Sin Preview
                      </div>
                    )}
                  </div>

                  {/* COLUMNA DER: PROGRESO + BOTONES */}
                  <div className="col-span-4 flex flex-col justify-between bg-white p-4 rounded-xl border border-gray-200 h-full">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          Avance
                        </span>
                        <span className="text-brand font-black text-2xl">
                          {scheduleData.progress}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand mb-6"
                        value={scheduleData.progress}
                        onChange={(e) =>
                          setScheduleData({
                            ...scheduleData,
                            progress: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={() =>
                          setScheduleData({
                            ...scheduleData,
                            status: "COMPLETADO",
                            progress: 100,
                          })
                        }
                        className={`w-full py-3 rounded-lg text-xs font-bold uppercase border transition-all flex items-center justify-center gap-2 ${scheduleData.status === "COMPLETADO" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-gray-400 border-gray-200 hover:border-emerald-200 hover:text-emerald-500"}`}
                      >
                        <CheckCircle2 size={16} /> Completado
                      </button>
                      <button
                        onClick={handleSaveScheduleAndProgress}
                        className="w-full bg-brand text-white py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-black shadow-md transition-all"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL NOTA (SIMPLE) --- */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-900 uppercase flex items-center gap-2">
                <StickyNote size={20} className="text-brand" /> Apuntes del Día
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="space-y-4">
              <textarea
                className="w-full bg-yellow-50/50 border border-yellow-100 p-4 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-yellow-300 resize-none h-40 leading-relaxed"
                placeholder="Escribe aquí..."
                value={dayData.notes || ""}
                onChange={(e) =>
                  setDayData({ ...dayData, notes: e.target.value })
                }
              ></textarea>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Links Rápidos
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Título"
                    className="w-1/3 bg-gray-50 p-2 rounded-lg text-[10px] font-bold outline-none border"
                    value={newUrl.title}
                    onChange={(e) =>
                      setNewUrl({ ...newUrl, title: e.target.value })
                    }
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    className="flex-1 bg-gray-50 p-2 rounded-lg text-[10px] outline-none border"
                    value={newUrl.url}
                    onChange={(e) =>
                      setNewUrl({ ...newUrl, url: e.target.value })
                    }
                  />
                  <button
                    onClick={addDayUrl}
                    className="bg-blue-50 text-blue-600 p-2 rounded-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {dayData.urls?.map((u) => (
                    <div
                      key={u.id}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100"
                    >
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        <ExternalLink size={10} /> {u.title}
                      </a>
                      <button
                        onClick={() => removeDayUrl(u.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveDayData}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-black"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
