/**
 * MÓDULO: ArticleModule
 * ---------------------
 * Gestiona la redacción y previsualización de artículos de largo formato (historias).
 * 
 * CARACTERÍSTICAS:
 * 1. EDITOR INTEGRADO: Utiliza 'RichEditor' para la composición de contenido.
 * 2. MULTIMEDIA: Gestión de imagen de portada con subida a Supabase.
 * 3. INTEGRACIÓN CON PRENSA: Permite exportar directamente el artículo como borrador 
 *    a la 'Sala de Prensa' (tabla press_releases).
 * 4. EXPORTACIÓN: Genera HTML limpio y estilizado para ser copiado y usado en newsletters o webs.
 */
import { useState, useRef } from "react";
import { supabase } from "../../app/supabase";
import {
  Eye,
  Edit3,
  Image as ImageIcon,
  Layout,
  Copy,
  Check,
  CloudUpload,
  Loader2,
  Send,
  Newspaper,
} from "lucide-react";
import RichEditor from "../RichEditor";

// AHORA RECIBIMOS 'storyTitle' COMO PROP
export default function ArticleModule({ data, onUpdate, storyTitle }) {
  // data espera: { title: "", body: "", cover_url: "" }

  const [isPreview, setIsPreview] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false); // Estado para envío a Prensa
  const fileInputRef = useRef(null);

  const today = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // --- SUBIR PORTADA ---
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fileName = `cover_${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);
      onUpdate({ ...data, cover_url: publicData.publicUrl });
    } catch (err) {
      alert("Error subiendo portada.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- NUEVA FUNCIÓN: ENVIAR A SALA DE PRENSA ---
  const sendToPressRoom = async () => {
    if (!data.title && !data.body)
      return alert("Escribe un título o contenido antes de enviar.");

    if (!confirm("¿Crear un Borrador en 'Sala de Prensa' con este artículo?"))
      return;

    setIsSending(true);
    try {
      // 1. Preparamos el Payload compatible con la tabla 'press_releases'
      const pressPayload = {
        title: data.title || storyTitle || "Nota desde Historia",
        subtitle: "Borrador importado desde Gestión de Historias",
        body_content: data.body, // El HTML del RichEditor pasa directo
        cover_image_url: data.cover_url || "",
        is_published: false, // Siempre nace como borrador
        created_at: new Date(),
      };

      // 2. Insertamos en 'press_releases'
      const { error } = await supabase
        .from("press_releases")
        .insert([pressPayload]);

      if (error) throw error;

      alert("✅ ¡Borrador creado en 'Sala de Prensa'!");
    } catch (error) {
      console.error("Error enviando a prensa:", error);
      alert("Hubo un error al enviar el borrador.");
    } finally {
      setIsSending(false);
    }
  };

  // --- GENERAR HTML LIMPIO ---
  const handleCopyHtml = async () => {
    const finalHtml = `
<div style="font-family: Georgia, serif; max-width: 800px; margin: auto; color: #374151; line-height: 1.8;">
  ${data.cover_url ? `<img src="${data.cover_url}" alt="${data.title}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 24px; display: block;" />` : ""}
  <p style="text-transform: uppercase; font-size: 12px; color: #059669; font-weight: bold; margin-bottom: 8px; font-family: sans-serif;">Noticias & Historias</p>
  <h1 style="font-size: 36px; font-weight: 900; color: #111827; margin: 0 0 16px 0; line-height: 1.2; font-family: sans-serif;">${data.title || "Sin Título Definido"}</h1>
  <p style="color: #9ca3af; font-size: 14px; margin-bottom: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; font-family: sans-serif;">
    Por <strong>Comunicaciones</strong> • ${today}
  </p>
  <div style="font-size: 18px;">
    ${data.body || ""}
  </div>
