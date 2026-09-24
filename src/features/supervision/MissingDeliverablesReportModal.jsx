/**
 * COMPONENTE: MissingDeliverablesReportModal
 * -------------------------------------------
 * Modal / Vista consolidada de reporte de faltantes y acuerdos por socio.
 * 
 * LÓGICA DE NEGOCIO:
 * 1. EVALUACIÓN MES A MES (SIN ACUMULACIÓN REPARTIDA):
 *    - Cada mes se evalúa de manera independiente con tope en 100% (min(subidas/meta, 1)).
 *    - Si un socio sube 30 fotos en marzo con meta 10, marzo es 100%, pero no compensa abril.
 * 2. DETALLE AUTOMÁTICO DE FALTANTES:
 *    - Genera texto explícito con los faltantes (ej: "En Abril faltan 5 fotos", "Falta video 1 de Junio").
 * 3. ACUERDOS CON EL SOCIO:
 *    - Columna editable para registrar acuerdos directos con la ONG sobre cómo regularizarán.
 * 4. COPIADO EN FORMATO GOOGLE DOCS / EXCEL:
 *    - Formato HTML enriquecido compatible con copiar/pegar directo en Google Docs.
 */

import { useState, useEffect } from "react";
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
  Save,
  MessageSquare,
  Sparkles,
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

  // Determinar mes actual por defecto al abrir
  useEffect(() => {
    if (initialSeason) {
      setSelectedSeason(initialSeason);
    }
  }, [initialSeason]);

  useEffect(() => {
    const currentMonthIdx = new Date().getMonth();
    setCutoffMonth(ALL_MONTHS[currentMonthIdx] || "Septiembre");
  }, []);

  // Cargar acuerdos guardados de localStorage al cambiar de temporada
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

  // Guardar acuerdos en localStorage
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

  if (!isOpen) return null;

  // --- LÓGICA DE CÁLCULO DE SECUENCIA DE MESES ---
  const getElapsedMonthsForProject = (proj, seasonName, targetCutoff) => {
    const config = getProjectConfigForSeason(proj, seasonName);
    const startDateStr = config?.start_date || proj.start_date;
    const duration = config?.season_duration_months || 12;

    let startMonthIdx = 0; // Por defecto Enero (0)
    if (startDateStr) {
      const d = new Date(startDateStr + "T12:00:00");
      if (!isNaN(d.getTime())) {
        startMonthIdx = d.getMonth();
      }
    }

    // Generar la secuencia de meses según duración
    const monthSequence = [];
    for (let i = 0; i < duration; i++) {
      const mIdx = (startMonthIdx + i) % 12;
      monthSequence.push(ALL_MONTHS[mIdx]);
    }

    // Filtrar hasta el mes de corte inclusivo
    const cutoffIdxInSeq = monthSequence.findIndex(
      (m) => normalize(m) === normalize(targetCutoff)
    );

    if (cutoffIdxInSeq === -1) {
      // Si el mes de corte no está en la secuencia, tomar toda la secuencia transcurrida
      return monthSequence;
    }

    return monthSequence.slice(0, cutoffIdxInSeq + 1);
  };

  // --- PROCESAMIENTO PRINCIPAL DE PROYECTOS Y FALTANTES ---
  const processedData = [];

  partners.forEach((partner) => {
    (partner.projects || []).forEach((proj) => {
      const config = getProjectConfigForSeason(proj, selectedSeason);
      const photoTarget = config?.monthly_photos_target || 10;
      const postTarget = config?.monthly_posts_target || 4;

      // Reportes filtrados por la temporada seleccionada
      const reports = (proj.monthly_reports || []).filter(
        (r) => (r.season_name || "").trim() === selectedSeason.trim()
      );

      const elapsedMonths = getElapsedMonthsForProject(
        proj,
        selectedSeason,
        cutoffMonth
      );

      let photoComplianceSum = 0;
      let postComplianceSum = 0;
      const missingObservations = [];

      // Evaluamos mes por mes transcurrido
      elapsedMonths.forEach((monthName) => {
        const report = reports.find(
          (r) => normalize(r.report_month) === normalize(monthName)
        );

        const photoCount = report ? parseInt(report.photo_count) || 0 : 0;
        const postCount = report ? parseInt(report.post_count) || 0 : 0;

        // Cumplimiento capped al 100% por mes (1.0)
        const photoRatio = Math.min(photoCount / (photoTarget || 1), 1.0);
        const postRatio = Math.min(postCount / (postTarget || 1), 1.0);

        photoComplianceSum += photoRatio;
        postComplianceSum += postRatio;

        // Registro de observaciones si hay déficit
        if (photoCount < photoTarget) {
          if (photoCount === 0) {
            missingObservations.push(`En ${monthName} no subió fotos (meta: ${photoTarget})`);
          } else {
            const diff = photoTarget - photoCount;
            missingObservations.push(`En ${monthName} faltan ${diff} fotos (${photoCount}/${photoTarget})`);
          }
        }

        if (postCount < postTarget) {
          if (postCount === 0) {
            missingObservations.push(`En ${monthName} no subió publicaciones (meta: ${postTarget})`);
          } else {
            const diff = postTarget - postCount;
            missingObservations.push(`En ${monthName} faltan ${diff} publicaciones (${postCount}/${postTarget})`);
          }
        }
      });

      const totalElapsed = elapsedMonths.length || 1;
      const pctFotos = Math.round((photoComplianceSum / totalElapsed) * 100);
      const pctPosts = Math.round((postComplianceSum / totalElapsed) * 100);

      // --- EVALUACIÓN DE VIDEOS ---
      const videoMilestoneMonths = Array.isArray(config?.custom_video_months) && config.custom_video_months.length > 0
        ? config.custom_video_months
        : ["Junio", "Octubre", "Marzo"];

      let videosUploadedTotal = 0;
      reports.forEach((r) => {
        if (Array.isArray(r.videos)) {
          videosUploadedTotal += r.videos.length;
        }
      });

      // Contar cuántos hitos de video correspondían hasta el mes de corte
      let videoMilestonesPassed = 0;
      videoMilestoneMonths.forEach((vm) => {
        if (elapsedMonths.some((em) => normalize(em) === normalize(vm))) {
          videoMilestonesPassed += 1;
          // Si el total subido es menor a la cantidad de hitos pasados
          if (videosUploadedTotal < videoMilestonesPassed) {
            missingObservations.push(`Falta entrega de Video de ${vm}`);
          }
        }
      });

      const videoTarget = videoMilestonesPassed > 0 ? videoMilestonesPassed : 1;
      const pctVideos = videoMilestonesPassed > 0
        ? Math.min(Math.round((videosUploadedTotal / videoTarget) * 100), 100)
        : 100;

      // --- EVALUACIÓN DE CAMPAÑAS ---
      let pctCampaigns = 100;
      if (seasonCampaigns.length > 0) {
        const completedCampaignTitles = new Set();
        reports.forEach((r) => {
          if (Array.isArray(r.campaigns)) {
            r.campaigns.forEach((c) => {
              if (c.title) completedCampaignTitles.add(normalize(c.title));
            });
          }
        });

        let missingCampaignCount = 0;
        seasonCampaigns.forEach((sc) => {
          if (!completedCampaignTitles.has(normalize(sc.title))) {
            missingCampaignCount += 1;
            missingObservations.push(`Falta evidencia de campaña: "${sc.title}"`);
          }
        });

        const totalCamps = seasonCampaigns.length;
        pctCampaigns = Math.round(((totalCamps - missingCampaignCount) / totalCamps) * 100);
      }

      // --- PORCENTAJE GENERAL DE SALUD ---
      const pctGeneral = Math.round((pctFotos + pctPosts + pctVideos + pctCampaigns) / 4);

      processedData.push({
        partnerId: partner.id,
        partnerName: partner.name,
        projectId: proj.id,
        projectName: proj.name,
        pctFotos,
        pctPosts,
        pctVideos,
        pctCampaigns,
        pctGeneral,
        missingObservations,
        agreements: agreementsMap[proj.id] || "",
      });
    });
  });

  // --- FUNCIÓN: COPIAR A GOOGLE DOCS (FORMATO HTML RIQUÍSIMO) ---
  const handleCopyToDocs = async () => {
    // Generación de HTML estilizado tipo tabla
    const rowsHtml = processedData
      .map((item, index) => {
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";
        const fotosBadge =
          item.pctFotos < 100
            ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctFotos}%</span>`
            : `<span style="color: #16a34a; font-weight: bold;">${item.pctFotos}%</span>`;

        const postsBadge =
          item.pctPosts < 100
            ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctPosts}%</span>`
            : `<span style="color: #16a34a; font-weight: bold;">${item.pctPosts}%</span>`;

        const videosBadge =
          item.pctVideos < 100
            ? `<span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">${item.pctVideos}%</span>`
            : `<span style="color: #16a34a; font-weight: bold;">${item.pctVideos}%</span>`;

        const generalBadge =
          item.pctGeneral < 80
            ? `<span style="color: #dc2626; font-weight: bold; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">${item.pctGeneral}%</span>`
            : `<span style="color: #16a34a; font-weight: bold;">${item.pctGeneral}%</span>`;

        const obsContent =
          item.missingObservations.length > 0
            ? `<ul style="margin: 0; padding-left: 16px; color: #991b1b;">${item.missingObservations
                .map((obs) => `<li style="margin-bottom: 2px;">${obs}</li>`)
                .join("")}</ul>`
            : `<span style="color: #16a34a; font-weight: 500;">✓ Al día (Sin faltantes)</span>`;

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
          <strong>Temporada:</strong> ${selectedSeason} | <strong>Mes de Corte:</strong> ${cutoffMonth} | <strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString()}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 13px; text-align: left;">
              <th style="padding: 10px; border: 1px solid #0f172a;">Socio / Paisaje</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Fotos</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">% Publicaciones</th>
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

    // Generar versión Plain Text para fallback
    const plainText = processedData
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
      console.error("Error al copiar HTML al portapapeles:", err);
      // Fallback a texto plano
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // --- FUNCIÓN: EXPORTAR A EXCEL ---
  const handleExportExcel = () => {
    const exportRows = processedData.map((d) => ({
      Socio: d.partnerName,
      Paisaje: d.projectName,
      "Fotos (%)": `${d.pctFotos}%`,
      "Publicaciones (%)": `${d.pctPosts}%`,
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
                  Evaluación de cumplimiento mes a mes por socio y registro de compromisos.
                </p>
              </div>
            </div>
          </div>

          {/* FILTROS Y CONTROLES */}
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-auto md:ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ACCIONES SUPERIORES / EXPORTAR */}
        <div className="bg-slate-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600 font-semibold">
            <Sparkles size={16} className="text-brand" />
            <span>
              Evaluando hasta <strong className="text-gray-900">{cutoffMonth}</strong> en temporada{" "}
              <strong className="text-gray-900">{selectedSeason}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleCopyToDocs}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black transition-all shadow-md active:scale-95 text-white ${
                copied
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-brand hover:brightness-110 shadow-brand/20"
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "¡Copiado para Google Docs!" : "Copiar para Google Docs"}</span>
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white uppercase text-[10px] tracking-wider font-black">
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
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                      No se encontraron socios o proyectos configurados para esta temporada.
                    </td>
                  </tr>
                ) : (
                  processedData.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={item.projectId}
                        className={`hover:bg-slate-50 transition-colors ${
                          isEven ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        {/* SOCIO Y PAISAJE */}
                        <td className="p-3.5 font-bold text-gray-900">
                          <div className="text-sm font-black text-slate-900">
                            {item.partnerName}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {item.projectName}
                          </div>
                        </td>

                        {/* % FOTOS */}
                        <td className="p-3.5 text-center font-black">
                          {item.pctFotos < 100 ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctFotos}%
                            </span>
                          ) : (
                            <span className="text-emerald-600">{item.pctFotos}%</span>
                          )}
                        </td>

                        {/* % POSTS */}
                        <td className="p-3.5 text-center font-black">
                          {item.pctPosts < 100 ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctPosts}%
                            </span>
                          ) : (
                            <span className="text-emerald-600">{item.pctPosts}%</span>
                          )}
                        </td>

                        {/* % VIDEOS */}
                        <td className="p-3.5 text-center font-black">
                          {item.pctVideos < 100 ? (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs border border-red-200">
                              {item.pctVideos}%
                            </span>
                          ) : (
                            <span className="text-emerald-600">{item.pctVideos}%</span>
                          )}
                        </td>

                        {/* % CAMPAÑAS */}
                        <td className="p-3.5 text-center font-black text-gray-700">
                          {item.pctCampaigns}%
                        </td>

                        {/* % GENERAL */}
                        <td className="p-3.5 text-center font-black">
                          {item.pctGeneral < 80 ? (
                            <span className="inline-block bg-red-50 text-red-600 px-2.5 py-1 rounded-xl text-xs border border-red-300 font-extrabold shadow-sm">
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
            💡 <strong className="text-gray-700">Nota:</strong> El botón "Copiar para Google Docs" conserva la tabla, estilos y colores para pegarla directamente en cualquier documento.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
