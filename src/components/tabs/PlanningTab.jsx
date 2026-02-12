import { useState } from "react";
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
} from "lucide-react";

export default function PlanningTab({
  tasks,
  categories,
  monthKey,
  currentDate,
  onUpdate,
}) {
  // --- ESTADOS LOCALES ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [sortOrder, setSortOrder] = useState("PRIORITY");
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

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

  const totalWeeks = 5;

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
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    await supabase
      .from("personal_tasks")
      .update({ target_week: targetWeek, start_date: null, end_date: null })
      .eq("id", taskId);
    onUpdate();
  };

  const handleQuickUpdate = async () => {
    await supabase
      .from("personal_tasks")
      .update({
        description: editingTask.description,
        category: editingTask.category,
        priority: editingTask.priority,
        target_week: editingTask.target_week,
      })
      .eq("id", editingTask.id);
    setIsEditModalOpen(false);
    onUpdate();
  };

  // --- LÓGICA DE VISIBILIDAD ---
  const isTaskVisibleInWeek = (task, weekNum) => {
    if (!task.start_date) return parseInt(task.target_week) === weekNum;
    const taskStart = new Date(task.start_date + "T12:00:00");
    const taskEnd = task.end_date
      ? new Date(task.end_date + "T12:00:00")
      : taskStart;
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let loop = new Date(taskStart);
    while (loop <= taskEnd) {
      if (
        loop.getMonth() === currentMonth &&
        loop.getFullYear() === currentYear
      ) {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const day = loop.getDate();
        const calcWeek = Math.ceil((day + firstDayOfMonth) / 7);
        if (calcWeek === weekNum) return true;
      }
      loop.setDate(loop.getDate() + 1);
      if (loop.getDate() === 1 && loop.getMonth() !== currentMonth) break;
    }
    return false;
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
    const htmlContent = `<html><body><p style="font-family:Arial;font-weight:bold;">Area Comunicaciones - ACTIVIDADES SEMANALES ${summaryOptions.week}</p><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f3f4f6;"><th style="border:1px solid #000;padding:8px;font-family:Arial;">ACTIVIDADES</th><th style="border:1px solid #000;padding:8px;width:200px;font-family:Arial;">PRODUCTO</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
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
              {[1, 2, 3, 4, 5].map((w) => (
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

      {/* 2. COLUMNAS SEMANALES (MEJORADO: 3 Columnas + Compacto) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map((week) => (
          <div
            key={week}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropTask(e, week)}
            className="min-w-[250px] bg-white p-4 rounded-[24px] border-2 border-dashed border-gray-100 hover:border-brand/20 shadow-sm flex flex-col h-full transition-colors"
          >
            <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                Semana {week}
              </h4>
              <span className="bg-gray-50 text-gray-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                {tasks.filter((t) => isTaskVisibleInWeek(t, week)).length}
              </span>
            </div>
            <div className="space-y-2 flex-1 min-h-[100px]">
              {" "}
              {/* Space-y-2 para más compacto */}
              {tasks
                .filter((t) => isTaskVisibleInWeek(t, week))
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("taskId", task.id)
                    }
                    className="group flex justify-between items-center p-2.5 bg-gray-50/50 rounded-xl hover:bg-white hover:shadow-md cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-gray-200 relative"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex gap-2 mb-1 justify-between">
                        <div className="flex gap-1">
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border ${getPriorityColor(task.priority)}`}
                          >
                            P{task.priority}
                          </span>
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
                ))}
              {tasks.filter((t) => isTaskVisibleInWeek(t, week)).length ===
                0 && (
                <div className="text-center py-8 opacity-30">
                  <Layout size={20} className="mx-auto mb-1 text-gray-300" />
                  <p className="text-[8px] font-black uppercase text-gray-400">
                    Vacío
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* LISTA RESUMEN */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <List className="text-brand" size={24} /> Resumen del Mes
          </h3>

          <div className="flex gap-2">
            {/* BOTÓN EXPORTAR REPORTE (NUEVO) */}
            <button
              onClick={handleCopyMonthlyReport}
              className="flex items-center gap-2 text-xs font-bold uppercase bg-brand/10 text-brand px-4 py-2 rounded-xl hover:bg-brand/20 transition-colors border border-brand/20"
            >
              <FileDown size={14} /> Exportar Reporte
            </button>

            <button
              onClick={() =>
                setSortOrder((prev) =>
                  prev === "PRIORITY" ? "STATUS" : "PRIORITY",
                )
              }
              className="flex items-center gap-2 text-xs font-bold uppercase bg-gray-50 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
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
                <th className="pb-4">Categoría</th>
                <th className="pb-4">Semana</th>
                <th className="pb-4">Prioridad</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 pr-4 text-right">Progreso</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedTasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="py-4 pl-4 font-bold text-gray-700">
                    {t.description}
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
                  <td className="py-4 pr-4">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALES (NO CAMBIAN) --- */}
      {/* (MODAL EDITAR) */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase">
                Editar Tarea
              </h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <X className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Descripción
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border focus:border-brand"
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Categoría
                  </label>
                  <select
                    className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand uppercase"
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
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Prioridad
                  </label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    {[1, 2, 3].map((p) => (
                      <button
                        key={p}
                        onClick={() =>
                          setEditingTask({ ...editingTask, priority: p })
                        }
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${editingTask.priority === p ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Semana
                </label>
                <select
                  className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand"
                  value={editingTask.target_week}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      target_week: parseInt(e.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>
                      Semana {w}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleQuickUpdate}
                className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black mt-2"
              >
                Guardar Cambios
              </button>
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
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full bg-gray-50 p-4 rounded-2xl text-lg font-bold text-center"
                  value={summaryOptions.week}
                  onChange={(e) =>
                    setSummaryOptions({
                      ...summaryOptions,
                      week: e.target.value,
                    })
                  }
                />
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
