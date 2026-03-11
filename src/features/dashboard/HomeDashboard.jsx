/**
 * COMPONENTE: HomeDashboard (Comando Central)
 * ------------------------------------------
 * Vista ejecutiva que consolida la salud operativa de toda la plataforma.
 * 
 * MÓDULOS CRÍTICOS:
 * 1. KPI TRACKER: Cálculo en tiempo real del % de ejecución global promediando 
 *    los reportes de todos los paisajes activos.
 * 2. AUDITORÍA INTELIGENTE: Algoritmo que detecta anomalías (Falta de cierres, 
 *    desvío en rendimiento/semáforo, ausencia de videos en cortes trimestrales).
 * 3. GESTIÓN AGIL: Quick-tasks y agenda integrada para la toma de acciones inmediatas.
 * 
 * SEGURIDAD & RBAC:
 * - Sincroniza permisos de edición basados en el rol del perfil de Supabase.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock,
  Video,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  FileQuestion,
  FileX,
  LayoutList,
  Activity,
  Plus,
  Loader2,
  BrainCircuit,
  Bell,
  Timer,
  Lock,
} from "lucide-react";

export default function HomeDashboard() {
  const [loading, setLoading] = useState(true);

  // --- SEGURIDAD: ESTADO DE LECTURA ---
  const [isReadOnly, setIsReadOnly] = useState(true);

  // Estados de datos
  const [stats, setStats] = useState({ videoProd: 0, globalExecution: 0 });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [alertPartners, setAlertPartners] = useState([]);
  const [myTasks, setMyTasks] = useState([]);

  // Estado para crear tarea rápida
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- HELPERS ---
  const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const getCurrentWeek = () => {
    const d = new Date();
    const date = d.getDate();
    return Math.ceil(date / 7);
  };

  const getMonthName = (idx) => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    return months[idx];
  };

  const getMonthIndex = (name) => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    return months.indexOf(name.toLowerCase().trim());
  };

  // --- CÁLCULO DE PORCENTAJE REAL ---
  const calculateProjectProgress = (project) => {
    if (!project.monthly_reports || project.monthly_reports.length === 0)
      return 0;

    const duration = project.season_duration_months || 12;
    const targetPhotos = project.monthly_photos_target || 10;
    const targetPosts = project.monthly_posts_target || 4;
    const maxMonthWeight = 100 / duration;

    let accumulatedPercent = 0;

    project.monthly_reports.forEach((r) => {
      const photoCompliance = Math.min(
        (parseInt(r.photo_count) || 0) / targetPhotos,
        1,
      );
      const postCompliance = Math.min(
        (parseInt(r.post_count) || 0) / targetPosts,
        1,
      );
      const monthlyGained =
        ((photoCompliance + postCompliance) / 2) * maxMonthWeight;
      accumulatedPercent += monthlyGained;
    });

    return parseFloat(accumulatedPercent.toFixed(1));
  };

  async function fetchDashboardData() {
    setLoading(true);

    // 1. VERIFICAR PERMISOS (SISTEMA PRO - GRANULAR)
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

        // REGLAS PRO:
        if (profile?.role === "admin") {
          canEdit = true;
        } else if (profile?.edit_summary === true) {
          canEdit = true;
        }
      }
      setIsReadOnly(!canEdit);
    } catch (e) {
      console.error("Error permisos:", e);
    }

    // --- CORRECCIÓN FECHA: MOSTRAR TODO EL MES ---
    const today = new Date();
    const offset = today.getTimezoneOffset();

    // Calcular el primer día del mes actual en hora local
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const localStartOfMonth = new Date(
      startOfMonth.getTime() - offset * 60 * 1000,
    );
    const filterDateStr = localStartOfMonth.toISOString().split("T")[0];

    // Para la auditoría, seguimos usando "hoy" a futuro
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    const todayStr = localToday.toISOString().split("T")[0];

    const currentYear = today.getFullYear();
    const currentMonthKey = getCurrentMonthKey();

    // MES ANTERIOR
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthName = getMonthName(prevDate.getMonth());
    const prevYear = prevDate.getFullYear();

    try {
      // 1. REUNIONES (CAMBIO: Desde inicio de mes)
      const { data: meetings } = await supabase
        .from("meetings")
        .select(`*, partners(name, logo_url)`)
        .gte("date", filterDateStr) // <--- AHORA TRAE TODO EL MES
        .order("date", { ascending: true })
        .limit(10); // Aumenté un poco el límite por si hay muchas

      // 2. PROYECTOS
      const { data: projects, error: errProj } = await supabase.from("projects")
        .select(`
            id, partner_id, name, status, start_date, season_duration_months,
            monthly_photos_target, monthly_posts_target,
            monthly_reports(id, report_month, report_year, videos, photo_count, post_count)
          `);

      if (errProj) {
        console.error("Error proyectos:", errProj);
        setLoading(false);
        return;
      }

      // 3. ESTADÍSTICAS
      let totalVideos = 0;
      let totalExecutionSum = 0;
      let activeProjsCount = 0;

      const safeProjects = projects || [];

      safeProjects.forEach((p) => {
        p.monthly_reports?.forEach((r) => {
          if (r.videos) totalVideos += r.videos.length;
        });

        const realPercent = calculateProjectProgress(p);
        p.calculated_percent = realPercent;

        if (p.status?.toLowerCase() === "activo") {
          totalExecutionSum += realPercent;
          activeProjsCount++;
        }
      });

      const avgExecution =
        activeProjsCount > 0
          ? Math.round(totalExecutionSum / activeProjsCount)
          : 0;

      // 4. AUDITORÍA INTELIGENTE
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, logo_url");

      // Para auditoría usamos todayStr (futuro)
      const { data: futureMeets } = await supabase
        .from("meetings")
        .select("partner_id, participants_list")
        .gte("date", todayStr);

      const partnersWithIssues = (partners || [])
        .map((p) => {
          const issues = [];
          const pProjects = safeProjects.filter(
            (proj) => proj.partner_id === p.id,
          );
          const hasProjects = pProjects.length > 0;
          const hasActiveProjects = pProjects.some(
            (proj) => proj.status?.toLowerCase() === "activo",
          );

          if (!hasProjects) {
            issues.push({
              type: "NO_PROJECT",
              text: "Sin proyectos asignados",
              severity: "info",
              scope: "Socio",
            });
          } else {
            pProjects.forEach((proj) => {
              if (proj.status?.toLowerCase() !== "activo") return;
              const projStart = proj.start_date
                ? new Date(proj.start_date)
                : null;

              // A. FALTA CIERRE MES ANTERIOR
              if (
                projStart &&
                projStart < new Date(today.getFullYear(), today.getMonth(), 0)
              ) {
                const hasPrevReport = proj.monthly_reports?.some(
                  (r) =>
                    r.report_month?.toLowerCase().trim() === prevMonthName &&
                    parseInt(r.report_year) === prevYear,
                );
                if (!hasPrevReport) {
                  issues.push({
                    type: "MISSING_REPORT",
                    text: `Falta Cierre: ${prevMonthName.toUpperCase()}`,
                    subtext: `Proyecto: ${proj.name}`,
                    project: proj.name,
                    severity: "critical",
                    projectId: proj.id,
                  });
                }
              }

              // B. SEMÁFORO DE ATRASO
              if (
                projStart &&
                proj.season_duration_months &&
                proj.monthly_reports?.length > 0
              ) {
                const sortedReports = [...proj.monthly_reports].sort((a, b) => {
                  const dateA = new Date(
                    parseInt(a.report_year),
                    getMonthIndex(a.report_month),
                    1,
                  );
                  const dateB = new Date(
                    parseInt(b.report_year),
                    getMonthIndex(b.report_month),
                    1,
                  );
                  return dateB - dateA;
                });
                const lastReport = sortedReports[0];
                const calculationDate = new Date(
                  parseInt(lastReport.report_year),
                  getMonthIndex(lastReport.report_month) + 1,
                  0,
                );
                const monthsPassedAtReport =
                  (calculationDate.getFullYear() - projStart.getFullYear()) *
                  12 +
                  (calculationDate.getMonth() - projStart.getMonth());

                if (monthsPassedAtReport > 0) {
                  let expectedPercent =
                    (monthsPassedAtReport / proj.season_duration_months) * 100;
                  if (expectedPercent > 100) expectedPercent = 100;
                  const actualPercent = proj.calculated_percent || 0;
                  const diff = expectedPercent - actualPercent;

                  if (diff >= 5) {
                    issues.push({
                      type: "LAGGING",
                      text: `Rendimiento CRÍTICO`,
                      subtext: `Va al ${actualPercent}%, debería ir al ${Math.round(expectedPercent)}%`,
                      project: proj.name,
                      severity: "critical",
                      projectId: proj.id,
                    });
                  } else if (diff > 2) {
                    issues.push({
                      type: "LAGGING",
                      text: `Rendimiento Bajo`,
                      subtext: `Va al ${actualPercent}%, debería ir al ${Math.round(expectedPercent)}%`,
                      project: proj.name,
                      severity: "warning",
                      projectId: proj.id,
                    });
                  }
                }
              }

              // C. PROYECTO INICIADO SIN REPORTES
              const hasAnyReport =
                proj.monthly_reports && proj.monthly_reports.length > 0;
              const daysSinceStart = projStart
                ? (today - projStart) / (1000 * 60 * 60 * 24)
                : 0;
              if (!hasAnyReport && daysSinceStart > 30) {
                issues.push({
                  type: "ZERO_PROGRESS",
                  text: "Sin reportes de inicio",
                  subtext: `Inició hace ${Math.round(daysSinceStart)} días`,
                  project: proj.name,
                  severity: "critical",
                  projectId: proj.id,
                });
              }

              // D. VIDEOS
              const uploadedVideos =
                proj.monthly_reports?.reduce(
                  (acc, r) => acc + (r.videos?.length || 0),
                  0,
                ) || 0;
              let expectedVideos = 0;
              let cutName = "";
              if (today > new Date(`${currentYear}-07-31`)) {
                expectedVideos = 1;
                cutName = "Julio";
              }
              if (today > new Date(`${currentYear}-10-31`)) {
                expectedVideos = 2;
                cutName = "Octubre";
              }
              if (today > new Date(`2026-03-31`)) {
                expectedVideos = 3;
                cutName = "Marzo '26";
              }

              if (expectedVideos > 0 && uploadedVideos < expectedVideos) {
                issues.push({
                  type: "DELAY",
                  text: `Falta Video (Corte ${cutName})`,
                  subtext: `Entregados: ${uploadedVideos}/${expectedVideos}`,
                  project: proj.name,
                  severity: "warning",
                  projectId: proj.id,
                });
              }
            });
          }

          // E. SIN REUNIONES
          const hasMeetings = futureMeets?.some(
            (m) =>
              m.partner_id === p.id ||
              m.participants_list?.some((part) => part.id === p.id),
          );
          if (hasActiveProjects && !hasMeetings) {
            issues.push({
              type: "GHOST",
              text: "Sin reuniones agendadas",
              severity: "info",
              scope: "Socio",
            });
          }

          let cardStatus = "good";
          if (issues.some((i) => i.severity === "critical"))
            cardStatus = "critical";
          else if (issues.some((i) => i.severity === "warning"))
            cardStatus = "warning";
          else if (issues.length > 0) cardStatus = "info";

          return { ...p, issues, cardStatus };
        })
        .filter((p) => p.issues.length > 0)
        .sort((a, b) => {
          const score = { critical: 3, warning: 2, info: 1, good: 0 };
          const diff = score[b.cardStatus] - score[a.cardStatus];
          if (diff !== 0) return diff;
          return b.issues.length - a.issues.length;
        });

      // 5. MIS TAREAS
      const { data: tasks } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("month_key", currentMonthKey)
        .neq("status", "COMPLETADO")
        .order("priority", { ascending: true })
        .limit(6);

      setStats({ videoProd: totalVideos, globalExecution: avgExecution });
      setUpcomingMeetings(meetings || []);
      setAlertPartners(partnersWithIssues || []);
      setMyTasks(tasks || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- CREAR TAREA (BLOQUEADO SI ES READONLY) ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (isReadOnly) return; // CANDADO

    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    const newTask = {
      description: newTaskTitle,
      month_key: getCurrentMonthKey(),
      target_week: getCurrentWeek(),
      category: "General",
      priority: 2,
      status: "PENDIENTE",
      progress: 0,
    };
    const { data, error } = await supabase
      .from("personal_tasks")
      .insert([newTask])
      .select()
      .single();
    if (!error && data) {
      setMyTasks([data, ...myTasks]);
      setNewTaskTitle("");
    }
    setAddingTask(false);
  };

  // --- COMPLETAR TAREA (BLOQUEADO SI ES READONLY) ---
  const completeTask = async (id) => {
    if (isReadOnly) return; // CANDADO
    setMyTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase
      .from("personal_tasks")
      .update({ status: "COMPLETADO", progress: 100 })
      .eq("id", id);
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case "MISSING_REPORT":
        return <Bell size={16} className="text-red-600 animate-pulse" />;
      case "NO_PROJECT":
        return <LayoutList size={16} className="text-gray-400" />;
      case "ZERO_PROGRESS":
        return <Activity size={16} className="text-red-500" />;
      case "LAGGING":
        return <Timer size={16} className="text-orange-500" />;
      case "DELAY":
        return <Video size={16} className="text-orange-500" />;
      case "GHOST":
        return <Users size={16} className="text-blue-400" />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xs font-black uppercase tracking-widest text-brand">
        Cargando Tablero...
      </div>
    );

  return (
    <div className="h-screen bg-gray-50/30 overflow-y-auto custom-scrollbar p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER & KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 flex flex-col justify-center">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">
              Panel de Control
            </h1>
            <p className="text-lg text-gray-500 font-medium flex items-center gap-2">
              Resumen operativo al{" "}
              <span className="text-brand font-bold">
                {new Date().toLocaleDateString()}
              </span>
              .
              {isReadOnly && (
                <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                  <Lock size={10} /> SOLO LECTURA
                </span>
              )}
            </p>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-around items-center relative overflow-hidden gap-4">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={80} />
            </div>
            <div className="text-center z-10">
              <span className="block text-3xl font-black text-brand">
                {stats.videoProd}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Videos Totales
              </span>
            </div>
            <div className="hidden sm:block h-10 w-px bg-gray-100 mx-4"></div>
            <div className="text-center z-10 border-t sm:border-t-0 border-gray-50 pt-4 sm:pt-0 w-full sm:w-auto">
              <div className="flex items-center justify-center gap-1">
                <span className="block text-3xl font-black text-gray-900">
                  {stats.globalExecution}%
                </span>
                <TrendingUp size={16} className="text-emerald-500 mb-1" />
              </div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Avance Global
              </span>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[500px]">
          {/* 1. AGENDA */}
          <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Calendar className="text-brand" size={20} /> Agenda Mensual
              </h2>
              <Link
                to="/meetings"
                className="text-[10px] font-black uppercase text-gray-300 hover:text-brand flex items-center gap-1 transition-colors"
              >
                Ver todo <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 relative z-10 pr-2">
              {upcomingMeetings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <Calendar size={32} className="mb-2 opacity-50" />
                  <p className="text-xs font-bold">Agenda libre este mes</p>
                </div>
              ) : (
                upcomingMeetings.map((meet) => (
                  <div
                    key={meet.id}
                    className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 cursor-default"
                  >
                    <div className="bg-blue-50 text-blue-700 w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-black">
                        {new Date(meet.date).getUTCDate()}
                      </span>
                      <span className="text-[8px] font-black uppercase">
                        {new Date(meet.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase leading-tight line-clamp-1">
                        {meet.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {meet.time?.slice(0, 5)}
                        </span>
                        {meet.partners && (
                          <span className="text-[9px] font-black text-brand bg-brand/5 px-1.5 py-0.5 rounded uppercase">
                            {meet.partners.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. TAREAS (SECCIÓN BLINDADA) */}
          <div className="flex flex-col gap-8">
            <div className="flex-1 bg-gray-900 p-6 md:p-8 rounded-[40px] shadow-lg flex flex-col relative overflow-hidden text-white group">
              <div className="flex justify-between items-center mb-6 z-10">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <CheckCircle className="text-emerald-400" size={20} /> Mis
                  Pendientes
                </h2>
                <Link
                  to="/admin"
                  className="text-[10px] font-black uppercase text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                >
                  Ir a Gestión <BrainCircuit size={12} />
                </Link>
              </div>
              <form onSubmit={handleAddTask} className="mb-4 relative z-20">
                <div
                  className={`flex items-center bg-white/10 rounded-2xl p-1 pr-2 border border-white/5 transition-all ${isReadOnly ? "opacity-50 pointer-events-none" : "focus-within:border-white/20"}`}
                >
                  <input
                    type="text"
                    placeholder={
                      isReadOnly
                        ? "Solo Lectura"
                        : "Tarea rápida (Semana Actual)..."
                    }
                    className="bg-transparent border-none text-sm text-white placeholder-gray-500 w-full px-3 py-2 outline-none"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    disabled={addingTask || isReadOnly}
                  />
                  <button
                    type="submit"
                    disabled={addingTask || isReadOnly}
                    className="bg-emerald-500 text-white p-1.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {addingTask ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                </div>
              </form>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 z-10 pr-2">
                {myTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600">
                    <CheckCircle size={32} className="mb-2 opacity-30" />
                    <p className="text-xs font-bold">¡Mes al día!</p>
                  </div>
                ) : (
                  myTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group/task flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 transition-all ${isReadOnly ? "cursor-default opacity-80" : "hover:bg-white/10 cursor-pointer"}`}
                      onClick={() => completeTask(task.id)}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 border-gray-500 transition-colors shrink-0 ${!isReadOnly && "group-hover/task:border-emerald-400 group-hover/task:bg-emerald-400"} ${task.priority === 1 ? "border-red-500 bg-red-500/20" : ""}`}
                      ></div>
                      <div className="flex-1">
                        <span
                          className={`text-xs font-medium text-gray-300 transition-all line-clamp-1 block ${!isReadOnly && "group-hover/task:text-white group-hover/task:line-through"}`}
                        >
                          {task.description}
                        </span>
                        <span className="text-[9px] text-gray-600 uppercase font-black">
                          {task.category} • Sem {task.target_week}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. AUDITORÍA */}
          <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} /> Auditoría
              </h2>
              <Link
                to="/supervision"
                className="text-[10px] font-black uppercase text-gray-300 hover:text-brand flex items-center gap-1 transition-colors"
              >
                Ir a Supervisión <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 z-10">
              {alertPartners.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <CheckCircle size={48} className="mb-2 text-emerald-100" />
                  <p className="text-xs font-bold uppercase tracking-widest text-center">
                    Datos impecables
                  </p>
                </div>
              ) : (
                alertPartners.map((p) => {
                  const isCritical = p.cardStatus === "critical";
                  const bgColor = isCritical
                    ? "bg-red-50"
                    : p.cardStatus === "warning"
                      ? "bg-orange-50/50"
                      : "bg-blue-50/30";
                  const borderColor = isCritical
                    ? "border-red-100"
                    : p.cardStatus === "warning"
                      ? "border-orange-100"
                      : "border-blue-100";
                  const targetLink = p.issues[0]?.projectId
                    ? `/supervision/historial/${p.issues[0].projectId}`
                    : `/supervision`;

                  return (
                    <Link
                      to={targetLink}
                      key={p.id}
                      className={`block p-5 rounded-3xl border ${borderColor} ${bgColor} transition-all hover:shadow-lg duration-300 cursor-pointer`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {p.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-black text-gray-900 uppercase leading-none">
                            {p.name}
                          </h4>
                          {isCritical && (
                            <span className="text-[9px] font-bold text-red-600 bg-white/80 px-1.5 py-0.5 rounded mt-1 inline-block border border-red-100">
                              Atención Requerida
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {p.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100/50 shadow-sm"
                          >
                            <div className="mt-0.5">
                              {getIssueIcon(issue.type)}
                            </div>
                            <div>
                              <span className="block text-xs font-black text-gray-800 uppercase mb-0.5">
                                {issue.project || issue.scope || "General"}
                              </span>
                              <span
                                className={`block text-[10px] font-bold leading-tight ${issue.severity === "critical" ? "text-red-600" : issue.severity === "warning" ? "text-orange-500" : "text-blue-500"}`}
                              >
                                {issue.text}
                              </span>
                              {issue.subtext && (
                                <span className="block text-[9px] text-gray-400 font-medium mt-1">
                                  {issue.subtext}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
