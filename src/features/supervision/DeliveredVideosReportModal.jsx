/**
 * COMPONENTE: DeliveredVideosReportModal
 * ---------------------------------------
 * Modal / Vista de reporte consolidado de entregas de videos por socio.
 * 
 * CARACTERÍSTICAS Y LÓGICA DE NEGOCIO:
 * 1. SELECCIÓN DE SOCIOS / FILTRADO:
 *    - Selección individual de socios/proyectos con checkboxes y botón "Marcar/Desmarcar Todos".
 *    - Buscador rápido por nombre de socio o paisaje.
 * 2. ESTRUCTURA DE 3 VIDEOS DE TEMPORADA (Video 1, Video 2, Video 3):
 *    - Identificación automática de los 3 meses de corte de video (ej. Junio, Octubre, Marzo).
 *    - Detección automática desde `monthly_reports` de si se realizó la entrega o no.
 * 3. CARACTERÍSTICAS / EVALUACIÓN DIRECTA POR VIDEO:
 *    - Permite marcar/seleccionar directamente por cada video:
 *      a) Subido correctamente (Sí / No / Pendiente).
 *      b) Calidad del video (Óptima, Buena, Regular, Mala).
 *      c) Duración por rangos (< 1 min, 1 - 3 min, > 3 min, N/A).
 *      d) Observación corta o nota personalizada.
 * 4. PERSISTENCIA:
 *    - Guarda las evaluaciones personalizadas en `localStorage` por temporada.
 * 5. CÓDIGO DE COLORES INTERACTIVO Y COMPATIBLE CON GOOGLE DOCS:
 *    - Verde (Óptima / Subido), Azul (Buena), Amarillo (Regular / Pendiente), Rojo (Mala / No Entregado).
 * 6. EXPORTACIÓN GOOGLE DOCS & EXCEL:
 *    - Copiado al portapapeles en formato HTML enriquecido con estilos CSS inline que conservan los
 *      colores y la estructura al pegar en Google Docs o Word.
 *    - Exportación a archivo Excel (.xlsx).
 */

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  Search,
  CheckSquare,
  Square,
  Video,
  Sparkles,
  AlertCircle,
  Clock,
  Film
} from "lucide-react";
import * as XLSX from "xlsx";
import { getProjectConfigForSeason } from "../../lib/projectConfig";

const normalize = (str) => (str ? str.toString().toLowerCase().trim() : "");

const QUALITY_OPTIONS = [
  { label: "Óptima", color: "bg-emerald-100 text-emerald-800 border-emerald-300", hexBg: "#dcfce7", hexText: "#15803d" },
  { label: "Buena", color: "bg-blue-100 text-blue-800 border-blue-300", hexBg: "#dbeafe", hexText: "#1d4ed8" },
  { label: "Regular", color: "bg-amber-100 text-amber-800 border-amber-300", hexBg: "#fef3c7", hexText: "#b45309" },
  { label: "Mala", color: "bg-red-100 text-red-800 border-red-300", hexBg: "#fee2e2", hexText: "#b91c1c" },
  { label: "Sin evaluar", color: "bg-gray-100 text-gray-700 border-gray-300", hexBg: "#f1f5f9", hexText: "#475569" },
];

const DURATION_OPTIONS = [
  "1-3 min",
  "< 1 min",
  "> 3 min",
  "No cumple",
  "N/A",
];

const UPLOAD_STATUS_OPTIONS = [
  { label: "Sí (Correcto)", value: "si", color: "bg-emerald-100 text-emerald-800 border-emerald-300", hexBg: "#dcfce7", hexText: "#15803d" },
  { label: "No (Falló)", value: "no", color: "bg-red-100 text-red-800 border-red-300", hexBg: "#fee2e2", hexText: "#b91c1c" },
  { label: "Pendiente", value: "pendiente", color: "bg-amber-100 text-amber-800 border-amber-300", hexBg: "#fef3c7", hexText: "#b45309" },
];

