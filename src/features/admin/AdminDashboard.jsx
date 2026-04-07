/**
 * COMPONENTE: AdminDashboard (Mi Administración)
 * -------------------------------------------
 * Este es el sistema de gestión personal y de productividad para el equipo administrativo.
 * Funciona bajo un esquema de "Foco Mensual", permitiendo planificar, ejecutar y reportar
 * actividades vinculadas a una clave de mes (monthKey).
 * 
 * ESTRUCTURA DE DATOS:
 * - Tareas (personal_tasks): Incluye tareas del mes y tareas arrastradas del pasado (Backlog).
 * - Notas Diarias (personal_daily_logs_data): Registro cronológico de actividades.
 * - Reflexiones (personal_reflections): Resumen de logros y aprendizajes del mes.
 * 
 * ARQUITECTURA:
 * - Filtro Maestro: monthKey determina qué datos se muestran.
 * - Navegación: Tres pestañas principales (Plan, Ejecución, Cierre) que subdividen el flujo de trabajo.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  BrainCircuit,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Calendar,
  Trophy,
} from "lucide-react";
import PlanningTab from "../../components/tabs/PlanningTab";
import ExecutionTab from "../../components/tabs/ExecutionTab";
import ReportTab from "../../components/tabs/ReportTab";
import DailyPlanningModal from "../../components/modals/DailyPlanningModal";

/**
 * COMPONENTE: AdminDashboard (Mi Administración)
 * -------------------------------------------
 * Este es un sistema de gestión personal y de productividad para el equipo administrativo.
 * Funciona bajo un esquema de "Foco Mensual", permitiendo planificar, ejecutar y reportar
 * actividades vinculadas a una clave de mes (monthKey).
 * 
 * ESTRUCTURA DE DATOS:
 * - Tareas (personal_tasks): Incluye tareas del mes y tareas arrastradas del pasado (Backlog).
 * - Notas Diarias (personal_daily_logs_data): Registro cronológico de actividades.
 * - Reflexiones (personal_reflections): Resumen de logros y aprendizajes del mes.
 * */
