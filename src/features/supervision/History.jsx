/**
 * COMPONENTE: History (Auditoría e Inteligencia de Datos)
 * ------------------------------------------------------
 * Herramienta de visualización de progreso acumulado y exportación de reportes.
 * 
 * CAPACIDADES CLAVE:
 * 1. INDICADORES DE SALUD: Calcula el desvío entre el avance real (% de fotos/posts) 
 *    vs el avance esperado por cronograma (Semáforo de cumplimiento).
 * 2. AUTOMATIZACIÓN DE CORREOS: Generador dinámico de reportes en HTML listos para 
 *    copiar/pegar en Gmail, incluyendo tablas comparativas y estados de hitos.
 * 3. EXPORTACIÓN MASIVA: Salida a Excel (XLSX) para reportes finales de temporada.
 * 4. SEGURIDAD: Bloquea edición si el usuario tiene rol de lectura.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../app/supabase";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  FileText,
  X,
  Download,
  Star,
  Filter,
  Trophy,
  Camera,
  Share2,
  Edit,
  Plus,
  Image as ImageIcon,
  Megaphone,
  MessageSquare,
  Globe,
  MessageCircle,
  Copy,
  ChevronDown,
  Hash,
  Lock, // <--- IMPORTANTE: Icono de seguridad
} from "lucide-react";

export default function History() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState("TODAS");
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedMonthForReport, setSelectedMonthForReport] = useState(null);

  // --- SEGURIDAD: ESTADO DE LECTURA ---
  const [isReadOnly, setIsReadOnly] = useState(true);

  // ESTADO PARA REDONDEAR
  const [isRounded, setIsRounded] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const monthMap = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  async function fetchHistory() {
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

        // REGLAS:
        // Admin -> Siempre edita.
        // Editor -> Edita SOLO si 'edit_supervision' es TRUE (ya que esto es parte de Supervisión).

        if (profile?.role === "admin") {
          canEdit = true;
        } else if (profile?.edit_supervision === true) {
          canEdit = true;
        }
      }
      setIsReadOnly(!canEdit);
    } catch (e) {
      console.error("Error permisos:", e);
    }

    try {
      const { data: projData } = await supabase
        .from("projects")
        .select("*, partners(name)")
        .eq("id", projectId)
        .single();
      setProject(projData);
      const { data: reportsData } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setReports(reportsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- HELPER PARA FORMATEAR NÚMEROS ---
  const fmt = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    return isRounded ? Math.round(num).toString() : num.toFixed(2);
  };

  const uniqueSeasons = [
    "TODAS",
    ...new Set(reports.map((r) => r.season_name)),
  ];
  const filteredReports =
    selectedSeason === "TODAS"
      ? reports
      : reports.filter((r) => r.season_name === selectedSeason);
  const normalize = (str) => (str ? str.toString().toLowerCase().trim() : "");

  // --- HELPERS DE CÁLCULO ---
  const getTimeProgressAtReport = (report) => {
    if (!project?.season_duration_months) return 0;
    let startDate;
    if (project.start_date) {
      const d = new Date(project.start_date);
      startDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    } else {
      const startReport = reports.find(
        (r) => r.is_season_start && r.season_name === report.season_name,
      );
      if (startReport && startReport.report_month) {
        const mIdx = monthMap[normalize(startReport.report_month)];
        if (mIdx !== undefined)
          startDate = new Date(parseInt(startReport.report_year), mIdx, 1);
        else startDate = new Date(startReport.created_at);
      } else {
        const oldest = [...reports].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        )[0];
        startDate = new Date(oldest?.created_at || new Date());
      }
    }
    const mIdx = monthMap[normalize(report.report_month)];
    let reportDate;
    if (mIdx !== undefined)
      reportDate = new Date(parseInt(report.report_year), mIdx, 1);
    else reportDate = new Date(report.created_at);
    let monthsPassed =
      (reportDate.getFullYear() - startDate.getFullYear()) * 12 +
      (reportDate.getMonth() - startDate.getMonth()) +
      1;
    if (isNaN(monthsPassed) || monthsPassed < 1) monthsPassed = 1;
    const duration = parseInt(project.season_duration_months);
    return Math.min((monthsPassed / duration) * 100, 100);
  };

  const getWebStatus = (report) => {
    const timePercent = getTimeProgressAtReport(report);
    const webPercent = parseInt(report.web_progress_percent || 0);
    if (timePercent > 90 && webPercent < 20)
      return { color: "text-red-500", hex: "#dc2626", label: "CRÍTICO" };
    if (timePercent > 50 && webPercent < 50)
      return { color: "text-orange-500", hex: "#ea580c", label: "ATRASADO" };
    return { color: "text-emerald-500", hex: "#065f46", label: "OK" };
  };

  const getVideoStatus = (report) => {
    const videosCount = report.videos?.length || 0;
    const mName = normalize(report.report_month);
    const mIdx = monthMap[mName] !== undefined ? monthMap[mName] : -1;
    const rYear = parseInt(report.report_year);
    if (mIdx === -1 || !rYear)
      return { color: "text-gray-400", hex: "#9ca3af", label: "?" };
    const reportAbsoluteValue = rYear * 12 + mIdx;
    const hitoJulio25 = 2025 * 12 + 6;
    const hitoOctubre25 = 2025 * 12 + 9;
    const hitoMarzo26 = 2026 * 12 + 2;
    if (reportAbsoluteValue > hitoJulio25 && videosCount < 1)
      return { color: "text-orange-500", hex: "#ea580c", label: "FALTA VID 1" };
    if (reportAbsoluteValue > hitoOctubre25 && videosCount < 2)
      return videosCount === 0
        ? { color: "text-red-500", hex: "#dc2626", label: "CRÍTICO" }
        : { color: "text-orange-500", hex: "#ea580c", label: "FALTA VID 2" };
    if (reportAbsoluteValue > hitoMarzo26 && videosCount < 3)
      return { color: "text-orange-500", hex: "#ea580c", label: "FALTA VID 3" };
    if (videosCount > 0)
      return { color: "text-emerald-500", hex: "#065f46", label: "OK" };
    return { color: "text-gray-400", hex: "#9ca3af", label: "PENDIENTE" };
  };

  const calculateMonthlyProgress = (currentValue, targetValue) => {
    const seasonMonths = project?.season_duration_months || 12;
    const maxMonthWeight = 100 / seasonMonths;
    const target = targetValue || 1;
    const compliance = Math.min(currentValue / target, 1);
    return {
      target,
      gainedPercentage: compliance * maxMonthWeight,
      gainedNumber: compliance * maxMonthWeight,
      isComplete: currentValue >= target,
      percentageOfTarget: Math.round((currentValue / target) * 100),
    };
  };

  const calculateSeasonStats = () => {
    let totalPhotos = 0;
    let totalPosts = 0;
    let accPhotoPercent = 0;
    let accPostPercent = 0;
    const targetPhotos = project?.monthly_photos_target || 10;
    const targetPosts = project?.monthly_posts_target || 4;
    filteredReports.forEach((r) => {
      totalPhotos += parseInt(r.photo_count) || 0;
      totalPosts += parseInt(r.post_count) || 0;
      accPhotoPercent += calculateMonthlyProgress(
        r.photo_count,
        targetPhotos,
      ).gainedNumber;
      accPostPercent += calculateMonthlyProgress(
        r.post_count,
        targetPosts,
      ).gainedNumber;
    });
    return {
      totalPhotos,
      totalPosts,
      accumulatedPercent: (accPhotoPercent + accPostPercent) / 2,
      accPhotoPercent: accPhotoPercent,
      accPostPercent: accPostPercent,
      expectedPhotos: filteredReports.length * targetPhotos,
      expectedPosts: filteredReports.length * targetPosts,
    };
  };
  const seasonStats = calculateSeasonStats();

  const getHealthData = () => {
    if (!project?.season_duration_months || filteredReports.length === 0)
      return { color: "text-gray-300", msg: "", expected: 0 };
    let startDate;
    if (project.start_date) {
      const d = new Date(project.start_date);
      startDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    } else {
      const startReport = filteredReports.find((r) => r.is_season_start);
      if (startReport && startReport.report_month) {
        const mIdx = monthMap[normalize(startReport.report_month)];
        if (mIdx !== undefined)
          startDate = new Date(parseInt(startReport.report_year), mIdx, 1);
        else startDate = new Date(startReport.created_at);
      } else {
        const oldest = [...filteredReports].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        )[0];
        startDate = new Date(oldest.created_at);
      }
    }
    const validReports = filteredReports.filter(
      (r) => monthMap[normalize(r.report_month)] !== undefined,
    );
    let endDate;
    if (validReports.length > 0) {
      const sorted = validReports.sort((a, b) => {
        const yA = parseInt(a.report_year);
        const yB = parseInt(b.report_year);
        if (yA !== yB) return yB - yA;
        return (
          monthMap[normalize(b.report_month)] -
          monthMap[normalize(a.report_month)]
        );
      });
      const last = sorted[0];
      const mIdx = monthMap[normalize(last.report_month)];
      endDate = new Date(parseInt(last.report_year), mIdx, 1);
    } else endDate = new Date();
    let monthsPassed =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1;
    if (isNaN(monthsPassed) || monthsPassed < 1) monthsPassed = 1;
    const duration = parseInt(project.season_duration_months) || 12;
    let expectedPercent = (monthsPassed / duration) * 100;
    if (expectedPercent > 100) expectedPercent = 100;
    const diff = parseFloat(seasonStats.accumulatedPercent) - expectedPercent;
    let color = "text-emerald-500";
    if (diff <= -10) color = "text-red-500";
    else if (diff < -2) color = "text-orange-500";
    return {
      color,
      msg: `(Meta al mes ${monthsPassed}/${duration}: ${fmt(expectedPercent)}%)`,
      expected: expectedPercent,
    };
  };
  const health = getHealthData();

  const getSubStatColor = (value) => {
    const diff = parseFloat(value) - health.expected;
    if (diff <= -5) return "text-red-600 bg-red-50 border-red-200";
    if (diff < -2) return "text-orange-500 bg-orange-50 border-orange-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getSortedReports = () => {
    return [...filteredReports].sort((a, b) => {
      const yearA = parseInt(a.report_year);
      const yearB = parseInt(b.report_year);
      if (yearA !== yearB) return yearA - yearB;
      const monthA = monthMap[normalize(a.report_month)] || 0;
      const monthB = monthMap[normalize(b.report_month)] || 0;
      return monthA - monthB;
    });
  };

  const handleCopyNumericSummary = (type) => {
    const sorted = getSortedReports();
    if (sorted.length === 0) return alert("No hay datos.");
    let textToCopy = "";
    if (type === "photos")
      textToCopy = sorted
        .map((r) => `${r.report_month || "Enero"} (${r.photo_count})`)
        .join(", ");
    else if (type === "posts")
      textToCopy = sorted
        .map((r) => `${r.report_month || "Enero"} (${r.post_count})`)
        .join(", ");
    navigator.clipboard.writeText(textToCopy);
    alert(`Copiado:\n${textToCopy}`);
  };
  const handleCopySingleComment = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setActiveDropdown(null);
  };

  const DropdownMenu = ({ type, icon: Icon }) => {
    const sorted = getSortedReports();
    const items = sorted.filter((r) => {
      if (type === "photo_comment")
        return r.photo_comment && r.photo_comment.length > 1;
      if (type === "post_comment")
        return r.post_comment && r.post_comment.length > 1;
      if (type === "web_comment")
        return r.web_comment && r.web_comment.length > 1;
      return false;
    });
    const isOpen = activeDropdown === type;
    return (
      <div className="relative">
        <button
          onClick={() => setActiveDropdown(isOpen ? null : type)}
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${isOpen ? "bg-gray-100 text-brand" : "text-gray-400 hover:text-brand hover:bg-white"}`}
        >
          <Icon size={18} />
          <ChevronDown
            size={10}
            className={`text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setActiveDropdown(null)}
            />
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                {items.length > 0 ? (
                  items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() =>
                        handleCopySingleComment(
                          type === "photo_comment"
                            ? r.photo_comment
                            : type === "post_comment"
                              ? r.post_comment
                              : r.web_comment,
                        )
                      }
                      className="w-full text-left px-4 py-3 hover:bg-brand/5 rounded-xl group flex flex-col items-start transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex justify-between w-full items-center mb-1">
                        <span className="text-[10px] font-black uppercase text-gray-900 group-hover:text-brand">
                          {r.report_month || "Enero"}
                        </span>
                        <Copy
                          size={10}
                          className="text-gray-300 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed w-full">
                        {type === "photo_comment"
                          ? r.photo_comment
                          : type === "post_comment"
                            ? r.post_comment
                            : r.web_comment}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-[10px] text-gray-400 text-center italic">
                    Sin comentarios.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const exportToExcel = () => {
    if (!filteredReports.length) return;
    const data = filteredReports.map((r) => ({
      Temporada: r.season_name,
      Mes: r.report_month,
      Año: r.report_year,
      Fotos: r.photo_count,
      Posts: r.post_count,
      Web: `${r.web_progress_percent}%`,
      Videos: r.videos?.length || 0,
      Campañas: r.campaigns?.length || 0,
      Milkywire: r.milkywire_material?.length || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `AA_Auditoria_${project?.name}.xlsx`);
  };

  // --- GENERACIÓN DE CORREO ---
  const getMailHTML = () => {
    const r = selectedMonthForReport || filteredReports[0];
    if (!r) return "";

    const targetPhotos = project?.monthly_photos_target || 10;
    const targetPosts = project?.monthly_posts_target || 4;

    const photoStats = calculateMonthlyProgress(r.photo_count, targetPhotos);
    const postStats = calculateMonthlyProgress(r.post_count, targetPosts);

    const seasonReports = reports.filter(
      (rep) =>
        rep.season_name === r.season_name &&
        new Date(rep.created_at) <= new Date(r.created_at),
    );
    const previousReports = seasonReports.filter((rep) => rep.id !== r.id);

    const rawTotalProgressPhotos = seasonReports.reduce(
      (acc, rep) =>
        acc +
        calculateMonthlyProgress(rep.photo_count, targetPhotos).gainedNumber,
      0,
    );
    const rawTotalProgressPosts = seasonReports.reduce(
      (acc, rep) =>
        acc +
        calculateMonthlyProgress(rep.post_count, targetPosts).gainedNumber,
      0,
    );

    const displayTotalProgressPhotos = fmt(rawTotalProgressPhotos);
    const displayTotalProgressPosts = fmt(rawTotalProgressPosts);

    const webStatus = getWebStatus(r);
    const videoStatus = getVideoStatus(r);

    let photosColor = "#065f46";
    let postsColor = "#065f46";

    if (project?.season_duration_months) {
      const startReport = reports.find(
        (rep) => rep.is_season_start && rep.season_name === r.season_name,
      );
      let startDate;
      if (startReport) {
        const mIdx = monthMap[normalize(startReport.report_month)];
        if (mIdx !== undefined)
          startDate = new Date(parseInt(startReport.report_year), mIdx, 1);
        else startDate = new Date(startReport.created_at);
      } else if (project.season_start_date) {
        startDate = new Date(project.season_start_date);
      }
      if (startDate) {
        const mIdx = monthMap[normalize(r.report_month)];
        let reportDate;
        if (mIdx !== undefined)
          reportDate = new Date(parseInt(r.report_year), mIdx, 1);
        else reportDate = new Date(r.created_at);
        let monthsPassed =
          (reportDate.getFullYear() - startDate.getFullYear()) * 12 +
          (reportDate.getMonth() - startDate.getMonth()) +
          1;
        if (isNaN(monthsPassed) || monthsPassed < 1) monthsPassed = 1;
        const duration = parseInt(project.season_duration_months);
        let expected = (monthsPassed / duration) * 100;
        if (expected > 100) expected = 100;

        const getHex = (val) => {
          const diff = parseFloat(val) - expected;
          if (diff <= -10) return "#dc2626";
          if (diff < -2) return "#ea580c";
          return "#065f46";
        };
        photosColor = getHex(rawTotalProgressPhotos);
        postsColor = getHex(rawTotalProgressPosts);
      }
    }

    const totalVideos = Array.isArray(r.videos) ? r.videos.length : 0;
    const totalCamps = Array.isArray(r.campaigns) ? r.campaigns.length : 0;
    const totalMilky = Array.isArray(r.milkywire_material) ? r.milkywire_material.length : 0;

    // Verificar si es mes de entrega de video (Junio, Octubre, Marzo)
    const videoMonths = ["Junio", "Octubre", "Marzo"];
    const isVideoMonth = videoMonths.includes(r.report_month);

    // El "isMilkyMonth" en History lo inferimos si hay cometario o si queremos ser precisos 
    // pero por ahora usemos la presencia de material o comentario
    const hasMilkyJustification = r.milkywire_comment && r.milkywire_comment.trim().length > 0;
    const hasVideoJustification = r.video_comment && r.video_comment.trim().length > 0;

    const textStyle =
      "font-family: Arial, sans-serif; font-size: 13px; color: #374151; line-height: 1.5;";
    const getStatusColor = (isComplete) => (isComplete ? "#065f46" : "#dc2626");

    const campaignItemsHTML = Array.isArray(r.campaigns) && r.campaigns.length > 0
      ? r.campaigns.map(c => `<li><b>${c.title}:</b> ${c.comment || 'Participación registrada.'}</li>`).join('')
      : '<li>No se reportaron campañas activas este mes.</li>';

    const videoInfoHTML = totalVideos > 0
      ? `<b>${totalVideos} video(s) registrados.</b>`
      : (isVideoMonth ? `<span style="color: #dc2626; font-weight: bold;">OMITIDO (Mes de entrega)</span>` : 'No se subieron videos.');

    const milkyInfoHTML = totalMilky > 0
      ? `<b>${totalMilky} material(es) subidos.</b>`
      : (hasMilkyJustification ? `<span style="color: #ea580c; font-weight: bold;">JUSTIFICADO</span>` : 'Puntos sin material.');

    const historyRows =
      previousReports.length > 0
        ? previousReports
          .map((prev) => {
            const pStats = calculateMonthlyProgress(
              prev.photo_count,
              targetPhotos,
            );
            const rStats = calculateMonthlyProgress(
              prev.post_count,
              targetPosts,
            );
            return `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; border-right: 1px solid #eee;">${prev.report_month || "Mes"}</td><td style="padding: 8px; border-right: 1px solid #eee; text-align: center;"><span style="color: ${getStatusColor(pStats.isComplete)}; font-weight: bold;">${prev.photo_count}</span><span style="font-size: 9px; color: #065f46;">(+${fmt(pStats.gainedNumber)}%)</span></td><td style="padding: 8px; text-align: center;"><span style="color: ${getStatusColor(rStats.isComplete)}; font-weight: bold;">${prev.post_count}</span><span style="font-size: 9px; color: #065f46;">(+${fmt(rStats.gainedNumber)}%)</span></td></tr>`;
          })
          .join("")
        : `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #9ca3af; font-style: italic;">Sin reportes previos.</td></tr>`;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; padding: 30px; border-radius: 15px; background-color: #ffffff;">
      <p style="${textStyle}">Estimados amigos de <b>${project?.partners?.name}</b>,</p>
      <p style="${textStyle}">Compartimos el reporte de cumplimiento técnico del paisaje <b>${project?.name}</b> actualizado a <b>${r.report_month || "la fecha"} ${r.report_year}</b>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 25px 0 15px 0; font-family: Arial, sans-serif; font-size: 12px; border: 1px solid #eee;">
        <thead><tr style="background-color: #064e3b; color: #ffffff; text-align: left;"><th style="padding: 12px; border: 1px solid #064e3b;">PRODUCTO / HITO</th><th style="padding: 12px; border: 1px solid #064e3b; text-align: center;">RESULTADO MES</th><th style="padding: 12px; border: 1px solid #064e3b; text-align: center;">AVANCE ACUMULADO</th></tr></thead>
        <tbody>
          <tr><td style="padding: 10px; border: 1px solid #eee;">Fotos de Actividades</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;">${r.photo_count} / ${targetPhotos}</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;"><div style="font-weight: 800; font-size: 14px; color: ${photosColor};">${displayTotalProgressPhotos}%</div><div style="font-size: 10px; color: #6b7280;">+${fmt(photoStats.gainedNumber)}% este mes</div></td></tr>
          <tr><td style="padding: 10px; border: 1px solid #eee;">Publicaciones RRSS</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;">${r.post_count} / ${targetPosts}</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;"><div style="font-weight: 800; font-size: 14px; color: ${postsColor};">${displayTotalProgressPosts}%</div><div style="font-size: 10px; color: #6b7280;">+${fmt(postStats.gainedNumber)}% este mes</div></td></tr>
          <tr><td style="padding: 10px; border: 1px solid #eee;">Sitio Web</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;">Estado Actual</td><td style="padding: 10px; border: 1px solid #eee; text-align: center; font-weight: bold; color: ${webStatus.hex};">${r.web_progress_percent}%</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #eee;">Videos de Temporada</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;">${videoInfoHTML}</td><td style="padding: 10px; border: 1px solid #eee; text-align: center; font-weight: bold; color: ${totalVideos > 0 ? "#065f46" : "#dc2626"};">${totalVideos > 0 ? "OK" : "0%"}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #eee;">Material Milkywire</td><td style="padding: 10px; border: 1px solid #eee; text-align: center;">${milkyInfoHTML}</td><td style="padding: 10px; border: 1px solid #eee; text-align: center; font-weight: bold; color: ${totalMilky > 0 ? "#065f46" : (hasMilkyJustification ? "#ea580c" : "#dc2626")};">${totalMilky > 0 ? "OK" : (hasMilkyJustification ? "JUSTIFICADO" : "0%")}</td></tr>
        </tbody>
      </table>

      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 12px; border: 1px solid #dcfce7; margin-bottom: 20px;">
        <p style="font-size: 11px; color: #166534; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0;">Campañas Ejecutadas:</p>
        <ul style="${textStyle} margin: 0; padding-left: 20px;">
           ${campaignItemsHTML}
        </ul>
      </div>
      <p style="font-size: 11px; font-weight: bold; color: #4b5563; text-transform: uppercase; margin-bottom: 8px;">Historial de meses anteriores:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #eee; background-color: #f9fafb;"><thead><tr style="background-color: #e5e7eb; color: #374151; text-align: left;"><th style="padding: 8px; border-right: 1px solid #d1d5db;">MES</th><th style="padding: 8px; border-right: 1px solid #d1d5db; text-align: center;">FOTOS</th><th style="padding: 8px; text-align: center;">POSTS</th></tr></thead><tbody>${historyRows}</tbody></table>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #eee;">
        <p style="font-size: 11px; color: #065f46; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0;">Observaciones:</p>
        <div style="${textStyle}">
          <p style="margin: 4px 0;">• <b>Fotos:</b> ${r.photo_comment || "Sin observaciones."}</p>
          <p style="margin: 4px 0;">• <b>Publicaciones:</b> ${r.post_comment || "Sin observaciones."}</p>
          <p style="margin: 4px 0;">• <b>Web:</b> ${r.web_comment || "Sin observaciones."}</p>
          <p style="margin: 4px 0;">• <b>Campañas:</b> ${r.campaign_comment || "Sin observaciones específicas."}</p>
          <p style="margin: 4px 0;">• <b>Videos ${isVideoMonth ? '(Mes de Entrega)' : ''}:</b> ${r.video_comment || "Sin observaciones relevantes."}</p>
          <p style="margin: 4px 0;">• <b>Milkywire:</b> ${r.milkywire_comment || "Sin observaciones."}</p>
        </div>
      </div>
      <p style="margin-top: 25px; ${textStyle} font-style: italic;"><b>Nota General:</b> ${r.season_comment || "Quedamos atentos."}</p>
    </div>`;
  };

  if (loading)
    return (
      <div className="p-20 text-center text-brand font-bold animate-pulse">
        Cargando Historial...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-10 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <button
            onClick={() => navigate("/supervision")}
            className="flex items-center gap-2 text-gray-400 hover:text-brand font-bold text-xs mb-4 uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} /> REGRESAR
          </button>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Historial
          </h1>
          <p className="text-brand font-bold text-lg mt-1">
            {project?.partners?.name} / {project?.name}
            {isReadOnly && (
              <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1 inline-flex align-middle">
                <Lock size={10} /> SOLO LECTURA
              </span>
            )}
          </p>
          <div className="flex gap-4 mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span className="bg-gray-50 px-3 py-1 rounded-full">
              Duración: {project?.season_duration_months || 12} Meses
            </span>
            <span className="bg-gray-50 px-3 py-1 rounded-full">
              Meta Fotos: {project?.monthly_photos_target || 10}/mes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-50 px-4 py-3 rounded-2xl flex items-center gap-2 border border-gray-100">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-transparent text-xs font-black text-gray-700 outline-none uppercase cursor-pointer"
            >
              {uniqueSeasons.map((s) => (
                <option key={s} value={s}>
                  {s === "TODAS" ? "Todas las Temporadas" : `Temporada ${s}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsRounded(!isRounded)}
            className={`p-3 rounded-2xl transition-all shadow-sm ${isRounded ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-brand"}`}
            title={isRounded ? "Mostrar decimales" : "Redondear números"}
          >
            <Hash size={18} />
          </button>

          <div className="flex gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button
              onClick={() => handleCopyNumericSummary("photos")}
              className="p-2 text-gray-400 hover:text-brand hover:bg-white rounded-xl transition-all"
              title="Copiar Historial Fotos (Numérico)"
            >
              <ImageIcon size={18} />
            </button>
            <DropdownMenu type="photo_comment" icon={MessageCircle} />
            <button
              onClick={() => handleCopyNumericSummary("posts")}
              className="p-2 text-gray-400 hover:text-brand hover:bg-white rounded-xl transition-all"
              title="Copiar Historial Posts (Numérico)"
            >
              <MessageSquare size={18} />
            </button>
            <DropdownMenu type="post_comment" icon={MessageCircle} />
            <DropdownMenu type="web_comment" icon={Globe} />
          </div>

          {/* BOTÓN NUEVO REPORTE: OCULTO SI ES READONLY */}
          {!isReadOnly && (
            <button
              onClick={() =>
                navigate(`/supervision/nuevo-reporte/${projectId}`)
              }
              className="bg-brand text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={18} /> NUEVO
            </button>
          )}

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
          >
            <FileText size={18} /> REPORTE
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-8 border-2 border-gray-100 shadow-sm mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Trophy size={180} />
        </div>
        <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
          <div className="text-center md:text-left">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Avance Acumulado
            </p>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-6xl font-black tracking-tighter ${health.color}`}
                >
                  {fmt(seasonStats.accumulatedPercent)}%
                </span>
                <span className="text-sm font-bold text-gray-300">/ 100%</span>
              </div>
              <div className="flex gap-2 mt-3">
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 ${getSubStatColor(seasonStats.accPhotoPercent)}`}
                >
                  <ImageIcon size={10} /> {fmt(seasonStats.accPhotoPercent)}%
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 ${getSubStatColor(seasonStats.accPostPercent)}`}
                >
                  <Megaphone size={10} /> {fmt(seasonStats.accPostPercent)}%
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                {health.msg}
              </span>
            </div>
          </div>
          <div className="w-px h-24 bg-gray-100 hidden md:block"></div>
          <div className="flex-1 grid grid-cols-2 gap-8 w-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                  <Camera size={14} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Fotos Acumuladas
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-gray-900">
                  {seasonStats.totalPhotos}
                </p>
                <p className="text-xs font-bold text-gray-400">
                  / {seasonStats.expectedPhotos} esperadas
                </p>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{
                    width: `${Math.min((seasonStats.totalPhotos / seasonStats.expectedPhotos) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                  <Share2 size={14} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Posts Acumulados
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-gray-900">
                  {seasonStats.totalPosts}
                </p>
                <p className="text-xs font-bold text-gray-400">
                  / {seasonStats.expectedPosts} esperadas
                </p>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{
                    width: `${Math.min((seasonStats.totalPosts / seasonStats.expectedPosts) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReports.map((report) => {
          const photoStats = calculateMonthlyProgress(
            report.photo_count,
            project?.monthly_photos_target || 10,
          );
          const postStats = calculateMonthlyProgress(
            report.post_count,
            project?.monthly_posts_target || 4,
          );
          const webStatus = getWebStatus(report);
          const videoStatus = getVideoStatus(report);

          return (
            <div
              key={report.id}
              className="group bg-gray-50 hover:bg-white rounded-[24px] p-1 border border-transparent hover:border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row items-center p-6 gap-8 relative">
                {/* BOTÓN EDITAR REPORTE: OCULTO SI ES READONLY */}
                {!isReadOnly && (
                  <button
                    onClick={() =>
                      navigate(
                        `/supervision/editar-reporte/${projectId}/${report.id}`,
                      )
                    }
                    className="absolute top-4 right-4 text-gray-300 hover:text-brand hover:bg-brand/10 p-2 rounded-xl transition-all"
                    title="Editar Reporte"
                  >
                    <Edit size={18} />
                  </button>
                )}

                {report.is_season_start && (
                  <div className="absolute -top-3 left-10 bg-brand text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-10 border-2 border-white">
                    <Star size={12} className="fill-white" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Mes Inicial
                    </span>
                  </div>
                )}
                <div className="md:w-40 md:min-w-[140px] text-center border-r border-gray-200 pr-8 overflow-hidden">
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    {report.report_year}
                  </p>
                  <p className="text-2xl font-black text-gray-900 uppercase truncate">
                    {report.report_month || "Enero"}
                  </p>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase">
                        Fotos
                      </p>
                      <span
                        className={`text-[9px] font-black ${photoStats.isComplete ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {photoStats.isComplete ? "CUMPLIDO" : "BAJO"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-black text-gray-800">
                        {report.photo_count}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400">
                        / {photoStats.target}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${photoStats.isComplete ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{
                          width: `${Math.min(photoStats.percentageOfTarget, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase">
                        Posts
                      </p>
                      <span
                        className={`text-[9px] font-black ${postStats.isComplete ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {postStats.isComplete ? "CUMPLIDO" : "BAJO"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-black text-gray-800">
                        {report.post_count}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400">
                        / {postStats.target}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${postStats.isComplete ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{
                          width: `${Math.min(postStats.percentageOfTarget, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">
                      Web
                    </p>
                    <p className={`text-xl font-black ${webStatus.color}`}>
                      {report.web_progress_percent}%
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">
                      Progreso
                    </p>
                  </div>
                  <div className="text-right flex flex-col justify-between">
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase self-end ${report.is_season_start ? "bg-brand/10 border-brand text-brand" : "bg-white border-gray-200 text-gray-500"}`}
                    >
                      {report.season_name}
                    </span>
                    <div className="flex gap-3 justify-end mt-2">
                      <div className="text-center">
                        <span
                          className={`block text-[10px] font-black ${videoStatus.color}`}
                        >
                          {report.videos?.length || 0}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">
                          Vid
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-black text-gray-800">
                          {report.campaigns?.length || 0}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">
                          Camp
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-black text-gray-800">
                          {report.milkywire_material?.length || 0}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">
                          Milky
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full p-8 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={28} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase">
              Documentación Oficial
            </h2>
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-2">
                  1. Seleccionar Mes de Enfoque
                </label>
                <select
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 font-black text-sm uppercase shadow-sm outline-none focus:border-brand transition-all"
                  onChange={(e) =>
                    setSelectedMonthForReport(
                      reports.find((rep) => rep.id === e.target.value),
                    )
                  }
                >
                  <option value="">-- Seleccionar el mes a reportar --</option>
                  {reports.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.report_month} {rep.report_year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-brand uppercase tracking-widest italic block pl-2">
                  Vista previa del correo
                </label>
                <div className="bg-white border-2 border-gray-100 rounded-[32px] shadow-inner overflow-hidden">
                  <div
                    className="h-[400px] overflow-y-auto p-8 bg-[#fdfdfd]"
                    dangerouslySetInnerHTML={{ __html: getMailHTML() }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([getMailHTML()], { type: "text/html" });
                  const item = new ClipboardItem({ "text/html": blob });
                  navigator.clipboard.write([item]);
                  alert("✅ Formato copiado. Listo para Gmail.");
                }}
                className="w-full bg-brand text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                COPIAR FORMATO HTML
              </button>
              <button
                onClick={exportToExcel}
                className="w-full bg-gray-900 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl"
              >
                <Download size={18} /> DESCARGAR EXCEL TÉCNICO (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
