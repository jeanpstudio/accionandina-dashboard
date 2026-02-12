import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Megaphone,
  Trophy,
  LayoutGrid,
  MapPin,
  CalendarDays,
  BarChart3,
  Layers,
  Globe,
  Search,
  Eye,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function GlobalReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("activo");
  const [selectedSeason, setSelectedSeason] = useState("TODAS");
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [viewMode, setViewMode] = useState("ACCUMULATED");

  const periods = [
    { label: "Todo el Año", months: [], yearOffset: 0 },
    {
      label: "Trim 1: Ene - Mar",
      months: ["enero", "febrero", "marzo"],
      yearOffset: 0,
    },
    {
      label: "Trim 2: Abr - Jun",
      months: ["abril", "mayo", "junio"],
      yearOffset: 0,
    },
    {
      label: "Trim 3: Jul - Sep",
      months: ["julio", "agosto", "septiembre"],
      yearOffset: 0,
    },
    {
      label: "Trim 4: Oct - Dic",
      months: ["octubre", "noviembre", "diciembre"],
      yearOffset: 0,
    },
  ];

  useEffect(() => {
    fetchGlobalData();
  }, [selectedSeason, selectedPeriodIdx, viewMode]);

  const normalize = (str) => (str ? str.toString().toLowerCase().trim() : "");

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
    return months.indexOf(normalize(name));
  };

  // --- 1. CÁLCULO MATEMÁTICO DEL SCORE ---
  const calculateScore = (reports, duration, targetPhotos, targetPosts) => {
    let accumulated = 0;
    const maxMonthWeight = 100 / (duration || 12);

    reports.forEach((r) => {
      const pComp = Math.min(
        (parseInt(r.photo_count) || 0) / (targetPhotos || 10),
        1,
      );
      const rComp = Math.min(
        (parseInt(r.post_count) || 0) / (targetPosts || 4),
        1,
      );
      accumulated += ((pComp + rComp) / 2) * maxMonthWeight;
    });

    return parseFloat(accumulated.toFixed(1));
  };

  // --- 2. PROCESAMIENTO DE DATOS ---
  async function fetchGlobalData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("projects").select(`
          id, name, status, start_date, season_duration_months, monthly_photos_target, monthly_posts_target,
          partners ( id, name, logo_url ),
          monthly_reports (
            photo_count, post_count, videos, campaigns, report_month, report_year
          )
        `);

      if (error) throw error;

      if (data) {
        const processedProjects = data.map(processProject);
        setProjects(processedProjects);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const processProject = (proj) => {
    const today = new Date();
    const currentYear = today.getFullYear();

    // 1. Filtrar reportes según vista
    let relevantReports = proj.monthly_reports || [];
    if (viewMode === "PERIOD" && selectedPeriodIdx > 0) {
      const currentPeriod = periods[selectedPeriodIdx];
      relevantReports = relevantReports.filter((r) =>
        currentPeriod.months.includes(normalize(r.report_month)),
      );
    }

    // 2. Ordenar reportes (Más reciente primero)
    const sortedReports = [...(proj.monthly_reports || [])].sort((a, b) => {
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
    const lastReport = sortedReports[0]; // Último reporte disponible

    // 3. Cálculos de Cantidades
    let totalPhotos = 0;
    let totalPosts = 0;
    let totalVideos = 0;

    relevantReports.forEach((r) => {
      totalPhotos += parseInt(r.photo_count) || 0;
      totalPosts += parseInt(r.post_count) || 0;
      if (r.videos) totalVideos += r.videos.length;
    });

    const realPercent = calculateScore(
      relevantReports,
      proj.season_duration_months,
      proj.monthly_photos_target,
      proj.monthly_posts_target,
    );

    // --- CORRECCIÓN LÓGICA: META ESPERADA ---
    const projStart = proj.start_date ? new Date(proj.start_date) : null;
    const duration = proj.season_duration_months || 12;
    let expectedPercent = 0;
    let monthsPassed = 0;

    // FECHA DE CORTE PARA EL CÁLCULO
    // Si tiene reportes, la fecha de corte es el final del mes del último reporte.
    // Si NO tiene reportes, la fecha de corte es HOY (para mostrar que está atrasado desde el inicio).
    let calculationDate = new Date();

    if (lastReport) {
      const mIdx = getMonthIndex(lastReport.report_month);
      const year = parseInt(lastReport.report_year);
      // Fin del mes del último reporte (ej: 31 de Diciembre)
      calculationDate = new Date(year, mIdx + 1, 0);
    }

    if (projStart) {
      // Calculamos meses pasados hasta la FECHA DE CORTE, no hasta HOY
      monthsPassed =
        (calculationDate.getFullYear() - projStart.getFullYear()) * 12 +
        (calculationDate.getMonth() - projStart.getMonth());

      // Si el proyecto empezó después de la fecha de corte (caso raro), es 0
      if (monthsPassed < 0) monthsPassed = 0;

      if (monthsPassed > 0) {
        expectedPercent = (monthsPassed / duration) * 100;
        if (expectedPercent > 100) expectedPercent = 100;
      }
    }

    // --- ESTADO DE SALUD ---
    let healthStatus = "OK";
    let healthColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    let progressBarColor = "bg-emerald-500";

    // Regla de Inmunidad (Solo si lleva menos del 15% de tiempo de proyecto)
    const timeProgress = (monthsPassed / duration) * 100;

    if (monthsPassed > 0) {
      // Si está en inmunidad (inicio) lo perdonamos, si no, aplicamos regla estricta
      if (timeProgress > 15 || !lastReport) {
        const diff = expectedPercent - realPercent;

        if (diff >= 5) {
          healthStatus = "CRÍTICO";
          healthColor = "text-red-600 bg-red-50 border-red-200";
          progressBarColor = "bg-red-600";
        } else if (diff > 2) {
          healthStatus = "RETRASO";
          healthColor = "text-orange-500 bg-orange-50 border-orange-200";
          progressBarColor = "bg-orange-500";
        }
      }
    }

    // --- VIDEOS ---
    let expectedVideos = 0;
    if (today > new Date(`${currentYear}-07-31`)) expectedVideos = 1;
    if (today > new Date(`${currentYear}-10-31`)) expectedVideos = 2;
    if (today > new Date(`2026-03-31`)) expectedVideos = 3;
    const videoStatus = totalVideos >= expectedVideos ? "OK" : "FALTA";

    const lastReportText = lastReport
      ? `${lastReport.report_month} ${lastReport.report_year}`
      : "---";

    return {
      ...proj,
      realPercent,
      expectedPercent: parseFloat(expectedPercent.toFixed(1)),
      totalPhotos,
      totalPosts,
      totalVideos,
      expectedVideos,
      healthStatus,
      healthColor,
      progressBarColor,
      videoStatus,
      lastReportText,
    };
  };

  // --- FILTRADO ---
  const filteredProjects = projects.filter((p) => {
    const matchesStatus =
      filterStatus === "todos" ? true : p.status?.toLowerCase() === "activo";
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partners?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const grandTotalPhotos = filteredProjects.reduce(
    (acc, p) => acc + p.totalPhotos,
    0,
  );
  const grandTotalPosts = filteredProjects.reduce(
    (acc, p) => acc + p.totalPosts,
    0,
  );

  // --- EXPORTAR ---
  const handleExport = () => {
    const dataToExport = filteredProjects.map((p) => ({
      Socio: p.partners?.name,
      Proyecto: p.name,
      Estado: p.status,
      Salud: p.healthStatus,
      "Avance Real %": p.realPercent,
      "Avance Esperado %": p.expectedPercent,
      "Fotos Total": p.totalPhotos,
      "Posts Total": p.totalPosts,
      Videos: `${p.totalVideos}/${p.expectedVideos}`,
      "Último Reporte": p.lastReportText,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Global");
    XLSX.writeFile(
      wb,
      `Reporte_Global_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  if (loading)
    return (
      <div className="p-20 text-center text-brand font-bold animate-pulse">
        Generando Reporte...
      </div>
    );

  return (
    <div className="max-w-[1600px] mx-auto p-8 bg-gray-50/50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <button
            onClick={() => navigate("/supervision")}
            className="flex items-center gap-2 text-gray-400 hover:text-brand mb-4 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            Reporte Global
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Supervisión técnica detallada.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
            <button
              onClick={() => setViewMode("ACCUMULATED")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "ACCUMULATED" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Layers size={14} /> Acumulado
            </button>
            <button
              onClick={() => setViewMode("PERIOD")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "PERIOD" ? "bg-brand text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
            >
              <BarChart3 size={14} /> Por Periodo
            </button>
          </div>
          {viewMode === "PERIOD" && (
            <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
              {periods.slice(1).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPeriodIdx(idx + 1)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${selectedPeriodIdx === idx + 1 ? "bg-emerald-100 text-emerald-800" : "text-gray-400 hover:bg-gray-50"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <ImageIcon size={24} />
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">
              {grandTotalPhotos}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Fotos Totales
            </p>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Megaphone size={24} />
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">
              {grandTotalPosts}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Posts Totales
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="bg-gray-900 rounded-[24px] p-6 text-white shadow-lg hover:bg-black transition-all flex items-center justify-between group"
        >
          <div>
            <p className="font-black text-lg uppercase">Exportar Excel</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Base de datos completa
            </p>
          </div>
          <Download className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* FILTROS TABLA */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar socio o proyecto..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-brand transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setFilterStatus("activo")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filterStatus === "activo" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white text-gray-400 border border-gray-100"}`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilterStatus("todos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filterStatus === "todos" ? "bg-gray-800 text-white" : "bg-white text-gray-400 border border-gray-100"}`}
        >
          Todos
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-64">
                  Socio / Proyecto
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">
                  Salud
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">
                  Fotos
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">
                  Posts
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">
                  Promedio %
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">
                  Barra Avance
                </th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {p.partners?.logo_url ? (
                        <img
                          src={p.partners.logo_url}
                          className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-400">
                          {p.partners?.name?.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-gray-900 uppercase truncate w-48">
                          {p.partners?.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium truncate w-48">
                          {p.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${p.healthColor}`}
                    >
                      {p.healthStatus}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-700">
                        {p.totalPhotos}
                      </span>
                      <ImageIcon size={10} className="text-gray-300 mt-0.5" />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-700">
                        {p.totalPosts}
                      </span>
                      <Globe size={10} className="text-gray-300 mt-0.5" />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-black text-gray-900">
                      {p.realPercent}%
                    </span>
                    <span className="block text-[9px] font-bold text-gray-400">
                      Meta: {p.expectedPercent}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.progressBarColor}`}
                        style={{ width: `${Math.min(p.realPercent, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Link
                      to={`/supervision/historial/${p.id}`}
                      className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-brand hover:text-white hover:border-brand transition-all inline-block shadow-sm"
                      title="Ver Historial"
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm font-medium">
              No se encontraron proyectos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