export default function AdminDashboard() {
  // --- ESTADOS DE CONTROL TEMPORAL ---
  const [currentDate, setCurrentDate] = useState(new Date());

  // Clave del mes actual (Formato YYYY-MM) usada como filtro maestro en todas las queries.
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  // --- ESTADOS DE DATOS ---
  const [tasks, setTasks] = useState([]); // Combinación de tareas actuales y pendientes ancestrales
  const [categories, setCategories] = useState([]); // Categorías de organización personal
  const [monthlyNotes, setMonthlyNotes] = useState([]); // Bitácora diaria
  const [reflections, setReflections] = useState({
    achievements: "",
    difficulties: "",
    learnings: "",
  });

  const [activeTab, setActiveTab] = useState("plan"); // Pestaña activa: Plan | Ejecución | Cierre
  const [loading, setLoading] = useState(true);

  // --- ESTADO MODAL DIARIO ---
  const [isDailyPlanOpen, setIsDailyPlanOpen] = useState(false);

  // Recarga automática cada vez que el usuario cambia de mes en la interfaz.
  useEffect(() => {
    fetchData();
    checkDailyPlan();
  }, [monthKey]);

  /**
   * checkDailyPlan: Determina si el usuario ya realizó su planificación diaria.
   */
  const checkDailyPlan = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const alreadyDone = localStorage.getItem(`daily_plan_${todayStr}`);

    // Si no lo ha hecho hoy y estamos en el mes actual, abrimos el modal
    const now = new Date();
    const realCurrentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (!alreadyDone && monthKey === realCurrentMonthKey) {
      // Pequeño delay para que no aparezca tan brusco al cargar
      setTimeout(() => setIsDailyPlanOpen(true), 1000);
    }
  };

  /**
   * toLocalISOString: Utility para manejar fechas en formato YYYY-MM-DD sin problemas de zona horaria.
   */
  const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().split("T")[0];
  };

  /**
   * getWeeksInMonth: Calcula cuántas semanas visuales existen en el mes seleccionado.
   * Útil para renderizar el calendario de planificación.
   */
  const getWeeksInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  };

  const totalWeeks = getWeeksInMonth(currentDate);

  /**
   * fetchData: Obtiene toda la información del ecosistema de administración personal.
   */
  async function fetchData() {
    setLoading(true);
    try {
      // 1. Cargamos catálogo de categorías personales (Ej: Legal, Operaciones, etc)
      const { data: catData } = await supabase
        .from("personal_categories")
        .select("*")
        .order("name", { ascending: true });

      // 2. Reflexiones del mes: Nos permiten medir el crecimiento personal.
      const { data: refData } = await supabase
        .from("personal_reflections")
        .select("*")
        .eq("month_key", monthKey)
        .maybeSingle();

      // Rango de fechas para traer la bitácora del mes seleccionado.
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: notesData } = await supabase
        .from("personal_daily_logs_data")
        .select("*")
        .gte("date", toLocalISOString(startOfMonth))
        .lte("date", toLocalISOString(endOfMonth))
        .order("date", { ascending: true });

      // 3. SISTEMA DE TAREAS Y BACKLOG
      // Obtenemos tareas asignadas específicamente a este mes.
      const { data: currentTasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("month_key", monthKey)
        .order("priority", { ascending: true });

      /**
       * Tareas por rango de ejecución:
       * Incluimos tareas cuyo periodo (start_date/end_date) cruza el mes visualizado,
       * aunque su month_key sea de otro mes. Esto permite que actividades de larga
       * duración (ej: enero-marzo) se vean en todos los meses que abarcan.
       */
      const { data: spanningTasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .lte("start_date", toLocalISOString(endOfMonth))
        .or(
          `end_date.gte.${toLocalISOString(startOfMonth)},and(end_date.is.null,start_date.gte.${toLocalISOString(startOfMonth)})`,
        );

      // LÓGICA DE BACKLOG REAL:
      // Buscamos tareas de meses pasados que aún NO tengan status 'COMPLETADO'.
      // Esto garantiza que nada se quede en el olvido.
      const { data: backlogTasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .lt("month_key", monthKey)
        .neq("status", "COMPLETADO");

      // Marcamos visualmente las tareas de arrastre para diferenciarlas en la UI.
      const cleanBacklog = (backlogTasks || []).map((t) => ({
        ...t,
        is_backlog: true,
      }));

      // Unimos y deduplicamos por id para evitar repeticiones entre fuentes.
      const taskMap = new Map();
      [...(currentTasks || []), ...(spanningTasks || []), ...cleanBacklog].forEach(
        (t) => {
          const existing = taskMap.get(t.id);
          taskMap.set(t.id, existing ? { ...existing, ...t } : t);
        },
      );
      const allTasks = Array.from(taskMap.values());

      setTasks(allTasks);
      setCategories(catData || []);
      setMonthlyNotes(notesData || []);
      setReflections(
        refData || { achievements: "", difficulties: "", learnings: "" },
      );
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Cambia el mes actual hacia adelante o atrás.
   */
  const changeMonth = (d) => {
    const n = new Date(currentDate);
    n.setMonth(n.getMonth() + d);
    setCurrentDate(n);
  };

  const backlogCount = tasks.filter((t) => t.is_backlog).length;

  // Lógica para badge de "Pasado" (Solo visual, para PlanningTab)
  const now = new Date();
  const realCurrentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isPastMonth = monthKey < realCurrentMonthKey;

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xs font-black uppercase text-brand">
        Cargando Estudio...
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <BrainCircuit className="text-brand" size={24} md:size={32} /> Mi Administración
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-brand font-bold text-sm md:text-lg italic">
              Gestión & Productividad
            </p>
            {backlogCount > 0 && (
              <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1 animate-pulse">
                <AlertCircle size={12} /> {backlogCount} Pendientes Antiguos
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black w-32 text-center uppercase tracking-widest">
              {currentDate.toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setIsDailyPlanOpen(true)}
            className="bg-brand/10 text-brand px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/20 transition-all border border-brand/20 flex items-center gap-2"
          >
            <Calendar size={14} /> Planificar Día
          </button>

          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
            {[
              { id: "plan", label: "Plan", icon: CheckSquare },
              { id: "execute", label: "Ejecución", icon: Calendar },
              { id: "report", label: "Cierre", icon: Trophy },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
              >
                <tab.icon size={12} md:size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {activeTab === "plan" && (
            <PlanningTab
              tasks={tasks}
              categories={categories}
              currentDate={currentDate}
              monthKey={monthKey}
              onUpdate={fetchData}
              isPastMonth={isPastMonth}
              totalWeeks={totalWeeks}
            />
          )}

          {activeTab === "execute" && (
            <ExecutionTab
              tasks={tasks}
              monthlyNotes={monthlyNotes}
              currentDate={currentDate}
              onUpdate={fetchData}
            />
          )}

          {activeTab === "report" && (
            <ReportTab
              tasks={tasks}
              reflections={reflections}
              monthKey={monthKey}
              currentDate={currentDate}
              onUpdate={fetchData}
            />
          )}
        </div>
      </div>

      {/* MODAL DE PLANIFICACIÓN DIARIA */}
      <DailyPlanningModal
        isOpen={isDailyPlanOpen}
        onClose={() => setIsDailyPlanOpen(false)}
        tasks={tasks}
        currentDate={currentDate}
        onUpdate={fetchData}
      />
    </div>
  );
}
