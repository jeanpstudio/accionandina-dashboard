import { useState, useRef, useEffect } from "react";
import { supabase } from "../../app/supabase";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Monitor,
  Smartphone,
  Code,
  Copy,
  UploadCloud,
  ImageIcon,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  FileText,
  Video,
  Calendar,
  Grid,
  Mail,
  Check,
  Bold,
  Italic,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layout,
  Type,
  X,
  Link as LinkIcon,
  Palette,
  ChevronDown,
  Send,
  GripVertical,
} from "lucide-react";

// --- PALETA CORPORATIVA ---
const COLORS = {
  primary: "#005E31",
  secondary: "#004B27",
  accent: "#D23F2E",
  text: "#374151",
  bg: "#F3F4F6",
};

const BLOCK_TYPES = [
  { id: "header", label: "Cabecera", icon: Layout, desc: "Logos y Fondo" },
  {
    id: "hero",
    label: "Imagen Hero",
    icon: ImageIcon,
    desc: "Foto grande + Título",
  },
  {
    id: "hero_bg",
    label: "Banner Fondo",
    icon: ImageIcon,
    desc: "Imagen Fondo + Título Encima",
  },
  { id: "text", label: "Texto Simple", icon: Type, desc: "Párrafo libre" },
  {
    id: "article",
    label: "Artículo",
    icon: FileText,
    desc: "Foto izq + Texto der",
  },
  {
    id: "grid_2",
    label: "2 Columnas",
    icon: Grid,
    desc: "Dos tarjetas lado a lado",
  },
  { id: "video", label: "Video", icon: Video, desc: "Preview Youtube/Vimeo/Enlace" },
  { id: "button", label: "Botón Solo", icon: LinkIcon, desc: "Call to Action" },
  {
    id: "footer",
    label: "Pie de Página",
    icon: Layout,
    desc: "Firma y Enlaces",
  },
];

const INITIAL_BLOCKS = [
  {
    id: "header_1",
    type: "header",
    data: { logo: "", align: "left", bgColor: "green" },
  },
  {
    id: "text_intro",
    type: "text",
    data: {
      text: '<div style="text-align:center"><b>¡Hola equipo!</b><br>Escribe aquí tu introducción...</div>',
    },
  },
  {
    id: "footer_1",
    type: "footer",
    data: {
      address: "Acción Andina",
      text: "Restaurando los bosques.",
      link1: "Darse de baja",
      link1Url: "#",
      bgColor: "green",
    },
  },
];

// --- LOGOS DE MARCA ---
const BRAND_LOGOS = {
  white: {
    aa: "https://accion-andina.org/wp-content/uploads/2025/12/accion-andina-blanco-scaled.png",
    ecoan: "https://accion-andina.org/wp-content/uploads/2025/12/ECOAN-blanco.png",
    fgfg: "https://accion-andina.org/wp-content/uploads/2025/12/GFG-wht_logo.png"
  },
  color: {
    aa: "https://accion-andina.org/wp-content/uploads/2025/12/accion-andina-color.png",
    ecoan: "https://accion-andina.org/wp-content/uploads/2025/12/ECOAN-color.png",
    fgfg: "https://accion-andina.org/wp-content/uploads/2025/12/GFG-2clr_logo.png"
  }
};

const RECOMMENDED_SIZES = {
  hero: "600x350px",
  hero_bg: "600x400px",
  article: "250x250px",
  video: "600x350px",
  grid_2: "280x200px"
};

