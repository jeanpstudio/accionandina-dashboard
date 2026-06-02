/**
 * PESTAÑA: PlanningTab
 * --------------------
 * Gestiona la planificación anticipada de actividades personales y de equipo.
 * 
 * LÓGICA DE NEGOCIO:
 * 1. ASIGNACIÓN SEMANAL: Las tareas se organizan en columnas según la semana del mes.
 * 2. DRAG & DROP: Permite reordenar tareas entre semanas mediante eventos nativos de arrastre.
 * 3. CATEGORIZACIÓN: Sistema dinámico de categorías para segmentar el trabajo.
 * 4. EXPORTACIÓN: Funciones especializadas para copiar resúmenes en formato tabla (HTML) 
 *    compatibles con Google Docs/Sheets.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  Plus,
  Settings,
  Trash2,
  ArrowUpDown,
  Layout,
  Pencil,
  X,
  Printer,
  ClipboardCopy,
  List,
  CheckCircle2,
  FileDown,
  Search,
  Check,
  ExternalLink,
} from "lucide-react";

export default function PlanningTab({
  tasks,
  categories,
  monthKey,
  currentDate,
  onUpdate,
  totalWeeks,
}) {
  // --- ESTADOS LOCALES ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sortOrder, setSortOrder] = useState("PRIORITY");
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  // Buscador de tareas
  const [taskSearch, setTaskSearch] = useState("");
  // Búsqueda global asíncrona
  const [globalTasks, setGlobalTasks] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  // Subtareas en la modal de edición
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Estado para Resumen Semanal
  const [summaryOptions, setSummaryOptions] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week: 1,
  });

  const [newTask, setNewTask] = useState({
    description: "",
    category: "",
    priority: 1,
    target_week: 1,
    resource_link: "",
  });
  const [newCategory, setNewCategory] = useState("");

  // --- HELPER PREVIEW ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("docs.google.com") && url.includes("/edit"))
      return url.replace(/\/edit.*/, "/preview");
    return url;
  };

  // --- SUBTAREAS EN MODAL EDICIÓN ---
  const handleModalAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const currentSubtasks = editingTask.subtasks || [];
    const updatedSubtasks = [
      ...currentSubtasks,
      { id: Date.now(), text: newSubtaskText, completed: false }
    ];
    
    const completedCount = updatedSubtasks.filter((t) => t.completed).length;
    const newProgress = updatedSubtasks.length > 0 
      ? Math.round((completedCount / updatedSubtasks.length) * 100) 
      : editingTask.progress;

    setEditingTask({
      ...editingTask,
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress >= 100 ? "COMPLETADO" : editingTask.status
    });
    setNewSubtaskText("");
  };

  const handleModalToggleSubtask = (subId) => {
    const today = new Date().toISOString().split("T")[0];
    const updatedSubtasks = (editingTask.subtasks || []).map((t) => {
      if (t.id === subId) {
        const isNowCompleted = !t.completed;
        return {
          ...t,
          completed: isNowCompleted,
          completed_at: isNowCompleted ? today : null,
        };
      }
      return t;
    });

    const completedCount = updatedSubtasks.filter((t) => t.completed).length;
    const newProgress = updatedSubtasks.length > 0 
      ? Math.round((completedCount / updatedSubtasks.length) * 100) 
      : editingTask.progress;

    setEditingTask({
      ...editingTask,
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress >= 100 ? "COMPLETADO" : editingTask.status
    });
  };

  const handleModalDeleteSubtask = (subId) => {
    const updatedSubtasks = (editingTask.subtasks || []).filter((t) => t.id !== subId);
    
    let newProgress = editingTask.progress;
    if (updatedSubtasks.length > 0) {
      const completedCount = updatedSubtasks.filter((t) => t.completed).length;
      newProgress = Math.round((completedCount / updatedSubtasks.length) * 100);
    }

    setEditingTask({
      ...editingTask,
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newProgress >= 100 ? "COMPLETADO" : editingTask.status
    });
  };

  // --- EFECTO DE BÚSQUEDA GLOBAL DE SUPABASE (DEBOUNCED) ---
  useEffect(() => {
    if (!taskSearch.trim()) {
      setGlobalTasks([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const { data, error } = await supabase
          .from("personal_tasks")
          .select("*")
          .ilike("description", `%${taskSearch}%`)
          .order("month_key", { ascending: false });

        if (error) console.error(error);
        else {
          // Marcamos como backlog si su month_key es anterior al mes actual para que la UI lo reconozca
          const markedData = (data || []).map((t) => ({
            ...t,
            is_backlog: t.month_key < monthKey,
          }));
          setGlobalTasks(markedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [taskSearch, monthKey]);

  // --- HANDLERS BASE DE DATOS ---
  const handleSaveTask = async () => {
    if (!newTask.description) return;
    const { error } = await supabase
      .from("personal_tasks")
      .insert([{ ...newTask, month_key: monthKey }]);
    if (error) alert(error.message);
    else {
      setNewTask({ ...newTask, description: "" });
      onUpdate();
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("¿Eliminar actividad?")) return;
    await supabase.from("personal_tasks").delete().eq("id", id);
    onUpdate();
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await supabase.from("personal_categories").insert([{ name: newCategory }]);
    setNewCategory("");
    onUpdate();
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("¿Borrar categoría?")) return;
    await supabase.from("personal_categories").delete().eq("id", id);
    onUpdate();
  };

  const handleDropTask = async (e, targetWeek) => {
    e.preventDefault();
    // El id de Supabase es UUID (string) — NO parsear a número
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const draggedTask = tasks.find((t) => String(t.id) === String(taskId));
    if (!draggedTask) return;

    const updatePayload = { target_week: targetWeek };

    // Si la tarea tiene start_date, limpiarla para que target_week tome el mando
    // (evita que isTaskVisibleInWeek la siga posicionando según fechas antiguas)
    if (draggedTask.start_date) {
      updatePayload.start_date = null;
      updatePayload.end_date = null;
    }

    // Si es una tarea de backlog (de un mes anterior), al moverla la integramos al mes actual
    if (draggedTask.is_backlog || draggedTask.month_key < monthKey) {
      updatePayload.month_key = monthKey;
    }

    const { error } = await supabase
      .from("personal_tasks")
      .update(updatePayload)
      .eq("id", taskId); // UUID se pasa como string directamente

    if (error) {
      console.error("[handleDropTask] Error al mover tarea:", error);
      alert("Error al mover la tarea: " + error.message);
      return;
    }
    onUpdate();
  };

  const handleMoveTaskToWeek = async (taskId, targetWeek) => {
    const taskToMove = tasks.find((t) => String(t.id) === String(taskId));
    if (!taskToMove) return;

    const updatePayload = { target_week: targetWeek };

    // Si la tarea tiene start_date, limpiarla para que target_week tome el mando
    if (taskToMove.start_date) {
      updatePayload.start_date = null;
      updatePayload.end_date = null;
    }

    // Si es una tarea de backlog (de un mes anterior), al moverla la integramos al mes actual
    if (taskToMove.is_backlog || taskToMove.month_key < monthKey) {
      updatePayload.month_key = monthKey;
    }

    const { error } = await supabase
      .from("personal_tasks")
      .update(updatePayload)
      .eq("id", taskId);

    if (error) {
      console.error("[handleMoveTaskToWeek] Error al mover tarea:", error);
      alert("Error al mover la tarea: " + error.message);
      return;
    }
    onUpdate();
  };

  const handleQuickUpdate = async () => {
    const finalStatus =
      editingTask.progress >= 100 ? "COMPLETADO" : editingTask.status;

    const updatePayload = {
      description: editingTask.description,
      category: editingTask.category,
      priority: editingTask.priority,
      target_week: editingTask.target_week,
      start_date: editingTask.start_date || null,
      end_date: editingTask.end_date || null,
      estimated_hours: editingTask.estimated_hours || 0,
      progress: editingTask.progress || 0,
      status: finalStatus,
      subtasks: editingTask.subtasks || [],
      resource_link: editingTask.resource_link || "",
    };

    // Si era una tarea de backlog, la traemos al mes actual al actualizarla
    if (editingTask.is_backlog || editingTask.month_key < monthKey) {
      updatePayload.month_key = monthKey;
    }

    const { error } = await supabase
      .from("personal_tasks")
      .update(updatePayload)
      .eq("id", editingTask.id);

    if (error) {
      console.error("[handleQuickUpdate] Error al actualizar tarea:", error);
      alert("Error al actualizar la tarea: " + error.message);
      return;
    }
    setIsEditModalOpen(false);
    onUpdate();
  };

  // --- LÓGICA DE VISIBILIDAD ---
  // Filtra tareas por búsqueda (descripción o categoría)
  const matchesSearch = (task) => {
    if (!taskSearch.trim()) return true;
    const q = taskSearch.toLowerCase();
    return (
      task.description?.toLowerCase().includes(q) ||
      task.category?.toLowerCase().includes(q)
    );
  };

  // Calcula dinámicamente el rango de fechas que cubre una semana específica
  const getWeekDateRange = (weekNum, date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let firstDay = null;
    let lastDay = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const calcWeek = Math.ceil((d + firstDayOfMonth) / 7);
      if (calcWeek === weekNum) {
        if (firstDay === null) firstDay = d;
        lastDay = d;
      }
    }

    if (firstDay === null) return "";

    const monthName = date.toLocaleDateString("es-ES", { month: "short" });
    return `Del ${firstDay} al ${lastDay} de ${monthName}`;
  };

  const isTaskVisibleInWeek = (task, weekNum) => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentMonthDate = new Date(currentYear, currentMonth, 1);
    const viewingMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    // --- CASO 1: Tareas de Backlog NO redistribuidas aún ---
    // Si la tarea es de un mes anterior (backlog) y sigue teniendo su month_key antiguo (no reprogramado):
    // Se muestra en la Semana 1 por defecto para que el usuario pueda verla e ir distribuyéndola.
    if (task.month_key < viewingMonthKey && task.status !== "COMPLETADO") {
      return weekNum === 1;
    }

    // --- CASO 2: Tareas con Rango de Fechas Activo (Prioridad de Ejecución) ---
    // Si la tarea tiene fechas de ejecución establecidas:
    if (task.start_date) {
      const taskStart = new Date(task.start_date + "T12:00:00");
      const taskEnd = task.end_date
        ? new Date(task.end_date + "T12:00:00")
        : taskStart;

      // Si la tarea cruza el mes y la semana solicitada por rango de fechas:
      let loop = new Date(taskStart);
      if (loop < currentMonthDate) loop = new Date(currentMonthDate);

      const firstDayOfMonth = currentMonthDate.getDay();
      let matchesDateRange = false;

      while (loop <= taskEnd) {
        if (
          loop.getMonth() === currentMonth &&
          loop.getFullYear() === currentYear
        ) {
          const calcWeek = Math.ceil((loop.getDate() + firstDayOfMonth) / 7);
          if (calcWeek === weekNum) {
            matchesDateRange = true;
            break;
          }
        } else {
          if (loop > currentMonthDate) break;
        }
        loop.setDate(loop.getDate() + 1);
      }

      if (matchesDateRange) return true;
    }

    // --- CASO 3: Planificación Semanal por target_week ---
    // Si la tarea tiene un target_week asignado:
    if (task.target_week !== null && task.target_week !== undefined && task.target_week !== "") {
      const tw = parseInt(task.target_week);
      if (!isNaN(tw)) {
        return tw === weekNum;
      }
    }

    // --- CASO 4: Por defecto ---
    return weekNum === 1;
  };

  const getPriorityColor = (p) =>
    p === 1
      ? "bg-red-100 text-red-700"
      : p === 2
        ? "bg-orange-100 text-orange-700"
        : "bg-blue-100 text-blue-700";

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortOrder === "PRIORITY") return a.priority - b.priority;
    if (sortOrder === "STATUS")
      return (
        (a.status === "COMPLETADO" ? 1 : 0) -
        (b.status === "COMPLETADO" ? 1 : 0)
      );
    return 0;
  });

  // --- COPIAR RESUMEN SEMANAL ---
  const handleCopySummary = async () => {
    const weekTasks = tasks.filter((t) =>
      isTaskVisibleInWeek(t, parseInt(summaryOptions.week)),
    );
    const tableRows = weekTasks
      .map(
        (t) =>
          `<tr style="height:30px;"><td style="border:1px solid #000;padding:8px;font-family:Arial;">${t.description}</td><td style="border:1px solid #000;padding:8px;font-family:Arial;"></td></tr>`,
      )
      .join("");
    const htmlContent = `<html><body><p style="font-family:Arial;font-weight:bold;">Area Comunicaciones - ACTIVIDADES SEMANALES ${summaryOptions.week}</p><table style="width:100%;border-collapse:collapse;border:1px solid #000;"><thead><tr style="background:#f3f4f6;"><th style="border:1px solid #000;padding:8px;font-family:Arial;">ACTIVIDADES</th><th style="border:1px solid #000;padding:8px;width:200px;font-family:Arial;">PRODUCTO</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob(["Copiado"], { type: "text/plain" }),
        }),
      ]);
      alert("✅ Tabla copiada.");
      setIsSummaryModalOpen(false);
    } catch (err) {
      alert("Error copiando.");
    }
  };

  // --- COPIAR REPORTE MENSUAL (NUEVO) ---
  const handleCopyMonthlyReport = async () => {
    const tableRows = sortedTasks
      .map(
        (t) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;">${t.description}</td>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;">${t.category}</td>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;text-align:center;">${t.target_week}</td>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;text-align:center;">P${t.priority}</td>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;">${t.status}</td>
        <td style="border:1px solid #ddd;padding:8px;font-family:Arial;text-align:right;">${t.progress}%</td>
      </tr>
    `,
      )
      .join("");

    const htmlContent = `
      <html>
      <body>
        <h2 style="font-family:Arial;">Reporte Mensual de Actividades</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="border:1px solid #000;padding:8px;text-align:left;font-family:Arial;">Actividad</th>
              <th style="border:1px solid #000;padding:8px;text-align:left;font-family:Arial;">Categoría</th>
              <th style="border:1px solid #000;padding:8px;font-family:Arial;">Sem.</th>
              <th style="border:1px solid #000;padding:8px;font-family:Arial;">Prio.</th>
              <th style="border:1px solid #000;padding:8px;text-align:left;font-family:Arial;">Estado</th>
              <th style="border:1px solid #000;padding:8px;text-align:right;font-family:Arial;">%</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob(["Reporte Copiado"], { type: "text/plain" }),
        }),
      ]);
      alert(
        "✅ Reporte Mensual copiado al portapapeles. Pega en Docs o Excel.",
      );
    } catch (err) {
      alert("Error al copiar el reporte.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. FORMULARIO NUEVA ACTIVIDAD */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <Plus className="text-brand" size={28} /> Nueva Actividad
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Printer size={14} /> Resumen
            </button>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            >
              <Settings size={14} /> Categorías
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 md:col-span-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Descripción
            </label>
            <input
              type="text"
              className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all border-2 border-transparent focus:border-brand"
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              placeholder="Ej: Redactar informe..."
            />
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Categoría
            </label>
            <select
              className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none uppercase text-gray-600"
              value={newTask.category}
              onChange={(e) =>
                setNewTask({ ...newTask, category: e.target.value })
              }
            >
              <option value="">-- --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Semana
            </label>
            <select
              className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none uppercase text-gray-600"
              value={newTask.target_week}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  target_week: parseInt(e.target.value),
                })
              }
            >
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Prioridad
            </label>
            <div className="flex bg-gray-50 p-1 rounded-2xl">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setNewTask({ ...newTask, priority: p })}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${newTask.priority === p ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <button
              onClick={handleSaveTask}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* BUSCADOR DE TAREAS */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Buscar tarea por descripción o categoría..."
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-brand rounded-2xl text-sm font-bold outline-none transition-all shadow-sm"
        />
        {taskSearch && (
          <button
            onClick={() => setTaskSearch("")}
            className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-300 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 2. COLUMNAS SEMANALES (MEJORADO: Adaptable + Espaciado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
          const visibleTasks = tasks.filter((t) => isTaskVisibleInWeek(t, week) && matchesSearch(t));
          return (
          <div
            key={week}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropTask(e, week)}
            className="min-w-[250px] bg-white p-4 rounded-[24px] border-2 border-dashed border-gray-100 hover:border-brand/20 shadow-sm flex flex-col h-full transition-colors"
          >
            <div className="flex flex-col mb-3 border-b border-gray-50 pb-2">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                  Semana {week}
                </h4>
                <span className="bg-gray-50 text-gray-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                  {visibleTasks.length}
                </span>
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-wider">
                {getWeekDateRange(week, currentDate)}
              </p>
            </div>
            <div className="space-y-2 flex-1 min-h-[100px]">
              {visibleTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("taskId", task.id)
                    }
                    className={`group flex flex-col p-2.5 rounded-xl hover:bg-white hover:shadow-md cursor-grab active:cursor-grabbing transition-all border hover:border-gray-200 relative ${
                      task.is_backlog
                        ? "bg-amber-50/60 border-amber-200/60"
                        : "bg-gray-50/50 border-transparent"
                    }`}
                  >
                    {/* Fila Superior: Contenido y Acciones (Editar/Borrar) */}
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1 pr-2">
                        <div className="flex gap-2 mb-1 justify-between">
                          <div className="flex gap-1 items-center">
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border ${getPriorityColor(task.priority)}`}
                            >
                              P{task.priority}
                            </span>
                            {task.is_backlog && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border bg-amber-100 border-amber-200 text-amber-700">
                                Anterior
                              </span>
                            )}
                          </div>
                          <ArrowUpDown
                            size={12}
                            className="text-gray-300 opacity-0 group-hover:opacity-100"
                          />
                        </div>
                        <p
                          className={`text-xs font-bold leading-snug ${task.status === "COMPLETADO" ? "text-gray-300 line-through" : "text-gray-700"}`}
                        >
                          {task.description}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white/90 p-1 rounded shadow-sm">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setIsEditModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Fila Inferior: Selector Rápido de Semana (Siempre visible y táctil) */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100/70 flex items-center justify-between w-full">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                        Mover a:
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: totalWeeks }, (_, wIdx) => wIdx + 1).map((wNum) => {
                          // Se marca como activa si la tarea es visible en esta semana (ya sea por target_week o por sus fechas reales)
                          const isActive = isTaskVisibleInWeek(task, wNum);
                          return (
                            <button
                              key={wNum}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleMoveTaskToWeek(task.id, wNum);
                              }}
                              className={`w-5 h-5 rounded-md text-[9px] font-black transition-all cursor-pointer flex items-center justify-center ${
                                isActive
                                  ? "bg-brand text-white shadow-sm"
                                  : "bg-gray-100/80 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                              }`}
                              title={`Mover a Semana ${wNum}`}
                            >
                              {wNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              {visibleTasks.length === 0 && (
                  <div className="text-center py-8 opacity-30">
                    <Layout size={20} className="mx-auto mb-1 text-gray-300" />
                    <p className="text-[8px] font-black uppercase text-gray-400">
                      {taskSearch ? "Sin resultados" : "Vacío"}
                    </p>
                  </div>
                )}
            </div>
          </div>
          );
        })}
      </div>

      {/* LISTA RESUMEN */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <List className="text-brand" size={24} /> 
            {taskSearch.trim() ? "Buscador Global de Actividades" : "Resumen del Mes"}
            {taskSearch.trim() && isSearchingGlobal && (
              <span className="text-xs font-bold text-gray-400 normal-case animate-pulse ml-1">
                (Buscando...)
              </span>
            )}
          </h3>

          <div className="flex gap-2">
            {/* BOTÓN EXPORTAR REPORTE */}
            <button
              onClick={handleCopyMonthlyReport}
              className="flex items-center gap-2 text-xs font-bold uppercase bg-brand/10 text-brand px-4 py-2 rounded-xl hover:bg-brand/20 transition-colors border border-brand/20 cursor-pointer"
            >
              <FileDown size={14} /> Exportar Reporte
            </button>

            <button
              onClick={() =>
                setSortOrder((prev) =>
                  prev === "PRIORITY" ? "STATUS" : "PRIORITY",
                )
              }
              className="flex items-center gap-2 text-xs font-bold uppercase bg-gray-50 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <ArrowUpDown size={14} /> Ordenar: {sortOrder}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="pb-4 pl-4">Actividad</th>
                <th className="pb-4 pl-2">Mes</th>
                <th className="pb-4">Categoría</th>
                <th className="pb-4">Semana</th>
                <th className="pb-4">Prioridad</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right">Progreso</th>
                <th className="pb-4 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(taskSearch.trim() ? globalTasks : sortedTasks).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="py-4 pl-4 font-bold text-gray-700">
                    {t.description}
                  </td>
                  <td className="py-4 pl-2 text-xs font-semibold text-brand/70 uppercase">
                    {t.month_key}
                  </td>
                  <td className="py-4">
                    <span className="text-[10px] bg-gray-100 px-2 py-1 rounded border border-gray-200 uppercase font-bold text-gray-500">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-4 text-xs font-medium text-gray-500">
                    Semana {t.target_week}
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-[9px] font-black px-2 py-1 rounded uppercase border ${getPriorityColor(t.priority)}`}
                    >
                      P{t.priority}
                    </span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-[10px] font-black uppercase ${t.status === "COMPLETADO" ? "text-emerald-500" : "text-blue-500"}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.status === "COMPLETADO" ? "bg-emerald-500" : "bg-brand"}`}
                          style={{ width: `${t.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-black text-gray-400">
                        {t.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingTask({
                            ...t,
                            subtasks: t.subtasks || []
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-500 p-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar tarea"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(taskSearch.trim() ? globalTasks : sortedTasks).length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center opacity-30 italic text-xs font-bold text-gray-400 uppercase">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALES (NO CAMBIAN) --- */}
      {/* (MODAL EDITAR) */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-5xl w-full animate-in zoom-in-95 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Gestionar Actividad Completa
                </h3>
                <p className="text-xs font-bold text-brand uppercase tracking-wider">
                  Edición Unificada: Planificación + Ejecución
                </p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* COLUMNA IZQUIERDA: Planificación y Subtareas */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Descripción de la Actividad
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 p-3.5 rounded-xl text-sm font-bold outline-none border focus:border-brand text-gray-800"
                    value={editingTask.description}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Categoría
                    </label>
                    <select
                      className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand uppercase text-gray-600"
                      value={editingTask.category}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          category: e.target.value,
                        })
                      }
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Semana Planificada
                    </label>
                    <select
                      className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand text-gray-600"
                      value={editingTask.target_week}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          target_week: parseInt(e.target.value),
                        })
                      }
                    >
                      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
                        (w) => (
                          <option key={w} value={w}>
                            Semana {w}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Prioridad
                    </label>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      {[1, 2, 3].map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setEditingTask({ ...editingTask, priority: p })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${editingTask.priority === p ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}
                        >
                          P{p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FECHAS Y TIEMPO (EJECUCIÓN) */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/70 space-y-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Fechas y Tiempos de Ejecución
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">
                        Inicio
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none text-gray-600"
                        value={editingTask.start_date || ""}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            start_date: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">
                        Fin
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none text-gray-600"
                        value={editingTask.end_date || ""}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            end_date: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">
                        Minutos Estimados
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white p-2 rounded-lg text-xs border border-gray-200 outline-none text-gray-600"
                        value={editingTask.estimated_hours || 0}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            estimated_hours: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* PASOS / SUBTAREAS */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/70 space-y-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Pasos de Ejecución ({ (editingTask.subtasks || []).length })
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {(editingTask.subtasks || []).map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100"
                      >
                        <button
                          onClick={() => handleModalToggleSubtask(i.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${i.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-gray-50 text-transparent"}`}
                        >
                          <Check size={10} strokeWidth={4} />
                        </button>
                        <div className="flex flex-col flex-1 truncate">
                          <span
                            className={`text-xs font-semibold truncate ${i.completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {i.text}
                          </span>
                        </div>
                        <button
                          onClick={() => handleModalDeleteSubtask(i.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {(editingTask.subtasks || []).length === 0 && (
                      <p className="text-[10px] italic text-gray-400 text-center py-2">
                        Sin subtareas agregadas.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+ Agregar nuevo paso de trabajo..."
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none text-gray-700"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleModalAddSubtask()}
                    />
                    <button
                      onClick={handleModalAddSubtask}
                      className="bg-brand text-white px-4 rounded-xl text-xs font-black uppercase hover:bg-black transition-colors cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: Enlaces, Preview y Control de Progreso */}
              <div className="flex flex-col justify-between space-y-4">
                {/* LINK Y PREVIEW */}
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                    Enlace de Entregable / Recurso
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-xs outline-none focus:bg-white focus:border-brand"
                      placeholder="Ej: https://docs.google.com/..."
                      value={editingTask.resource_link || ""}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          resource_link: e.target.value,
                        })
                      }
                    />
                    {editingTask.resource_link && (
                      <a
                        href={editingTask.resource_link}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {editingTask.resource_link &&
                    editingTask.resource_link.includes("docs.google.com") ? (
                    <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-inner relative min-h-[220px] h-60">
                      <iframe
                        src={getEmbedUrl(editingTask.resource_link)}
                        className="w-full h-full"
                        frameBorder="0"
                        title="Preview de Documento"
                      ></iframe>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-gray-300 text-[10px] min-h-[220px] h-60 gap-1">
                      <Layout size={24} />
                      <span>Sin Preview del Documento</span>
                    </div>
                  )}
                </div>

                {/* CONTROL DE AVANCE Y ESTADO */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Progreso de la Actividad
                    </span>
                    <span className="text-brand font-black text-3xl">
                      {editingTask.progress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full h-2.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand"
                    value={editingTask.progress}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        progress: parseInt(e.target.value),
                        status: parseInt(e.target.value) >= 100 ? "COMPLETADO" : editingTask.status
                      })
                    }
                  />

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() =>
                        setEditingTask({
                          ...editingTask,
                          status: "COMPLETADO",
                          progress: 100,
                        })
                      }
                      className={`py-3 rounded-xl text-xs font-bold uppercase border transition-all flex items-center justify-center gap-2 cursor-pointer ${editingTask.status === "COMPLETADO" ? "bg-emerald-50 text-emerald-600 border-emerald-200 font-black" : "bg-white text-gray-400 border-gray-200 hover:border-emerald-200 hover:text-emerald-500"}`}
                    >
                      <CheckCircle2 size={16} /> Completada
                    </button>
                    <button
                      onClick={handleQuickUpdate}
                      className="bg-brand text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-md transition-all cursor-pointer flex items-center justify-center"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (MODAL CATEGORIAS) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase">
                Categorías
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva..."
                  className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <span className="text-xs font-bold text-gray-600 uppercase">
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (MODAL RESUMEN SEMANAL) */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-2xl w-full border border-gray-100 relative">
            <button
              onClick={() => setIsSummaryModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                <ClipboardCopy size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Generador de Resumen
                </h2>
                <p className="text-sm font-bold text-gray-400">
                  Exporta tus actividades para Docs (Según Planificación)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">
                  Año
                </label>
                <input
                  type="number"
                  className="w-full bg-gray-50 p-4 rounded-2xl text-lg font-bold text-center"
                  value={summaryOptions.year}
                  onChange={(e) =>
                    setSummaryOptions({
                      ...summaryOptions,
                      year: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">
                  Mes
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="w-full bg-gray-50 p-4 rounded-2xl text-lg font-bold text-center"
                  value={summaryOptions.month}
                  onChange={(e) =>
                    setSummaryOptions({
                      ...summaryOptions,
                      month: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">
                  Semana
                </label>
                <select
                  className="w-full bg-gray-50 p-4 rounded-2xl text-lg font-bold text-center outline-none uppercase"
                  value={summaryOptions.week}
                  onChange={(e) =>
                    setSummaryOptions({
                      ...summaryOptions,
                      week: parseInt(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
                    (w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">
                Vista Previa
              </h4>
              <div className="font-sans text-sm text-gray-800 space-y-4">
                <p className="font-bold">
                  Area Comunicaciones - ACTIVIDADES SEMANALES{" "}
                  {summaryOptions.week}
                </p>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="grid grid-cols-12 bg-gray-200 p-2 font-bold text-xs border-b border-gray-300">
                    <div className="col-span-8">ACTIVIDADES</div>
                    <div className="col-span-4 border-l border-gray-300 pl-2">
                      PRODUCTO
                    </div>
                  </div>
                  {tasks
                    .filter((t) =>
                      isTaskVisibleInWeek(t, parseInt(summaryOptions.week)),
                    )
                    .map((t) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-12 p-2 border-b border-gray-200 text-xs last:border-0 bg-white"
                      >
                        <div className="col-span-8 pr-2">{t.description}</div>
                        <div className="col-span-4 border-l border-gray-200 pl-2 min-h-[20px]"></div>
                      </div>
                    ))}
                  {tasks.filter((t) =>
                    isTaskVisibleInWeek(t, parseInt(summaryOptions.week)),
                  ).length === 0 && (
                      <div className="p-4 text-center text-gray-400 italic text-xs">
                        No hay actividades para esta semana.
                      </div>
                    )}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopySummary}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black flex items-center justify-center gap-3"
            >
              <ClipboardCopy size={20} /> Copiar al Portapapeles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
