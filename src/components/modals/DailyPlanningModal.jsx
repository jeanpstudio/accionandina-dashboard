/**
 * COMPONENTE: DailyPlanningModal
 * ------------------------------
 * Cuestionario interactivo diario para transformar la planificación en ejecución.
 * 
 * OBJETIVO:
 * Que el usuario seleccione al inicio del día qué tareas de su lista semanal 
 * va a abordar hoy, permitiéndole detallar esfuerzos y subpasos de una vez.
 * 
 * LÓGICA:
 * 1. FILTRADO: Muestra tareas de la semana actual del mes o del backlog (pendientes).
 * 2. SELECCIÓN: El usuario marca las tareas "Para Hoy".
 * 3. EDICIÓN: Solo las seleccionadas despliegan campos de detalle (Minutos, Link, Subtareas).
 * 4. PERSISTENCIA: Actualiza 'start_date' y 'end_date' a la fecha actual en Supabase.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
    X,
    CheckCircle2,
    Clock,
    Link as LinkIcon,
    Plus,
    Trash2,
    BrainCircuit,
    Calendar,
    ChevronRight
} from "lucide-react";

export default function DailyPlanningModal({
    isOpen,
    onClose,
    tasks,
    currentDate,
    onUpdate
}) {
    // Clave de hoy en formato YYYY-MM-DD
    const todayStr = new Date().toISOString().split("T")[0];

    // --- ESTADOS LOCALES ---
    const [step, setStep] = useState(1); // 1: Selección | 2: Detalle
    const [selectedIds, setSelectedIds] = useState([]);
    const [taskDetails, setTaskDetails] = useState({}); // { id: { estimated_hours, resource_link, subtasks } }

    // Al abrir el modal, inicializamos los estados basados en las tareas del día (si ya existen)
    useEffect(() => {
        if (isOpen) {
            const todayTasks = tasks.filter(t => t.start_date === todayStr);
            const initialIds = todayTasks.map(t => t.id);
            setSelectedIds(initialIds);

            const initialDetails = {};
            todayTasks.forEach(t => {
                initialDetails[t.id] = {
                    estimated_hours: t.estimated_hours || 0,
                    resource_link: t.resource_link || "",
                    subtasks: t.subtasks || []
                };
            });
            setTaskDetails(initialDetails);
            setStep(1);
        }
    }, [isOpen, tasks, todayStr]);

    if (!isOpen) return null;

    // --- LÓGICA DE FILTRADO ---
    // Tareas de la semana actual o backlog que no están completadas
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const todayDate = new Date().getDate();
    const currentWeekNum = Math.ceil((todayDate + firstDayOfMonth) / 7);

    const availableTasks = tasks.filter(t => {
        if (t.status === "COMPLETADO") return false;
        // Si ya tiene fecha de hoy, la mostramos para editar
        if (t.start_date === todayStr) return true;
        // Backlog o semana actual
        return t.is_backlog || parseInt(t.target_week) === currentWeekNum;
    });

    // --- HANDLERS ---
    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
        if (!taskDetails[id]) {
            const task = tasks.find(t => t.id === id);
            setTaskDetails(prev => ({
                ...prev,
                [id]: {
                    estimated_hours: task?.estimated_hours || 0,
                    resource_link: task?.resource_link || "",
                    subtasks: task?.subtasks || []
                }
            }));
        }
    };

    const updateDetail = (id, field, value) => {
        setTaskDetails(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleAddSubtask = (taskId, text) => {
        if (!text.trim()) return;
        const newSubtask = { id: Date.now(), text, completed: false };
        setTaskDetails(prev => ({
            ...prev,
            [taskId]: {
                ...prev[taskId],
                subtasks: [...prev[taskId].subtasks, newSubtask]
            }
        }));
    };

    const handleRemoveSubtask = (taskId, subtaskId) => {
        setTaskDetails(prev => ({
            ...prev,
            [taskId]: {
                ...prev[taskId],
                subtasks: prev[taskId].subtasks.filter(s => s.id !== subtaskId)
            }
        }));
    };

    const handleSaveAll = async () => {
        try {
            // 1. Desmarcar tareas que estaban para hoy pero se deseleccionaron
            const todayTasks = tasks.filter(t => t.start_date === todayStr);
            const toRemove = todayTasks.filter(t => !selectedIds.includes(t.id));

            for (const t of toRemove) {
                await supabase
                    .from("personal_tasks")
                    .update({ start_date: null, end_date: null })
                    .eq("id", t.id);
            }

            // 2. Guardar/Actualizar seleccionadas
            for (const id of selectedIds) {
                const detail = taskDetails[id];
                await supabase
                    .from("personal_tasks")
                    .update({
                        start_date: todayStr,
                        end_date: todayStr,
                        estimated_hours: detail.estimated_hours,
                        resource_link: detail.resource_link,
                        subtasks: detail.subtasks,
                        status: "EN_PROGRESO"
                    })
                    .eq("id", id);
            }

            onUpdate();
            onClose();
            // Guardamos en localStorage que ya se completó hoy para evitar el auto-open
            localStorage.setItem(`daily_plan_${todayStr}`, "true");
        } catch (error) {
            console.error("Error guardando plan diario:", error);
            alert("Error al guardar el plan");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">

                {/* HEADER */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-brand/5 rounded-t-[40px]">
                    <div className="flex items-center gap-4">
                        <div className="bg-brand text-white p-3 rounded-2xl shadow-lg ring-4 ring-brand/10">
                            <BrainCircuit size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                                Planificación Diaria
                            </h2>
                            <p className="text-brand font-bold text-sm italic mt-1 uppercase tracking-widest">
                                {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 text-gray-400 transition-all shadow-sm"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* CONTENIDO INTERACTIVO */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                                <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                                    <Calendar size={20} /> ¿Qué vamos a lograr hoy?
                                </h3>
                                <p className="text-sm text-blue-700 font-medium">
                                    Selecciona las tareas de tu lista semanal o backlog que vas a atacar en esta jornada.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableTasks.length === 0 ? (
                                    <div className="col-span-2 py-12 text-center text-gray-400 italic">
                                        No hay tareas pendientes para esta semana ni en el backlog.
                                    </div>
                                ) : (
                                    availableTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleSelection(task.id)}
                                            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${selectedIds.includes(task.id)
                                                    ? "bg-brand/5 border-brand shadow-md"
                                                    : "bg-gray-50 border-transparent hover:border-gray-200"
                                                }`}
                                        >
                                            <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(task.id) ? "bg-brand border-brand text-white" : "border-gray-300 bg-white"
                                                }`}>
                                                {selectedIds.includes(task.id) && <CheckCircle2 size={14} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${task.priority === 1 ? "bg-red-50 text-red-500 border-red-100" : "bg-blue-50 text-blue-500 border-blue-100"
                                                        }`}>
                                                        P{task.priority}
                                                    </span>
                                                    {task.is_backlog && (
                                                        <span className="text-[8px] font-black bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded uppercase">Backlog</span>
                                                    )}
                                                </div>
                                                <p className={`font-bold text-sm leading-snug ${selectedIds.includes(task.id) ? "text-gray-900" : "text-gray-500"}`}>
                                                    {task.description}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1 font-medium">{task.category || 'Sin categoría'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight border-l-4 border-brand pl-4 flex items-center justify-between">
                                Detalles de las tareas seleccionadas
                                <span className="text-brand text-sm">{selectedIds.length} tareas</span>
                            </h3>

                            <div className="space-y-12">
                                {selectedIds.map(id => {
                                    const task = tasks.find(t => t.id === id);
                                    const detail = taskDetails[id] || {};
                                    return (
                                        <div key={id} className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 relative group">
                                            <h4 className="font-black text-gray-800 mb-6 flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-brand"></div>
                                                {task?.description}
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* IZQUIERDA: TIEMPO Y LINK */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                                                            Minutos Estimados
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <Clock size={18} className="text-brand" />
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                                                placeholder="0"
                                                                value={detail.estimated_hours || ""}
                                                                onChange={(e) => updateDetail(id, 'estimated_hours', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                                                            Recurso / Link (Drive/Docs)
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <LinkIcon size={18} className="text-brand" />
                                                            <input
                                                                type="url"
                                                                className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                                                placeholder="https://docs.google.com/..."
                                                                value={detail.resource_link || ""}
                                                                onChange={(e) => updateDetail(id, 'resource_link', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* DERECHA: SUBTAREAS */}
                                                <div className="bg-white p-5 rounded-3xl border border-gray-100">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                                        Subtareas / Pasos Críticos
                                                    </label>
                                                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                                        {detail.subtasks?.map(st => (
                                                            <div key={st.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl group/item">
                                                                <span className="text-xs font-semibold text-gray-700 truncate">{st.text}</span>
                                                                <button
                                                                    onClick={() => handleRemoveSubtask(id, st.id)}
                                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-xs outline-none focus:bg-white transition-all"
                                                            placeholder="+ Nuevo paso..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleAddSubtask(id, e.target.value);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACCIONES */}
                <div className="p-8 border-t border-gray-100 flex justify-between bg-white rounded-b-[40px]">
                    {step === 1 ? (
                        <>
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccionadas</span>
                                <span className="text-xl font-black text-brand">{selectedIds.length}</span>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                disabled={selectedIds.length === 0}
                                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${selectedIds.length > 0
                                        ? "bg-gray-900 text-white hover:bg-black hover:-translate-y-1 active:scale-95"
                                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    }`}
                            >
                                Siguiente <ChevronRight size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleSaveAll}
                                className="bg-brand text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black hover:shadow-xl transition-all shadow-lg hover:-translate-y-1 active:scale-95"
                            >
                                ¡Comenzar Jornada!
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