// --- COMPONENTE EDITOR DE TEXTO RICO ---
const RichTextEditor = ({ label, value, onChange, placeholder, rows = 3 }) => {
  const textareaRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const applyFormat = (tagStart, tagEnd) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText =
      text.substring(0, start) +
      tagStart +
      text.substring(start, end) +
      tagEnd +
      text.substring(end);
    const event = { target: { value: newText } };
    onChange(event);
  };

  const applyColor = (color) => {
    applyFormat(`<span style="color:${color}">`, "</span>");
    setShowColorPicker(false);
  };

  return (
    <div className="space-y-1.5 group relative">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
          {label}
        </label>
        <div className="flex bg-gray-100 rounded p-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => applyFormat("<b>", "</b>")}
            className="p-1 hover:bg-white rounded"
          >
            <Bold size={10} />
          </button>
          <button
            onClick={() => applyFormat("<i>", "</i>")}
            className="p-1 hover:bg-white rounded"
          >
            <Italic size={10} />
          </button>
          <div className="w-px bg-gray-300 mx-1"></div>
          <button
            onClick={() =>
              applyFormat('<div style="text-align:center">', "</div>")
            }
            className="p-1 hover:bg-white rounded"
          >
            <AlignCenter size={10} />
          </button>
          <button
            onClick={() => applyFormat("<br>", "")}
            className="p-1 hover:bg-white rounded text-[8px] font-bold"
          >
            BR
          </button>

          <div className="relative ml-1">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 hover:bg-white rounded flex items-center"
            >
              <Palette size={10} /> <ChevronDown size={8} />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 shadow-xl rounded p-2 z-50 w-32 grid grid-cols-4 gap-1">
                {[
                  COLORS.primary,
                  COLORS.secondary,
                  COLORS.accent,
                  "#000",
                  "#555",
                  "#999",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => applyColor(c)}
                    className="w-5 h-5 rounded-full border"
                    style={{ background: c }}
                  />
                ))}
                {/* Overlay para cerrar */}
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowColorPicker(false)}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value || ""}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:bg-white transition-all resize-none"
      />
    </div>
  );
};