</div>
    `;
    try {
      await navigator.clipboard.writeText(finalHtml);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert("Error al copiar");
    }
  };

  return (
    <div className="animate-in fade-in space-y-4">
      {/* CABECERA CON BOTÓN DE ENVÍO A PRENSA */}
      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center mb-2">
        <div>
          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
            <Newspaper size={14} /> Redacción
          </h4>
          <p className="text-[10px] text-emerald-600 mt-1">
            Escribe aquí. Cuando termines, envía el borrador a Prensa.
          </p>
        </div>
        <button
          onClick={sendToPressRoom}
          disabled={isSending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {isSending ? "Enviando..." : "Enviar a Prensa"}
        </button>
      </div>

      {/* HEADER DEL EDITOR */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Layout size={14} /> {isPreview ? "Vista Previa Final" : "Editor"}
        </h4>
        <div className="flex gap-2">
          {isPreview && (
            <button
              onClick={handleCopyHtml}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isCopied ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"}`}
            >
              {isCopied ? (
                <>
                  <Check size={14} /> ¡Copiado!
                </>
              ) : (
                <>
                  <Copy size={14} /> HTML
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isPreview ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 border" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}
          >
            {isPreview ? (
              <>
                <Edit3 size={14} /> Editar
              </>
            ) : (
              <>
                <Eye size={14} /> Ver
              </>
            )}
          </button>
        </div>
      </div>

      {isPreview ? (
        /* MODO VISTA PREVIA */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-3xl mx-auto transition-all">
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden relative border-b border-gray-100">
            {data.cover_url ? (
              <img
                src={data.cover_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-300 flex flex-col items-center gap-2">
                <ImageIcon size={48} className="opacity-50" />
                <span className="text-[10px] uppercase font-black tracking-widest opacity-50">
                  Sin portada
                </span>
              </div>
            )}
          </div>
          <div className="p-8 md:p-12">
            <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-3 block">
              Noticias & Historias
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-6 font-sans">
              {data.title || (
                <span className="text-gray-300 italic">
                  Escribe un título...
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-xs font-medium text-gray-400 mb-8 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <span className="text-gray-600">
                  Por <b>Comunicaciones</b>
                </span>
              </div>
              <span>•</span>
              <span>{today}</span>
            </div>
            <div
              className="prose prose-lg prose-slate max-w-none font-serif leading-loose text-gray-700 prose-img:rounded-2xl prose-img:shadow-md prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-headings:font-sans prose-headings:font-black"
              dangerouslySetInnerHTML={{
                __html:
                  data.body ||
                  "<p class='text-gray-300 italic'>El cuerpo del artículo aparecerá aquí...</p>",
              }}
            />
          </div>
        </div>
      ) : (
        /* MODO EDICIÓN */
        <div className="space-y-6 animate-in slide-in-from-left-2">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
              Imagen de Portada
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-3 rounded-xl transition-colors border border-gray-200 flex items-center gap-2 font-bold text-xs"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CloudUpload size={16} />
                )}{" "}
                {isUploading ? "Subiendo..." : "Subir"}
              </button>
              <input
                type="text"
                className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs outline-none focus:border-emerald-400 transition-colors"
                placeholder="O pega una URL de imagen aquí..."
                value={data.cover_url || ""}
                onChange={(e) =>
                  onUpdate({ ...data, cover_url: e.target.value })
                }
              />
            </div>
            {data.cover_url && (
              <div className="mt-3 relative w-fit group">
                <img
                  src={data.cover_url}
                  className="h-24 w-auto rounded-lg border border-gray-200 object-cover shadow-sm"
                />
                <button
                  onClick={() => onUpdate({ ...data, cover_url: "" })}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <Layout size={12} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
              Titular
            </label>
            <input
              type="text"
              className="w-full text-3xl font-black border-b-2 border-gray-100 pb-2 outline-none placeholder-gray-200 focus:border-emerald-400 transition-colors text-gray-900 font-sans"
              placeholder="Escribe un título impactante..."
              value={data.title || ""}
              onChange={(e) => onUpdate({ ...data, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
              Cuerpo del Artículo
            </label>
            <RichEditor
              value={data.body || ""}
              onChange={(val) => onUpdate({ ...data, body: val })}
              placeholder="Desarrolla la historia aquí..."
              minHeight="400px"
            />
          </div>
        </div>
      )}
    </div>
  );
}
