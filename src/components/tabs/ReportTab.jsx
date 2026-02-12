import { useState } from "react";
import { supabase } from "../../app/supabase";
import {
  BookOpen,
  Trophy,
  AlertTriangle,
  BrainCircuit,
  Save,
  BarChart3,
  Layout,
  X,
  Play,
  CheckCircle2,
} from "lucide-react";

export default function ReportTab({
  tasks,
  reflections,
  monthKey,
  currentDate,
  onUpdate,
}) {
  const [localReflections, setLocalReflections] = useState(reflections);
  const [isSlideMode, setIsSlideMode] = useState(false);

  const handleSaveReflections = async () => {
    const { data: existing } = await supabase
      .from("personal_reflections")
      .select("id")
      .eq("month_key", monthKey)
      .maybeSingle();
    if (existing)
      await supabase
        .from("personal_reflections")
        .update(localReflections)
        .eq("id", existing.id);
    else
      await supabase
        .from("personal_reflections")
        .insert([{ ...localReflections, month_key: monthKey }]);
    alert("Guardado");
    onUpdate();
  };

  const completionRate = Math.round(
    (tasks.filter((t) => t.status === "COMPLETADO").length / tasks.length ||
      0) * 100,
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* COLUMNA 1: FORMULARIO DE REFLEXIÓN */}
        <div className="col-span-2 lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
              <BookOpen className="text-brand" size={28} /> Bitácora Mensual
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block flex items-center gap-2">
                  <Trophy size={14} /> Logros
                </label>
                <textarea
                  rows="4"
                  className="w-full bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-emerald-300 transition-all resize-none"
                  value={localReflections.achievements}
                  onChange={(e) =>
                    setLocalReflections({
                      ...localReflections,
                      achievements: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                  <AlertTriangle size={14} /> Dificultades
                </label>
                <textarea
                  rows="4"
                  className="w-full bg-red-50/30 border border-red-100 p-4 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-red-300 transition-all resize-none"
                  value={localReflections.difficulties}
                  onChange={(e) =>
                    setLocalReflections({
                      ...localReflections,
                      difficulties: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                  <BrainCircuit size={14} /> Aprendizajes
                </label>
                <textarea
                  rows="4"
                  className="w-full bg-blue-50/30 border border-blue-100 p-4 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:border-blue-300 transition-all resize-none"
                  value={localReflections.learnings}
                  onChange={(e) =>
                    setLocalReflections({
                      ...localReflections,
                      learnings: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <button
                onClick={handleSaveReflections}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: ESTADÍSTICAS */}
        <div className="col-span-2 lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col justify-between">
            <div>
              <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <BarChart3 className="text-brand" size={28} /> Estado del Mes
              </h3>
              <div className="bg-gray-50 p-6 rounded-3xl mb-8 border border-gray-100">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Progreso Global
                  </span>
                  <span className="text-3xl font-black text-gray-900">
                    {completionRate}%
                  </span>
                </div>
                <div className="h-4 w-full bg-white rounded-full overflow-hidden border border-gray-100">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-1000"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                  Pendientes Críticos
                </h4>
                <div className="space-y-3">
                  {tasks
                    .filter(
                      (t) => t.status !== "COMPLETADO" && t.priority === 1,
                    )
                    .slice(0, 5)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-4 border-l-4 border-red-500 bg-red-50/50 rounded-r-xl"
                      >
                        <span className="text-xs font-bold text-gray-800 truncate flex-1">
                          {t.description}
                        </span>
                        <span className="text-[9px] font-black text-red-500 bg-white px-2 py-1 rounded border border-red-100 uppercase tracking-wider">
                          Prioridad 1
                        </span>
                      </div>
                    ))}
                  {tasks.filter(
                    (t) => t.status !== "COMPLETADO" && t.priority === 1,
                  ).length === 0 && (
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                        ¡Sin pendientes urgentes!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-8 mt-8 border-t border-gray-100">
              <button
                onClick={() => setIsSlideMode(true)}
                className="w-full bg-brand text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
              >
                <Play size={20} fill="currentColor" /> Presentar Resultados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN RESTAURADA: LISTA DE TAREAS COMPLETADAS --- */}
      <div className="col-span-2 mt-4">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={28} /> Tareas
            Completadas
          </h3>
          {tasks.filter((t) => t.status === "COMPLETADO").length === 0 ? (
            <p className="text-gray-400 italic text-sm text-center py-4">
              Aún no has completado tareas este mes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-4 pl-4">Actividad</th>
                    <th className="pb-4">Categoría</th>
                    <th className="pb-4">Duración</th>
                    <th className="pb-4">Fecha Finalización</th>
                    <th className="pb-4 text-right pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {tasks
                    .filter((t) => t.status === "COMPLETADO")
                    .map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors"
                      >
                        <td className="py-4 pl-4 font-bold text-gray-700">
                          {t.description}
                        </td>
                        <td className="py-4">
                          <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded uppercase font-bold text-gray-500">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-4 font-mono text-xs text-gray-500">
                          {t.estimated_hours ? `${t.estimated_hours} min` : "-"}
                        </td>
                        <td className="py-4 font-mono text-xs text-gray-500">
                          {t.daily_logs?.length > 0
                            ? new Date(
                                t.daily_logs[t.daily_logs.length - 1].date,
                              ).toLocaleDateString()
                            : t.end_date
                              ? new Date(t.end_date).toLocaleDateString()
                              : "Manual"}
                        </td>
                        <td className="py-4 text-right pr-4">
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase">
                            100%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- MODO PRESENTACIÓN (SLIDE) --- */}
      {isSlideMode && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8 overflow-y-auto">
          <button
            onClick={() => setIsSlideMode(false)}
            className="fixed top-6 right-6 text-white/50 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
          <div className="max-w-5xl w-full space-y-16 print:space-y-0">
            {/* PORTADA */}
            <div className="aspect-video bg-white p-20 flex flex-col justify-center items-center text-center rounded-[40px] shadow-2xl print:break-after-page border-4 border-gray-100">
              <div className="p-6 bg-gray-50 rounded-3xl mb-8">
                <Layout size={80} className="text-brand" />
              </div>
              <h1 className="text-7xl font-black text-gray-900 uppercase tracking-tighter mb-6">
                Reporte Mensual
              </h1>
              <div className="px-8 py-3 bg-gray-900 text-white rounded-full">
                <p className="text-2xl font-bold uppercase tracking-[0.2em]">
                  {currentDate.toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            {/* LOGROS */}
            <div className="aspect-video bg-emerald-900 p-20 flex flex-col justify-center rounded-[40px] shadow-2xl print:break-after-page relative overflow-hidden text-white">
              <Trophy
                size={400}
                className="absolute -right-20 -bottom-20 text-white/5"
              />
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-12 flex items-center gap-4">
                <Trophy size={48} /> Logros
              </h2>
              <p className="text-3xl font-medium leading-relaxed whitespace-pre-wrap">
                {localReflections.achievements || "Sin registros."}
              </p>
            </div>
            {/* DIFICULTADES */}
            <div className="aspect-video bg-red-900 p-20 flex flex-col justify-center rounded-[40px] shadow-2xl print:break-after-page relative overflow-hidden text-white">
              <AlertTriangle
                size={400}
                className="absolute -right-20 -bottom-20 text-white/5"
              />
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-12 flex items-center gap-4">
                <AlertTriangle size={48} /> Dificultades
              </h2>
              <p className="text-3xl font-medium leading-relaxed whitespace-pre-wrap">
                {localReflections.difficulties || "Sin registros."}
              </p>
            </div>
            {/* APRENDIZAJES */}
            <div className="aspect-video bg-blue-900 p-20 flex flex-col justify-center rounded-[40px] shadow-2xl print:break-after-page relative overflow-hidden text-white">
              <BrainCircuit
                size={400}
                className="absolute -right-20 -bottom-20 text-white/5"
              />
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-12 flex items-center gap-4">
                <BrainCircuit size={48} /> Aprendizajes
              </h2>
              <p className="text-3xl font-medium leading-relaxed whitespace-pre-wrap">
                {localReflections.learnings || "Sin registros."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
