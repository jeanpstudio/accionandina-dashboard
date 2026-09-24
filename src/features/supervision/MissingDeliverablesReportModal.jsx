/**
 * COMPONENTE: MissingDeliverablesReportModal
 * -------------------------------------------
 * Modal / Vista consolidada de reporte de faltantes y acuerdos por socio.
 * 
 * LÓGICA DE NEGOCIO Y MEJORAS:
 * 1. SELECCIÓN / FILTRADO DE SOCIOS:
 *    - Casillas de verificación (checkboxes) por proyecto para incluir / excluir socios del reporte.
 *    - Botón de "Marcar Todos / Desmarcar Todos" y buscador rápido.
 * 2. COLORES SEGÚN AVANCE ESPERADO (ALINEADO CON HISTORIAL):
 *    - Si un socio está al día en el avance transcurrido (ej: 42% en mes 5), se muestra en VERDE (Emerald).
 *    - ÚNICAMENTE se muestra en ROJO cuando existe un déficit real o faltante pendiente en ese rubro.
 * 3. PORCENTAJES EN ENTEROS (REDONDEO RIGUROSO):
 *    - Todos los porcentajes se redondean sin decimales (Math.round).
 * 4. EXPORTACIÓN GOOGLE DOCS / EXCEL:
 *    - Solo exporta los socios y proyectos seleccionados en la vista.
 */

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Calendar,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { getProjectConfigForSeason } from "../../lib/projectConfig";

const ALL_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

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

const normalize = (str) => (str ? str.toString().toLowerCase().trim() : "");