export default function MailingBuilder() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [loadingUpload, setLoadingUpload] = useState({});
  const [isCopied, setIsCopied] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  // --- GESTIÓN DE BLOQUES ---
  const addBlock = (type) => {
    const newBlock = { id: `${type}_${Date.now()}`, type: type, data: {} };
    const newBlocks = [...blocks];
    const insertIndex = Math.max(1, newBlocks.length - 1);
    newBlocks.splice(insertIndex, 0, newBlock);
    setBlocks(newBlocks);
    setShowBlockMenu(false);
  };

  const removeBlock = (index) => {
    if (confirm("¿Eliminar esta sección?")) {
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    // Evitar mover los bloques estáticos (header, footer) 
    const sourceBlock = blocks[sourceIndex];
    if (sourceBlock.type === "header" || sourceBlock.type === "footer") return;

    // Evitar que otros bloques se pongan por encima del header o debajo del footer
    if (destIndex === 0 || destIndex === blocks.length - 1) return;

    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);

    setBlocks(items);
  };

  const updateBlockData = (index, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      data: { ...newBlocks[index].data, [field]: value },
    };
    setBlocks(newBlocks);
  };

  // --- IMÁGENES ---
  const handleFileUpload = async (e, index, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const loadKey = `${index}_${field}`;
    setLoadingUpload((prev) => ({ ...prev, [loadKey]: true }));

    try {
      const fileExt = file.type.split("/")[1];
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const { error } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);
      updateBlockData(index, field, data.publicUrl);
    } catch {
      alert("Error subiendo imagen");
    } finally {
      setLoadingUpload((prev) => ({ ...prev, [loadKey]: false }));
    }
  };

  // --- RENDERIZADORES HTML ---
  const S = {
    body: "margin:0;padding:0;background-color:#f4f7f6;font-family:Helvetica,Arial,sans-serif;",
    container: "max-width:600px;margin:0 auto;background-color:#ffffff;",
    content: "padding:30px 30px;",
    h1: `color:${COLORS.primary};font-size:24px;margin:0 0 15px 0;font-weight:bold;line-height:1.2;`,
    h2: `color:${COLORS.primary};font-size:18px;margin:0 0 10px 0;font-weight:bold;`,
    p: `color:${COLORS.text};font-size:15px;line-height:1.6;margin:0 0 15px 0;`,
    btn: `display:inline-block;padding:12px 24px;background-color:${COLORS.accent};color:#ffffff;text-decoration:none;font-weight:bold;border-radius:4px;font-size:13px;`,
    img: "width:100%;height:auto;display:block;border:0;",
    // Estilo para el Placeholder (Wireframe)
    placeholder:
      "background-color:#F3F4F6;border:2px dashed #E5E7EB;color:#9CA3AF;text-align:center;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px;",
  };

  // Helper para renderizar imagen o caja gris si está vacía
  const renderImageOrPlaceholder = (
    src,
    height = "200px",
    label = "IMAGEN"
  ) => {
    if (src) {
      return `<img src="${src}" style="${S.img}" alt="${label}">`;
    }
    return `
        <table width="100%" height="${height}" cellpadding="0" cellspacing="0" style="${S.placeholder}">
            <tr><td vertical-align="middle">[ SUBIR ${label} ]</td></tr>
        </table>
      `;
  };

  const renderBlockHTML = (block) => {
    const d = block.data;
    switch (block.type) {
      case "header": {
        const bg = d.bgColor === "white" ? "#ffffff" : COLORS.primary;
        const logos = d.bgColor === "white" ? BRAND_LOGOS.color : BRAND_LOGOS.white;

        return `<tr><td style="background-color:${bg};padding:30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle">
                        <img src="${logos.aa}" style="height:55px;width:auto;display:block;max-width:180px;" alt="Acción Andina">
                    </td>
                    <td align="right" valign="middle">
                        <img src="${logos.ecoan}" style="height:38px;width:auto;display:inline-block;vertical-align:middle;margin-right:12px;max-width:100%;" alt="ECOAN">
                        <img src="${logos.fgfg}" style="height:28px;width:auto;display:inline-block;vertical-align:middle;max-width:100%;" alt="FGFG">
                    </td>
                  </tr>
                </table>
            </td></tr>`;
      }

      case "hero":
        return `<tr><td style="padding:0;">${renderImageOrPlaceholder(
          d.image,
          "350px",
          "HERO"
        )}</td></tr>
            <tr><td style="${S.content}">
                <h1 style="${S.h1}">${d.title || "Título Principal"}</h1>
                <div style="${S.p}">${d.text || "Escribe tu texto introductorio aquí..."
          }</div>
                ${d.btnUrl
            ? `<div style="margin-top:20px;"><a href="${d.btnUrl
            }" style="${S.btn}">${d.btnText || "Ver Más"}</a></div>`
            : ""
          }
            </td></tr>`;

      case "text":
        return `<tr><td style="${S.content
          };padding-top:10px;padding-bottom:10px;">
                <div style="${S.p}">${d.text || "Añade tu contenido de texto aquí..."
          }</div>
            </td></tr>`;

      case "article":
        return `<tr><td style="padding:20px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td width="40%" valign="top">${renderImageOrPlaceholder(
          d.image,
          "150px",
          "FOTO"
        )}</td>
                    <td width="5%"></td>
                    <td width="55%" valign="top">
                        <h3 style="${S.h2};font-size:16px;">${d.title || "Título Artículo"
          }</h3>
                        <div style="font-size:13px;color:#555;line-height:1.5;">${d.text || "Descripción corta..."
          }</div>
                        ${d.link
            ? `<a href="${d.link}" style="color:${COLORS.primary};font-size:13px;font-weight:bold;text-decoration:none;display:block;margin-top:8px;">Leer más &rarr;</a>`
            : ""
          }
                    </td>
                </tr></table>
            </td></tr>`;

      case "grid_2":
        return `<tr><td style="padding:10px 30px 30px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td width="48%" valign="top">
                        <div style="margin-bottom:10px;">${renderImageOrPlaceholder(
          d.img1,
          "120px",
          "IMG 1"
        )}</div>
                        <h4 style="margin:0 0 5px 0;color:${COLORS.primary
          };font-size:14px;">${d.title1 || "Titulo 1"}</h4>
                        <div style="font-size:12px;color:#666;">${d.text1 || "..."
          }</div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" valign="top">
                        <div style="margin-bottom:10px;">${renderImageOrPlaceholder(
            d.img2,
            "120px",
            "IMG 2"
          )}</div>
                        <h4 style="margin:0 0 5px 0;color:${COLORS.primary
          };font-size:14px;">${d.title2 || "Titulo 2"}</h4>
                        <div style="font-size:12px;color:#666;">${d.text2 || "..."
          }</div>
                    </td>
                </tr></table>
            </td></tr>`;

      case "video":
        return `<tr><td style="${S.content}">
                <h2 style="${S.h2}">${d.title || "Video Destacado"}</h2>
                ${d.image
            ? `<a href="${d.url || "#"
            }" style="display:block;position:relative;margin:15px 0;">
                        <img src="${d.image}" style="${S.img
            };border-radius:8px;">
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:rgba(0,0,0,0.6);border-radius:50%;border:3px solid #fff;text-align:center;line-height:54px;color:#fff;font-size:24px;">▶</div>
                    </a>`
            : `<div style="margin:15px 0;">${renderImageOrPlaceholder(
              null,
              "250px",
              "PORTADA VIDEO"
            )}</div>`
          }
                <div style="${S.p}">${d.desc || ""}</div>
            </td></tr>`;

      case "button":
        return `<tr><td style="padding:20px 30px;text-align:center;">
                <a href="${d.url || "#"}" style="${S.btn
          };padding:16px 40px;font-size:16px;">${d.text || "Botón de Acción"}</a>
            </td></tr>`;

      case "footer": {
        const fBg = d.bgColor === "white" ? "#ffffff" : COLORS.primary;
        const fText = d.bgColor === "white" ? "#666666" : "#ffffff";
        return `<tr><td style="background-color:${fBg};color:${fText};padding:40px 30px;text-align:center;font-size:12px;">
                <p style="margin:0 0 10px 0;font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;">${d.address || "Acción Andina"
          }</p>
                <p style="margin:0;opacity:0.8;">${d.text || "Restaurando ecosistemas."
          }</p>
                <div style="margin-top:20px;opacity:0.6;">
                    <a href="${d.link1Url || "#"
          }" style="color:inherit;text-decoration:none;">${d.link1 || "Unsubscribe"
          }</a>
                </div>
            </td></tr>`;
      }

      default:
        return "";
    }
  };

  const generateFullHTML = () => {
    const bodyContent = blocks.map(renderBlockHTML).join("");
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="${S.body}"><center style="width:100%;table-layout:fixed;background-color:#f4f7f6;padding-bottom:40px;"><div style="max-width:600px;margin:0 auto;box-shadow:0 10px 30px rgba(0,0,0,0.05);"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="${S.container}">${bodyContent}</table></div></center></body></html>`;
  };

  const copyVisual = () => {
    const html = generateFullHTML();
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert("Error copiando. Usa el botón HTML.");
    }
    document.body.removeChild(tempDiv);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* HEADER APP: ESTILO UNIFICADO (DASHBOARD MATCH) */}
      <div className="px-8 py-8 flex justify-between items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0 z-20">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <Mail className="text-brand" size={32} /> Mailing Lab
          </h1>
          <p className="text-gray-500 font-bold text-sm mt-2 ml-1">
            Constructor Modular de Correos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={`p-3 rounded-xl transition-all ${previewMode === "desktop"
              ? "bg-gray-900 text-white shadow-lg"
              : "bg-white border border-gray-200 text-gray-400 hover:text-gray-600"
              }`}
          >
            <Monitor size={18} />
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={`p-3 rounded-xl transition-all ${previewMode === "mobile"
              ? "bg-gray-900 text-white shadow-lg"
              : "bg-white border border-gray-200 text-gray-400 hover:text-gray-600"
              }`}
          >
            <Smartphone size={18} />
          </button>
          <div className="h-10 w-px bg-gray-200 mx-2"></div>
          <button
            onClick={copyVisual}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:brightness-110 shadow-lg active:scale-95 transition-all ${isCopied ? "bg-emerald-600 text-white" : "bg-brand text-white"
              }`}
          >
            {isCopied ? <Check size={16} /> : <Mail size={16} />}{" "}
            {isCopied ? "¡Listo!" : "Copiar para Gmail"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PANEL IZQUIERDO: CONSTRUCTOR DE BLOQUES */}
        <aside className="w-[450px] bg-white border-r border-gray-100 flex flex-col h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
          {/* Lista de Bloques */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24">
            {enabled && (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="mailing-blocks">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {blocks.map((block, idx) => {
                        const BlockIcon = BLOCK_TYPES.find((t) => t.id === block.type)?.icon;
                        const isFixed = block.type === "header" || block.type === "footer";

                        return (
                          <Draggable key={block.id} draggableId={block.id} index={idx} isDragDisabled={isFixed}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border ${snapshot.isDragging ? "border-brand shadow-xl scale-[1.02]" : "border-gray-200 shadow-sm"} rounded-xl bg-white overflow-hidden group hover:border-brand/30 transition-all animate-in slide-in-from-left-2 duration-300 relative`}
                                style={provided.draggableProps.style}
                              >
                                {/* Header del Bloque */}
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-default">
                                  <div className="flex items-center gap-3">
                                    {!isFixed && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="text-gray-400 hover:text-brand cursor-grab p-1 -ml-2 rounded"
                                      >
                                        <GripVertical size={14} />
                                      </div>
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                      {BlockIcon && <BlockIcon size={12} />}
                                      {BLOCK_TYPES.find((t) => t.id === block.type)?.label || block.type}
                                    </span>
                                  </div>
                                  {!isFixed && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => removeBlock(idx)}
                                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                        title="Eliminar Sección"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Formulario del Bloque */}
                                <div className="p-4 space-y-4">
                                  {/* Campos Comunes Header/Footer */}
                                  {["header", "footer"].includes(block.type) && (
                                    <div className="flex gap-2 mb-2">
                                      <button
                                        onClick={() => updateBlockData(idx, "bgColor", "green")}
                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded ${block.data.bgColor !== "white" ? "bg-brand text-white" : "bg-gray-100 text-gray-400"}`}
                                      >
                                        Fondo Verde
                                      </button>
                                      <button
                                        onClick={() => updateBlockData(idx, "bgColor", "white")}
                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded ${block.data.bgColor === "white" ? "bg-gray-200 text-gray-800" : "bg-gray-100 text-gray-400"}`}
                                      >
                                        Fondo Blanco
                                      </button>
                                    </div>
                                  )}
                                  {/* (El selector Individual de logos fue removido del Header porque ahora se muestran 3 juntos) */}

                                  {/* Subida de Imagen (Generica) */}
                                  {(block.type === "hero" ||
                                    block.type === "hero_bg" ||
                                    block.type === "video" ||
                                    block.type === "article" ||
                                    block.type.includes("grid")) && (
                                      <div className="flex gap-2 items-center">
                                        <div className="flex-1 space-y-1">
                                          <label className="cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-lg h-10 flex items-center justify-center text-gray-400 hover:bg-white hover:border-brand transition-colors relative">
                                            {loadingUpload[`${idx}_image`] ? (
                                              <Loader2 className="animate-spin" size={16} />
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <UploadCloud size={16} />
                                                <span className="text-xs uppercase font-bold">
                                                  Subir Imagen
                                                </span>
                                              </div>
                                            )}
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept="image/*"
                                              onChange={(e) =>
                                                handleFileUpload(
                                                  e,
                                                  idx,
                                                  block.type.includes("grid")
                                                    ? "img1"
                                                    : "image"
                                                )
                                              }
                                            />
                                          </label>
                                          {RECOMMENDED_SIZES[block.type] && (
                                            <p className="text-[10px] text-gray-400 text-center font-medium">Recomendado: {RECOMMENDED_SIZES[block.type]}</p>
                                          )}
                                        </div>
                                        {/* Preview Mini */}
                                        {(block.data.image ||
                                          block.data.img1) && (
                                            <img
                                              src={
                                                block.data.image ||
                                                block.data.img1
                                              }
                                              className="h-10 w-10 object-cover rounded border"
                                              alt="Preview"
                                            />
                                          )}
                                      </div>
                                    )}

                                  {/* Campos Dinámicos Titulo + Descripción */}
                                  {(block.type === "hero" ||
                                    block.type === "hero_bg" ||
                                    block.type === "article" ||
                                    block.type === "video") && (
                                      <>
                                        <input
                                          type="text"
                                          placeholder="Título Principal"
                                          value={block.data.title || ""}
                                          onChange={(e) =>
                                            updateBlockData(idx, "title", e.target.value)
                                          }
                                          className="w-full bg-gray-50 border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:bg-white"
                                        />
                                        <RichTextEditor
                                          placeholder="Descripción / Texto principal..."
                                          value={block.data.text || block.data.desc}
                                          onChange={(e) =>
                                            updateBlockData(
                                              idx,
                                              block.type === "video" ? "desc" : "text",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </>
                                    )}

                                  {block.type === "text" && (
                                    <RichTextEditor
                                      placeholder="Escribe aquí..."
                                      value={block.data.text}
                                      onChange={(e) =>
                                        updateBlockData(idx, "text", e.target.value)
                                      }
                                      rows={6}
                                    />
                                  )}

                                  {block.type === "grid_2" && (
                                    <>
                                      <p className="text-xs font-bold text-brand uppercase mt-2">
                                        Columna 1
                                      </p>
                                      <input
                                        type="text"
                                        placeholder="Título 1"
                                        value={block.data.title1 || ""}
                                        onChange={(e) =>
                                          updateBlockData(idx, "title1", e.target.value)
                                        }
                                        className="w-full bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm mb-1"
                                      />
                                      <textarea
                                        placeholder="Texto 1"
                                        value={block.data.text1 || ""}
                                        onChange={(e) =>
                                          updateBlockData(idx, "text1", e.target.value)
                                        }
                                        className="w-full bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm mb-2 resize-none"
                                      />

                                      <p className="text-xs font-bold text-brand uppercase mt-2">
                                        Columna 2
                                      </p>
                                      <div className="flex gap-3 mb-2">
                                        <div className="space-y-1">
                                          <label className="cursor-pointer bg-gray-50 border border-dashed rounded h-10 w-10 flex items-center justify-center text-gray-400 hover:text-brand">
                                            <UploadCloud size={16} />
                                            <input
                                              type="file"
                                              className="hidden"
                                              onChange={(e) => handleFileUpload(e, idx, "img2")}
                                            />
                                          </label>
                                          {RECOMMENDED_SIZES[block.type] && (
                                            <p className="text-[9px] text-gray-400 text-center">{RECOMMENDED_SIZES[block.type].split('x')[0]}</p>
                                          )}
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="Título 2"
                                          value={block.data.title2 || ""}
                                          onChange={(e) =>
                                            updateBlockData(idx, "title2", e.target.value)
                                          }
                                          className="flex-1 bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <textarea
                                        placeholder="Texto 2"
                                        value={block.data.text2 || ""}
                                        onChange={(e) =>
                                          updateBlockData(idx, "text2", e.target.value)
                                        }
                                        className="w-full bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm resize-none"
                                      />
                                    </>
                                  )}

                                  {block.type === "footer" && (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={block.data.address || ""}
                                        onChange={(e) =>
                                          updateBlockData(idx, "address", e.target.value)
                                        }
                                        className="w-full bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={block.data.text || ""}
                                        onChange={(e) =>
                                          updateBlockData(idx, "text", e.target.value)
                                        }
                                        className="w-full bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={block.data.link1 || ""}
                                          onChange={(e) =>
                                            updateBlockData(idx, "link1", e.target.value)
                                          }
                                          className="flex-1 bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm"
                                          placeholder="Texto Link"
                                        />
                                        <input
                                          type="text"
                                          value={block.data.link1Url || ""}
                                          onChange={(e) =>
                                            updateBlockData(idx, "link1Url", e.target.value)
                                          }
                                          className="flex-1 bg-gray-50 border-gray-200 rounded px-3 py-2 text-sm text-blue-600"
                                          placeholder="URL"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Botones Extra  */}
                                  {(block.type === "hero" ||
                                    block.type === "hero_bg" ||
                                    block.type === "video" ||
                                    block.type === "article" ||
                                    block.type === "button") && (
                                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        <input
                                          type="text"
                                          placeholder={
                                            block.type === "button"
                                              ? "Texto Botón"
                                              : "Texto del Enlace"
                                          }
                                          value={
                                            block.data.btnText ||
                                            (block.type === "button" ? block.data.text : "")
                                          }
                                          onChange={(e) =>
                                            updateBlockData(
                                              idx,
                                              block.type === "button" ? "text" : "btnText",
                                              e.target.value
                                            )
                                          }
                                          className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                                        />
                                        <input
                                          type="text"
                                          placeholder={block.type === "video" ? "Link YouTube/Vimeo" : "https://..."}
                                          value={
                                            block.data.btnUrl ||
                                            block.data.url ||
                                            block.data.link ||
                                            ""
                                          }
                                          onChange={(e) =>
                                            updateBlockData(
                                              idx,
                                              block.type === "button"
                                                ? "url"
                                                : block.type === "article"
                                                  ? "link"
                                                  : block.type === "video"
                                                    ? "url"
                                                    : "btnUrl",
                                              e.target.value
                                            )
                                          }
                                          className="flex-[2] bg-white border border-gray-200 rounded px-3 py-2 text-sm text-blue-600"
                                        />
                                      </div>
                                    )}           </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* BOTÓN FLOTANTE AÑADIR */}
          <div className="absolute bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur border-t border-gray-200">
            <button
              onClick={() => setShowBlockMenu(!showBlockMenu)}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg"
            >
              {showBlockMenu ? <X size={16} /> : <Plus size={16} />}{" "}
              {showBlockMenu ? "Cancelar" : "Añadir Sección"}
            </button>
          </div>

          {/* MENÚ DE BLOQUES */}
          {showBlockMenu && (
            <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-in slide-in-from-bottom-4 z-20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">
                Elige un bloque
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_TYPES.filter(
                  (t) => t.id !== "header" && t.id !== "footer"
                ).map((type) => (
                  <button
                    key={type.id}
                    onClick={() => addBlock(type.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-brand hover:bg-brand/5 transition-all group text-center"
                  >
                    <type.icon
                      size={20}
                      className="text-gray-400 group-hover:text-brand mb-2"
                    />
                    <span className="text-[10px] font-bold text-gray-700 group-hover:text-brand uppercase">
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* PREVIEW */}
        <main className="flex-1 bg-gray-200/80 flex justify-center items-start pt-10 overflow-y-auto custom-scrollbar relative">
          <div
            className={`transition-all duration-500 bg-white shadow-2xl overflow-hidden mb-20 ${previewMode === "mobile"
              ? "w-[375px] min-h-[667px] rounded-[30px] border-[8px] border-gray-800"
              : "w-[650px] min-h-[800px] rounded-lg"
              }`}
          >
            <iframe
              title="Preview"
              srcDoc={generateFullHTML()}
              className="w-full h-full min-h-[800px] border-none"
              sandbox="allow-same-origin"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