export default function DeliveredVideosReportModal({
  isOpen,
  onClose,
  partners = [],
  availableSeasons = [],
  activeSeason: initialSeason = "",
  seasonVideoMonths = ["Junio", "Octubre", "Marzo"],
}) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());
  
  // Mapa de evaluaciones editables guardadas por socio/proyecto y por video (1, 2, 3)
  // { [`${projectId}_v${vIdx}`]: { subido: 'si'|'no'|'pendiente', calidad: 'Óptima'|..., duracion: '1-3 min'|..., obs: '...' } }
  const [evaluationsMap, setEvaluationsMap] = useState({});

  // Inicializar temporada
  useEffect(() => {
    if (initialSeason) {
      setSelectedSeason(initialSeason);
    }
  }, [initialSeason]);

  // Cargar evaluaciones persistidas desde localStorage
  useEffect(() => {
    if (!selectedSeason) return;
    try {
      const stored = localStorage.getItem(`aa_video_evals_${selectedSeason}`);
      if (stored) {
        setEvaluationsMap(JSON.parse(stored));
      } else {
        setEvaluationsMap({});
      }
    } catch (e) {
      console.error("Error leyendo evaluaciones de videos de localStorage:", e);
    }
  }, [selectedSeason]);

  // Obtener todos los IDs de proyectos disponibles
  const allProjectIds = useMemo(() => {
    const ids = [];
    partners.forEach((p) => {
      (p.projects || []).forEach((proj) => ids.push(proj.id));
    });
    return ids;
  }, [partners]);

  // Seleccionar todos los proyectos por defecto al cargar socios
  useEffect(() => {
    if (allProjectIds.length > 0) {
      setSelectedProjectIds(new Set(allProjectIds));
    }
  }, [allProjectIds]);

  // Actualizar una evaluación individual de video
  const handleEvaluationChange = (projectId, videoIndex, field, value) => {
    const key = `${projectId}_v${videoIndex}`;
    const currentEval = evaluationsMap[key] || {};
    const updatedEval = { ...currentEval, [field]: value };
    const updatedMap = { ...evaluationsMap, [key]: updatedEval };

    setEvaluationsMap(updatedMap);
    try {
      localStorage.setItem(
        `aa_video_evals_${selectedSeason}`,
        JSON.stringify(updatedMap)
      );
    } catch (e) {
      console.error("Error guardando evaluaciones de videos:", e);
    }
  };

  const toggleProjectSelection = (projectId) => {
    const newSet = new Set(selectedProjectIds);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjectIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedProjectIds.size === allProjectIds.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(allProjectIds));
    }
  };

  if (!isOpen) return null;

  // Determinar los 3 meses de entrega de video para la temporada
  const videoMonthsList = seasonVideoMonths && seasonVideoMonths.length >= 3 
    ? seasonVideoMonths.slice(0, 3) 
    : ["Junio", "Octubre", "Marzo"];

  // --- CÁLCULO Y PROCESAMIENTO DE DATOS ---
  const processedData = [];

  partners.forEach((partner) => {
    (partner.projects || []).forEach((proj) => {
      const config = getProjectConfigForSeason(proj, selectedSeason);
      const effectiveVideoMonths = Array.isArray(config?.custom_video_months) && config.custom_video_months.length >= 3
        ? config.custom_video_months.slice(0, 3)
        : videoMonthsList;

      const reports = (proj.monthly_reports || []).filter(
        (r) => !selectedSeason || r.season_name === selectedSeason
      );

      // Evaluación para cada uno de los 3 videos
      const videosInfo = effectiveVideoMonths.map((mName, vIdx) => {
        const vNum = vIdx + 1;
        const evalKey = `${proj.id}_v${vNum}`;
        const savedEval = evaluationsMap[evalKey] || {};

        // Buscar si existe un reporte entregado para el mes correspondiente
        const monthReport = reports.find(
          (r) => normalize(r.report_month) === normalize(mName)
        );

        const hasReportVideos = monthReport && Array.isArray(monthReport.videos) && monthReport.videos.length > 0;
        const hasReportComment = monthReport && monthReport.video_comment && monthReport.video_comment.trim().length > 0;
        
        // Estado por defecto detectado automáticamente desde BD
        const autoDelivered = Boolean(monthReport && (hasReportVideos || hasReportComment));

        // Subido status: si no hay valor manual guardado, asumir 'si' si autoDelivered es true, sino 'no'
        const subidoStatus = savedEval.subido !== undefined 
          ? savedEval.subido 
          : (autoDelivered ? "si" : "no");

        const calidad = savedEval.calidad || (autoDelivered ? "Óptima" : "Sin evaluar");
        const duracion = savedEval.duracion || (autoDelivered ? "1-3 min" : "N/A");
        const obs = savedEval.obs !== undefined ? savedEval.obs : (monthReport?.video_comment || "");

        return {
          vNum,
          monthName: mName,
          autoDelivered,
          subidoStatus,
          calidad,
          duracion,
          obs,
          monthReport,
        };
      });

      const isSelected = selectedProjectIds.has(proj.id);

      processedData.push({
        partnerId: partner.id,
        partnerName: partner.name,
        projectId: proj.id,
        projectName: proj.name,
        videosInfo,
        effectiveVideoMonths,
        isSelected,
      });
    });
  });

  // Filtrar por término de búsqueda
  const filteredData = processedData.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = normalize(searchTerm);
    return (
      normalize(item.partnerName).includes(term) ||
      normalize(item.projectName).includes(term)
    );
  });

  // Datos seleccionados para exportar / copiar
  const exportData = filteredData.filter((item) => item.isSelected);

  // --- FUNCIÓN: COPIAR A GOOGLE DOCS (CON CÓDIGO DE COLORES HTML) ---
  const handleCopyToDocs = async () => {
    if (exportData.length === 0) {
      alert("Por favor selecciona al menos un socio/proyecto para copiar.");
      return;
    }

    const rowsHtml = exportData
      .map((item, idx) => {
        const bgColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        
        const videoCellsHtml = item.videosInfo.map((v) => {
          let statusBg = "#fee2e2";
          let statusText = "#b91c1c";
          let statusLabel = "No entregado";

          if (v.subidoStatus === "si") {
            statusBg = "#dcfce7";
            statusText = "#15803d";
            statusLabel = "Entregado";
          } else if (v.subidoStatus === "pendiente") {
            statusBg = "#fef3c7";
            statusText = "#b45309";
            statusLabel = "Pendiente";
          }

          let qualityHexBg = "#f1f5f9";
          let qualityHexText = "#475569";
          const matchQuality = QUALITY_OPTIONS.find(q => q.label === v.calidad);
          if (matchQuality) {
            qualityHexBg = matchQuality.hexBg;
            qualityHexText = matchQuality.hexText;
          }

          const obsText = v.obs.trim() ? v.obs.replace(/\n/g, "<br/>") : "-";

          return `
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; vertical-align: top;">
              <span style="display: inline-block; background-color: ${statusBg}; color: ${statusText}; font-weight: bold; padding: 3px 8px; border-radius: 6px; font-size: 11px; margin-bottom: 4px;">
                ${statusLabel}
              </span>
            </td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 11px;">
              <div style="margin-bottom: 3px;">
                <strong>Calidad:</strong> <span style="background-color: ${qualityHexBg}; color: ${qualityHexText}; font-weight: bold; padding: 1px 5px; border-radius: 4px;">${v.calidad}</span>
              </div>
              <div style="margin-bottom: 3px; color: #475569;">
                <strong>Duración:</strong> ${v.duracion}
              </div>
              <div style="color: #334155; font-style: italic; border-top: 1px dashed #e2e8f0; padding-top: 3px; margin-top: 3px;">
                ${obsText}
              </div>
            </td>
          `;
        }).join("");

        return `
          <tr style="background-color: ${bgColor}; font-size: 12px;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a; vertical-align: top;">
              ${item.partnerName}<br/>
              <span style="font-size: 11px; font-weight: normal; color: #64748b;">${item.projectName}</span>
            </td>
            ${videoCellsHtml}
          </tr>
        `;
      })
      .join("");

    const headerVideoColsHtml = videoMonthsList.map((m, idx) => `
      <th style="padding: 10px; border: 1px solid #0f172a; text-align: center; width: 110px;">Video ${idx + 1}<br/><span style="font-size: 10px; font-weight: normal; opacity: 0.8;">(${m})</span></th>
      <th style="padding: 10px; border: 1px solid #0f172a; text-align: left; min-width: 180px;">Características / Obs. Video ${idx + 1}</th>
    `).join("");

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b;">
        <h2 style="color: #0f172a; margin-bottom: 4px;">Acción Andina - Reporte Consolidado de Videos Entregados</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 16px;">
          <strong>Temporada:</strong> ${selectedSeason} | <strong>Socios Incluidos:</strong> ${exportData.length}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 12px; text-align: left;">
              <th style="padding: 10px; border: 1px solid #0f172a; min-w: 180px;">Socio / Paisaje</th>
              ${headerVideoColsHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const plainText = exportData
      .map(
        (d) =>
          `* ${d.partnerName} (${d.projectName})\n` +
          d.videosInfo
            .map(
              (v) =>
                `  - Video ${v.vNum} (${v.monthName}): Estado=${v.subidoStatus === "si" ? "Entregado" : v.subidoStatus === "pendiente" ? "Pendiente" : "No entregado"} | Calidad=${v.calidad} | Duración=${v.duracion}${v.obs ? ` | Obs: ${v.obs}` : ""}`
            )
            .join("\n")
      )
      .join("\n\n");

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          "text/html": new Blob([fullHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // --- FUNCIÓN: EXPORTAR A EXCEL ---
  const handleExportExcel = () => {
    if (exportData.length === 0) {
      alert("Por favor selecciona al menos un socio/proyecto para exportar.");
      return;
    }

    const exportRows = exportData.map((d) => {
      const rowObj = {
        Socio: d.partnerName,
        Paisaje: d.projectName,
      };

      d.videosInfo.forEach((v, idx) => {
        const vLabel = `Video ${idx + 1} (${v.monthName})`;
        rowObj[`${vLabel} - Estado`] = v.subidoStatus === "si" ? "Entregado" : v.subidoStatus === "pendiente" ? "Pendiente" : "No entregado";
        rowObj[`${vLabel} - Calidad`] = v.calidad;
        rowObj[`${vLabel} - Duración`] = v.duracion;
        rowObj[`${vLabel} - Observación`] = v.obs || "-";
      });

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Videos");
    XLSX.writeFile(
      workbook,
      `Reporte_Videos_Entregados_${selectedSeason}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER DEL MODAL */}
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30">
                <Video className="text-indigo-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                  Reporte Consolidado de Videos Entregados
                </h2>
                <p className="text-xs text-indigo-200 font-medium">
                  Control y evaluación directa de los 3 videos de temporada por socio.
                </p>
              </div>
            </div>
          </div>

          {/* CONTROLES DEL HEADER */}
          <div className="flex flex-wrap items-center gap-3">
            {/* SELECTOR TEMPORADA */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10">
              <Calendar size={14} className="text-indigo-300" />
              <span>Temporada:</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-transparent font-black text-white focus:outline-none cursor-pointer"
              >
                {availableSeasons.map((s) => (
                  <option key={s} value={s} className="text-gray-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN CERRAR */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer ml-auto md:ml-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS Y ACCIONES DE EXPORTACIÓN */}
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* BUSCADOR RÁPIDO Y MARCAR TODOS */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar socio o paisaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              {selectedProjectIds.size === allProjectIds.length && allProjectIds.length > 0 ? (
                <>
                  <CheckSquare size={14} className="text-indigo-600" />
                  <span>Desmarcar Todos ({selectedProjectIds.size})</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-gray-400" />
                  <span>Marcar Todos ({selectedProjectIds.size}/{allProjectIds.length})</span>
                </>
              )}
            </button>
          </div>

          {/* BOTONES DE EXPORTACIÓN */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel ({exportData.length})</span>
            </button>

            <button
              onClick={handleCopyToDocs}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black transition-all shadow-md active:scale-95 text-white cursor-pointer ${
                copied
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "¡Copiado para Google Docs!" : `Copiar para Docs (${exportData.length})`}</span>
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE VISTA GENERAL (6 COLUMNAS DE VIDEOS + SOCIO) */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white uppercase text-[10px] tracking-wider font-black">
                  <th className="p-3.5 border-b border-gray-800 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.size === allProjectIds.length && allProjectIds.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 border-b border-gray-800 min-w-[190px]">
                    Socio / Paisaje
                  </th>
                  {videoMonthsList.map((m, idx) => (
                    <th key={idx} colSpan={2} className="p-3.5 border-b border-gray-800 text-center border-l border-gray-800">
                      <div className="text-indigo-300 font-black text-xs uppercase tracking-wider">
                        Video {idx + 1}
                      </div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        ({m})
                      </div>
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-800 text-slate-300 uppercase text-[9px] tracking-wider font-bold">
                  <th className="p-2 border-b border-gray-800 text-center"></th>
                  <th className="p-2 border-b border-gray-800"></th>
                  {videoMonthsList.map((_, idx) => (
                    <tr key={idx} className="contents">
                      <th className="p-2 border-b border-gray-800 text-center border-l border-gray-700 min-w-[110px]">
                        Estado
                      </th>
                      <th className="p-2 border-b border-gray-800 min-w-[220px]">
                        Características / Obs.
                      </th>
                    </tr>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                      No se encontraron socios o proyectos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={item.projectId}
                        className={`hover:bg-slate-50 transition-colors ${
                          !item.isSelected ? "opacity-50 bg-gray-50" : isEven ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        {/* CHECKBOX SELECCIÓN */}
                        <td className="p-3.5 text-center align-top">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => toggleProjectSelection(item.projectId)}
                            className="rounded accent-indigo-600 cursor-pointer w-4 h-4 mt-1"
                          />
                        </td>

                        {/* SOCIO Y PAISAJE */}
                        <td className="p-3.5 font-bold text-gray-900 align-top">
                          <div className="text-sm font-black text-slate-900">
                            {item.partnerName}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {item.projectName}
                          </div>
                        </td>

                        {/* COLUMNAS PARA LOS 3 VIDEOS */}
                        {item.videosInfo.map((v) => (
                          <tr key={v.vNum} className="contents">
                            {/* ESTADO DE ENTREGA */}
                            <td className="p-3 text-center align-top border-l border-gray-200">
                              <select
                                value={v.subidoStatus}
                                onChange={(e) =>
                                  handleEvaluationChange(
                                    item.projectId,
                                    v.vNum,
                                    "subido",
                                    e.target.value
                                  )
                                }
                                className={`text-[11px] font-black p-1.5 rounded-lg border focus:outline-none cursor-pointer text-center w-full ${
                                  v.subidoStatus === "si"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : v.subidoStatus === "pendiente"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-red-100 text-red-800 border-red-300"
                                }`}
                              >
                                <option value="si">✓ Entregado</option>
                                <option value="no">✕ No entregado</option>
                                <option value="pendiente">⏱ Pendiente</option>
                              </select>
                              {v.autoDelivered && v.subidoStatus === "si" && (
                                <span className="text-[9px] text-emerald-600 font-bold block mt-1">
                                  Detectado en reportes
                                </span>
                              )}
                            </td>

                            {/* CARACTERÍSTICAS / OBSERVACIÓN */}
                            <td className="p-3 align-top space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* SELECTOR CALIDAD */}
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                  <span>Calidad:</span>
                                  <select
                                    value={v.calidad}
                                    onChange={(e) =>
                                      handleEvaluationChange(
                                        item.projectId,
                                        v.vNum,
                                        "calidad",
                                        e.target.value
                                      )
                                    }
                                    className="bg-gray-100 text-gray-800 text-[10px] font-bold p-1 rounded-md border border-gray-200 focus:outline-none cursor-pointer"
                                  >
                                    {QUALITY_OPTIONS.map((q) => (
                                      <option key={q.label} value={q.label}>
                                        {q.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* SELECTOR DURACIÓN */}
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                  <span>Duración:</span>
                                  <select
                                    value={v.duracion}
                                    onChange={(e) =>
                                      handleEvaluationChange(
                                        item.projectId,
                                        v.vNum,
                                        "duracion",
                                        e.target.value
                                      )
                                    }
                                    className="bg-gray-100 text-gray-800 text-[10px] font-bold p-1 rounded-md border border-gray-200 focus:outline-none cursor-pointer"
                                  >
                                    {DURATION_OPTIONS.map((d) => (
                                      <option key={d} value={d}>
                                        {d}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* OBSERVACIÓN CORTE / NOTA */}
                              <textarea
                                rows={2}
                                value={v.obs}
                                onChange={(e) =>
                                  handleEvaluationChange(
                                    item.projectId,
                                    v.vNum,
                                    "obs",
                                    e.target.value
                                  )
                                }
                                placeholder="Añadir observación o detalle..."
                                className="w-full text-[10px] p-1.5 bg-slate-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y text-gray-800 font-medium placeholder:text-gray-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="bg-slate-100 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            💡 <strong className="text-gray-700">Tip:</strong> Las evaluaciones y observaciones se guardan automáticamente. Al copiar para Google Docs, se conservarán los colores e indicativos.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all cursor-pointer"
          >
            Cerrar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