export default function MissingDeliverablesReportModal({
  isOpen,
  onClose,
  partners = [],
  availableSeasons = [],
  activeSeason: initialSeason = "",
  seasonCampaigns = [],
}) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [cutoffMonth, setCutoffMonth] = useState("");
  const [copied, setCopied] = useState(false);
  const [agreementsMap, setAgreementsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());

  // Inicializar temporada
  useEffect(() => {
    if (initialSeason) {
      setSelectedSeason(initialSeason);
    }
  }, [initialSeason]);

  // Inicializar mes de corte al mes actual
  useEffect(() => {
    const currentMonthIdx = new Date().getMonth();
    setCutoffMonth(ALL_MONTHS[currentMonthIdx] || "Septiembre");
  }, []);

  // Cargar acuerdos guardados desde localStorage
  useEffect(() => {
    if (!selectedSeason) return;
    try {
      const stored = localStorage.getItem(`aa_agreements_${selectedSeason}`);
      if (stored) {
        setAgreementsMap(JSON.parse(stored));
      } else {
        setAgreementsMap({});
      }
    } catch (e) {
      console.error("Error leyendo acuerdos de localStorage:", e);
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

  // Al cargar socios, seleccionar todos los proyectos por defecto
  useEffect(() => {
    if (allProjectIds.length > 0) {
      setSelectedProjectIds(new Set(allProjectIds));
    }
  }, [allProjectIds]);

  const handleAgreementChange = (projectId, text) => {
    const updated = { ...agreementsMap, [projectId]: text };
    setAgreementsMap(updated);
    try {
      localStorage.setItem(
        `aa_agreements_${selectedSeason}`,
        JSON.stringify(updated)
      );
    } catch (e) {
      console.error("Error guardando acuerdos:", e);
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

  // --- OBTENER SECUENCIA DE MESES TRANSCURRIDOS HASTA EL MES DE CORTE ---
  const getElapsedMonthsForProject = (proj, seasonName, targetCutoff) => {
    const config = getProjectConfigForSeason(proj, seasonName);
    const startDateStr = config?.start_date || proj.start_date;
    const duration = parseInt(config?.season_duration_months || 12);

    let startMonthIdx = 0; // Default Enero (0)
    if (startDateStr) {
      const d = new Date(startDateStr + "T12:00:00");
      if (!isNaN(d.getTime())) {
        startMonthIdx = d.getMonth();
      }
    }

    const monthSequence = [];
    for (let i = 0; i < duration; i++) {
      const mIdx = (startMonthIdx + i) % 12;
      monthSequence.push(ALL_MONTHS[mIdx]);
    }

    const cutoffIdxInSeq = monthSequence.findIndex(
      (m) => normalize(m) === normalize(targetCutoff)
    );

    if (cutoffIdxInSeq === -1) {
      return monthSequence;
    }

    return monthSequence.slice(0, cutoffIdxInSeq + 1);
  };

  // --- CÁLCULO PRINCIPAL Y DETALLE DE FALTANTES ---
  const allProcessedData = [];

  partners.forEach((partner) => {
    (partner.projects || []).forEach((proj) => {
      const config = getProjectConfigForSeason(proj, selectedSeason);
      const seasonMonths = parseInt(config?.season_duration_months || 12);
      const maxMonthWeight = 100 / seasonMonths;
      const targetPhotos = parseInt(config?.monthly_photos_target || 10);
      const targetPosts = parseInt(config?.monthly_posts_target || 4);

      const reports = (proj.monthly_reports || []).filter(
        (r) => (r.season_name || "").trim() === selectedSeason.trim()
      );

      const elapsedMonths = getElapsedMonthsForProject(
        proj,
        selectedSeason,
        cutoffMonth
      );

      let accPhotoPercent = 0;
      let accPostPercent = 0;
      const missingObservations = [];
      let photoHasDeficit = false;
      let postHasDeficit = false;

      elapsedMonths.forEach((monthName) => {
        const report = reports.find(
          (r) => normalize(r.report_month) === normalize(monthName)
        );

        const photoCount = report
          ? parseInt(report.photo_count ?? report.photos ?? 0) || 0
          : 0;

        const postCount = report
          ? parseInt(report.post_count ?? report.posts_count ?? report.posts ?? 0) || 0
          : 0;

        if (!report) {
          photoHasDeficit = true;
          postHasDeficit = true;
          missingObservations.push(
            `En ${monthName} no hay reporte (faltan ${targetPhotos} fotos y ${targetPosts} posts)`
          );
        } else {
          const photoCompliance = Math.min(photoCount / (targetPhotos || 1), 1.0);
          const postCompliance = Math.min(postCount / (targetPosts || 1), 1.0);

          accPhotoPercent += photoCompliance * maxMonthWeight;
          accPostPercent += postCompliance * maxMonthWeight;

          if (photoCount < targetPhotos) {
            photoHasDeficit = true;
            if (photoCount === 0) {
              missingObservations.push(
                `En ${monthName} no subió fotos (meta: ${targetPhotos})`
              );
            } else {
              const diff = targetPhotos - photoCount;
              missingObservations.push(
                `En ${monthName} faltan ${diff} foto${diff > 1 ? "s" : ""} (${photoCount}/${targetPhotos})`
              );
            }
          }

          if (postCount < targetPosts) {
            postHasDeficit = true;
            if (postCount === 0) {
              missingObservations.push(
                `En ${monthName} no subió posts (meta: ${targetPosts})`
              );
            } else {
              const diff = targetPosts - postCount;
              missingObservations.push(
                `En ${monthName} faltan ${diff} post${diff > 1 ? "s" : ""} (${postCount}/${targetPosts})`
              );
            }
          }
        }
      });

      // Redondeo riguroso sin decimales (Math.round)
      const pctFotos = Math.round(accPhotoPercent);
      const pctPosts = Math.round(accPostPercent);
      const pctGeneral = Math.round((pctFotos + pctPosts) / 2);

      // --- EVALUACIÓN DE VIDEOS ---
      const effectiveVideoMonths = proj.override_season_rules && Array.isArray(proj.custom_video_months) && proj.custom_video_months.length > 0
        ? proj.custom_video_months
        : (Array.isArray(config?.custom_video_months) && config.custom_video_months.length > 0
            ? config.custom_video_months
            : ["Junio", "Octubre", "Marzo"]);

      let totalVideosCount = 0;
      reports.forEach((r) => {
        if (Array.isArray(r.videos)) {
          totalVideosCount += r.videos.length;
        }
      });

      const cutoffIdx = ALL_MONTHS.findIndex(m => normalize(m) === normalize(cutoffMonth));
      const expectedVideoCount = effectiveVideoMonths.filter(
        m => (monthMap[normalize(m)] ?? 99) <= (cutoffIdx >= 0 ? cutoffIdx : 11)
      ).length;

      let videoHasDeficit = false;
      const missingVideos = expectedVideoCount - totalVideosCount;
      if (missingVideos > 0) {
        videoHasDeficit = true;
        missingObservations.push(
          `Falta${missingVideos > 1 ? "n" : ""} ${missingVideos} video${missingVideos > 1 ? "s" : ""} de temporada`
        );
      }

      const pctVideos = expectedVideoCount > 0
        ? Math.min(Math.round((totalVideosCount / expectedVideoCount) * 100), 100)
        : 100;

      // --- EVALUACIÓN DE CAMPAÑAS ---
      let pctCampaigns = 100;
      let campaignHasDeficit = false;
      if (seasonCampaigns.length > 0) {
        const completedCampaignTitles = new Set();
        reports.forEach((r) => {
          if (Array.isArray(r.campaigns)) {
            r.campaigns.forEach((c) => {
              if (c.title) completedCampaignTitles.add(normalize(c.title));
            });
          }
        });

        let missingCampCount = 0;
        seasonCampaigns.forEach((sc) => {
          if (!completedCampaignTitles.has(normalize(sc.title))) {
            missingCampCount += 1;
            campaignHasDeficit = true;
            missingObservations.push(`Falta evidencia de campaña: "${sc.title}"`);
          }
        });

        pctCampaigns = Math.round(
          ((seasonCampaigns.length - missingCampCount) / seasonCampaigns.length) * 100
        );
      }

      allProcessedData.push({
        partnerId: partner.id,
        partnerName: partner.name,
        projectId: proj.id,
        projectName: proj.name,
        pctFotos,
        pctPosts,
        pctVideos,
        pctCampaigns,
        pctGeneral,
        photoHasDeficit,
        postHasDeficit,
        videoHasDeficit,
        campaignHasDeficit,
        missingObservations,
        agreements: agreementsMap[proj.id] || "",
        isSelected: selectedProjectIds.has(proj.id),
      });
    });
  });

  // Filtrado por buscador y por selección de usuario
  const filteredData = allProcessedData.filter((item) => {
    const matchesSearch =
      normalize(item.partnerName).includes(normalize(searchTerm)) ||
      normalize(item.projectName).includes(normalize(searchTerm));
    return matchesSearch;
  });

  // Solo exportar los elementos marcados (isSelected = true)
  const exportData = filteredData.filter((item) => item.isSelected);

  // --- FUNCIÓN: COPIAR A GOOGLE DOCS (FORMATO TABLA HTML EN VERDE Y ROJO SEGÚN FALTANTE) ---
  const handleCopyToDocs = async () => {
    if (exportData.length === 0) {
      alert("Por favor selecciona al menos un socio/proyecto para exportar.");
      return;
    }

    const rowsHtml = exportData
      .map((item, index) => {
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        
        // Estilos de porcentaje: VERDE si está al día, ROJO únicamente si hay déficit real
        const fotosBadge = item.photoHasDeficit
          ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctFotos}%</span>`
          : `<span style="color: #16a34a; font-weight: bold; background-color: #f0fdf4; padding: 2px 6px; border-radius: 4px;">${item.pctFotos}%</span>`;

        const postsBadge = item.postHasDeficit
          ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctPosts}%</span>`
          : `<span style="color: #16a34a; font-weight: bold; background-color: #f0fdf4; padding: 2px 6px; border-radius: 4px;">${item.pctPosts}%</span>`;

        const videosBadge = item.videoHasDeficit
          ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctVideos}%</span>`
          : `<span style="color: #16a34a; font-weight: bold; background-color: #f0fdf4; padding: 2px 6px; border-radius: 4px;">${item.pctVideos}%</span>`;

        const generalBadge = item.missingObservations.length > 0
          ? `<span style="color: #dc2626; font-weight: bold; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">${item.pctGeneral}%</span>`
          : `<span style="color: #16a34a; font-weight: bold; background-color: #f0fdf4; padding: 2px 6px; border-radius: 4px; border: 1px solid #bbf7d0;">${item.pctGeneral}%</span>`;

        const obsContent =
          item.missingObservations.length > 0
            ? `<ul style="margin: 0; padding-left: 16px; color: #991b1b;">${item.missingObservations
                .map((obs) => `<li style="margin-bottom: 2px;">${obs}</li>`)
                .join("")}</ul>`
            : `<span style="color: #16a34a; font-weight: 600;">✓ Al día (Sin faltantes)</span>`;

        const agreementContent = item.agreements.trim()
          ? `<span style="color: #1e293b;">${item.agreements.replace(/\n/g, "<br/>")}</span>`
          : `<span style="color: #94a3b8; font-style: italic;">Sin acuerdos registrados</span>`;

        return `
          <tr style="background-color: ${bgColor}; font-size: 13px;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">
              ${item.partnerName}<br/>
              <span style="font-size: 11px; font-weight: normal; color: #64748b;">${item.projectName}</span>
            </td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${fotosBadge}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${postsBadge}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${videosBadge}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${item.pctCampaigns}%</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${generalBadge}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top;">${obsContent}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top;">${agreementContent}</td>
          </tr>
        `;
      })
      .join("");

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b;">
        <h2 style="color: #0f172a; margin-bottom: 4px;">Acción Andina - Reporte Consolidado de Faltantes y Acuerdos</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 16px;">
          <strong>Temporada:</strong> ${selectedSeason} | <strong>Mes de Corte:</strong> ${cutoffMonth} | <strong>Socios incluidos:</strong> ${exportData.length}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 13px; text-align: left;">
              <th style="padding: 10px; border: 1px solid #0f172a;">Socio / Paisaje</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Fotos</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Posts</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Videos</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Campañas</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% General</th>
              <th style="padding: 10px; border: 1px solid #0f172a;">Observaciones (Detalle de Faltantes)</th>
              <th style="padding: 10px; border: 1px solid #0f172a;">Acuerdos con el Socio</th>
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
          `* ${d.partnerName} (${d.projectName})\n  - % Fotos: ${d.pctFotos}% | % Posts: ${d.pctPosts}% | % Videos: ${d.pctVideos}% | % General: ${d.pctGeneral}%\n  - Faltantes: ${
            d.missingObservations.length > 0
              ? d.missingObservations.join("; ")
              : "Al día"
          }\n  - Acuerdos: ${d.agreements || "Ninguno"}\n`
      )
      .join("\n");

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

  // --- FUNCIÓN: EXPORTAR A EXCEL (SOLO SELECCIONADOS) ---
  const handleExportExcel = () => {
    if (exportData.length === 0) {
      alert("Por favor selecciona al menos un socio/proyecto para exportar.");
      return;
    }

    const exportRows = exportData.map((d) => ({
      Socio: d.partnerName,
      Paisaje: d.projectName,
      "Fotos (%)": `${d.pctFotos}%`,
      "Posts (%)": `${d.pctPosts}%`,
      "Videos (%)": `${d.pctVideos}%`,
      "Campañas (%)": `${d.pctCampaigns}%`,
      "Cumplimiento General (%)": `${d.pctGeneral}%`,
      "Detalle de Faltantes": d.missingObservations.join(" | ") || "Al día",
      "Acuerdos con el Socio": d.agreements || "Sin acuerdos",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Faltantes");
    XLSX.writeFile(
      workbook,
      `Reporte_Faltantes_${selectedSeason}_${cutoffMonth}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-brand text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  Resumen Consolidado de Faltantes y Acuerdos
                </h2>
                <p className="text-xs text-gray-300 font-medium">
                  Filtrado de socios, cálculo entero de avance y registro de acuerdos.
                </p>
              </div>
            </div>
          </div>

          {/* CONTROLES PRINCIPALES */}
          <div className="flex flex-wrap items-center gap-3">
            {/* SELECTOR TEMPORADA */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10">
              <Calendar size={14} className="text-gray-300" />
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

            {/* SELECTOR MES DE CORTE */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10">
              <Filter size={14} className="text-gray-300" />
              <span>Mes de Corte:</span>
              <select
                value={cutoffMonth}
                onChange={(e) => setCutoffMonth(e.target.value)}
                className="bg-transparent font-black text-white focus:outline-none cursor-pointer"
              >
                {ALL_MONTHS.map((m) => (
                  <option key={m} value={m} className="text-gray-900">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN CERRAR */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-auto md:ml-2 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS: BUSCADOR, BOTÓN DE SELECCIÓN Y EXPORTAR */}
        <div className="bg-slate-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* BUSCADOR */}
            <div className="relative min-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar socio o paisaje..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* BOTÓN MARCAR / DESMARCAR TODOS */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-xl font-bold text-gray-700 transition-all shadow-sm cursor-pointer"
            >
              {selectedProjectIds.size === allProjectIds.length ? (
                <>
                  <CheckSquare size={14} className="text-brand" />
                  <span>Desmarcar Todos</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-gray-400" />
                  <span>Marcar Todos ({selectedProjectIds.size}/{allProjectIds.length})</span>
                </>
              )}
            </button>
          </div>

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
                  : "bg-brand hover:brightness-110 shadow-brand/20"
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "¡Copiado para Google Docs!" : `Copiar para Docs (${exportData.length})`}</span>
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
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
                      className="rounded accent-brand cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 border-b border-gray-800 min-w-[200px]">
                    Socio / Paisaje
                  </th>
                  <th className="p-3.5 border-b border-gray-800 text-center min-w-[80px]">
                    % Fotos
                  </th>
                  <th className="p-3.5 border-b border-gray-800 text-center min-w-[90px]">
                    % Posts
                  </th>
                  <th className="p-3.5 border-b border-gray-800 text-center min-w-[80px]">
                    % Videos
                  </th>
                  <th className="p-3.5 border-b border-gray-800 text-center min-w-[90px]">
                    % Campañas
                  </th>
                  <th className="p-3.5 border-b border-gray-800 text-center min-w-[90px]">
                    % General
                  </th>
                  <th className="p-3.5 border-b border-gray-800 min-w-[300px]">
                    Observaciones (Detalle de Faltantes)
                  </th>
                  <th className="p-3.5 border-b border-gray-800 min-w-[280px]">
                    Acuerdos con el Socio (Editable)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-medium">
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
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => toggleProjectSelection(item.projectId)}
                            className="rounded accent-brand cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* SOCIO Y PAISAJE */}
                        <td className="p-3.5 font-bold text-gray-900">
                          <div className="text-sm font-black text-slate-900">
                            {item.partnerName}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {item.projectName}
                          </div>
                        </td>

                        {/* % FOTOS (VERDE SI AL DÍA, ROJO SI HAY DÉFICIT REAL) */}
                        <td className="p-3.5 text-center font-black">
                          {item.photoHasDeficit ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctFotos}%
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs border border-emerald-200">
                              {item.pctFotos}%
                            </span>
                          )}
                        </td>

                        {/* % POSTS (VERDE SI AL DÍA, ROJO SI HAY DÉFICIT REAL) */}
                        <td className="p-3.5 text-center font-black">
                          {item.postHasDeficit ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctPosts}%
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs border border-emerald-200">
                              {item.pctPosts}%
                            </span>
                          )}
                        </td>

                        {/* % VIDEOS */}
                        <td className="p-3.5 text-center font-black">
                          {item.videoHasDeficit ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctVideos}%
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs border border-emerald-200">
                              {item.pctVideos}%
                            </span>
                          )}
                        </td>

                        {/* % CAMPAÑAS */}
                        <td className="p-3.5 text-center font-black text-gray-700">
                          {item.pctCampaigns}%
                        </td>

                        {/* % GENERAL */}
                        <td className="p-3.5 text-center font-black">
                          {item.missingObservations.length > 0 ? (
                            <span className="inline-block bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl text-xs border border-amber-300 font-extrabold shadow-sm">
                              {item.pctGeneral}%
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl text-xs border border-emerald-300 font-extrabold">
                              {item.pctGeneral}%
                            </span>
                          )}
                        </td>

                        {/* OBSERVACIONES / FALTANTES */}
                        <td className="p-3.5 align-top">
                          {item.missingObservations.length > 0 ? (
                            <ul className="space-y-1 text-[11px] text-red-800 font-medium">
                              {item.missingObservations.map((obs, oIdx) => (
                                <li key={oIdx} className="flex items-start gap-1.5">
                                  <span className="text-red-500 font-bold">•</span>
                                  <span>{obs}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 size={14} />
                              <span>Al día (Sin faltantes)</span>
                            </div>
                          )}
                        </td>

                        {/* ACUERDOS CON EL SOCIO (EDITABLE) */}
                        <td className="p-3.5 align-top">
                          <div className="relative">
                            <textarea
                              rows={2}
                              value={agreementsMap[item.projectId] || ""}
                              onChange={(e) =>
                                handleAgreementChange(item.projectId, e.target.value)
                              }
                              placeholder="Escribe aquí acuerdos con el socio..."
                              className="w-full text-[11px] p-2 bg-amber-50/40 border border-amber-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all resize-y text-gray-800 font-medium placeholder:text-gray-400"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <div>
            💡 <strong className="text-gray-700">Tip:</strong> Usa las casillas de verificación para incluir/excluir socios del reporte final.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
