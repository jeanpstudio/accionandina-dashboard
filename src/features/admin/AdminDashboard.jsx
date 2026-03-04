import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Calendar,
  Trophy,
  AlertCircle,
} from "lucide-react";

import PlanningTab from "../../components/tabs/PlanningTab";
import ExecutionTab from "../../components/tabs/ExecutionTab";
import ReportTab from "../../components/tabs/ReportTab";

export default function AdminDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [monthlyNotes, setMonthlyNotes] = useState([]);
  const [reflections, setReflections] = useState({
    achievements: "",
    difficulties: "",
    learnings: "",
  });
  const [activeTab, setActiveTab] = useState("plan");
  const [loading, setLoading] = useState(true);

  // Clave del mes actual (YYYY-MM)
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    fetchData();
  }, [monthKey]);

  const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().split("T")[0];
  };

  const getWeeksInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sab)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  };

  const totalWeeks = getWeeksInMonth(currentDate);

  const fetchData = async () => {
    setLoading(true);
    try {
      // A. Categorías
      const { data: catData } = await supabase
        .from("personal_categories")
        .select("*")
        .order("name", { ascending: true });

      // B. Reflexiones y Notas
      const { data: refData } = await supabase
        .from("personal_reflections")
        .select("*")
        .eq("month_key", monthKey)
        .maybeSingle();
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      const { data: notesData } = await supabase
        .from("personal_daily_logs_data")
        .select("*")
        .gte("date", toLocalISOString(startOfMonth))
        .lte("date", toLocalISOString(endOfMonth))
        .order("date", { ascending: true });

      // C. TAREAS
      // 1. Tareas de ESTE mes
      const { data: currentTasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("month_key", monthKey)
        .order("priority", { ascending: true });

      // 2. Tareas del PASADO pendientes (Backlog REAL)
      // Ya confiamos en que las reuniones viejas están en status 'COMPLETADO' gracias al SQL fix
      const { data: backlogTasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .lt("month_key", monthKey)
        .neq("status", "COMPLETADO");

      // Marcamos visualmente el backlog
      const cleanBacklog = (backlogTasks || []).map((t) => ({
        ...t,
        is_backlog: true,
      }));

      // Unimos
      const allTasks = [...cleanBacklog, ...(currentTasks || [])];

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
  };

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
    </div>
  );
}
