import { useState, useRef } from "react";
import { supabase } from "../../app/supabase";
import {
  Plus,
  XCircle,
  AlignLeft,
  MonitorPlay,
  Image as ImageIcon,
  CloudUpload,
  Loader2,
  Send,
  Clapperboard,
  CheckCircle2,
} from "lucide-react";

// AHORA RECIBIMOS 'storyTitle' y 'partnerId' COMO PROPS
export default function VideoModule({ data, onUpdate, storyTitle, partnerId }) {
  const { script = "", shots = [], reference_images = [] } = data;
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false); // Estado para el envío a Videos

  // --- HANDLERS TOMAS ---
  const addShot = (text) => {
    if (!text) return;
    onUpdate({
      ...data,
      shots: [...shots, { id: Date.now(), text, completed: false }],
    });
  };
  const removeShot = (id) =>
    onUpdate({ ...data, shots: shots.filter((s) => s.id !== id) });

  // --- HANDLERS REFERENCIAS ---
  const addRefImageUrl = (url) => {
    if (!url || reference_images.includes(url)) return;
    onUpdate({ ...data, reference_images: [...reference_images, url] });
  };
  const removeRefImage = (url) =>
    onUpdate({
      ...data,
      reference_images: reference_images.filter((u) => u !== url),
    });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const fileName = `ref_${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);
      addRefImageUrl(publicData.publicUrl);
    } catch (err) {
      alert("Error subiendo referencia.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- NUEVA FUNCIÓN: ENVIAR A PESTAÑA VIDEOS ---
  const sendToVideoDashboard = async () => {
    if (!script && shots.length === 0)
      return alert(
        "Agrega al menos un guion o tomas antes de enviar a producción.",
      );

    if (
      !confirm(
        "¿Crear un nuevo proyecto en 'Guiones y Videos' basado en esta historia?",
      )
    )
      return;

    setIsSending(true);
    try {
      // 1. Preparamos el Payload compatible con la tabla 'videos'
      const videoPayload = {
        title: storyTitle || "Video desde Historia",
        production_type: "PARTNER", // Viene de una historia de socio
        status: "SCRIPT", // Ya nace con guion, así que saltamos "IDEA"
        partner_ids: partnerId ? [partnerId] : [], // Convertimos el ID único a Array
        script_content: script,
        // Transformamos las tomas simples de aquí al formato Storyboard de allá
        storyboard: shots.map((s) => ({
          id: s.id,
          url: "", // Allá esperan URL, aquí aún no hay, se va vacío
          caption: s.text, // El texto de la toma pasa a ser la descripción
        })),
        // Usamos las imágenes de referencia como portada provisional si hay
        cover_image: reference_images.length > 0 ? reference_images[0] : "",
        created_at: new Date(),
      };

      // 2. Insertamos en la tabla 'videos'
      const { error } = await supabase.from("videos").insert([videoPayload]);

      if (error) throw error;

      alert(
        "✅ ¡Proyecto creado exitosamente en la pestaña 'Guiones y Videos'!",
      );
    } catch (error) {
      console.error("Error creando video:", error);
      alert("Hubo un error al enviar a producción.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* CABECERA CON BOTÓN DE ENVÍO */}
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center mb-6">
        <div>
          <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
            <Clapperboard size={14} /> Pre-Producción
          </h4>
          <p className="text-[10px] text-blue-600 mt-1">
            Desarrolla la idea aquí. Cuando esté lista, envíala al estudio.
          </p>
        </div>
        <button
          onClick={sendToVideoDashboard}
          disabled={isSending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {isSending ? "Creando..." : "Enviar a Producción"}
        </button>
      </div>

      {/* PARTE SUPERIOR (GUION Y TOMAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1">
            <AlignLeft size={10} /> Guion / Locución
          </label>
          <textarea
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs h-48 resize-none outline-none focus:border-blue-400 custom-scrollbar leading-relaxed"
            placeholder="Escribe el guion..."
            value={script}
            onChange={(e) => onUpdate({ ...data, script: e.target.value })}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1">
            <MonitorPlay size={10} /> Lista de Tomas
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="shot-input"
              type="text"
              placeholder="Ej: Plano detalle..."
              className="flex-1 bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none focus:border-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addShot(e.target.value);
                  e.target.value = "";
                }
              }}
            />
            <button
              onClick={() => {
                const el = document.getElementById("shot-input");
                addShot(el.value);
                el.value = "";
              }}
              className="bg-blue-50 text-blue-600 p-2 rounded-lg font-bold text-xs"
            >
              <Plus size={14} />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar bg-gray-50/50 p-2 rounded-xl border border-gray-100"
            style={{ maxHeight: "160px" }}
          >
            {shots.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs shadow-sm"
              >
                <span className="truncate">🎬 {s.text}</span>
                <button
                  onClick={() => removeShot(s.id)}
                  className="text-gray-300 hover:text-red-500"
                >
                  <XCircle size={12} />
                </button>
              </div>
            ))}
            {shots.length === 0 && (
              <p className="text-[10px] text-gray-400 text-center italic mt-2">
                Agrega tomas...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PARTE INFERIOR: REFERENCIAS */}
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1 border-t border-gray-100 pt-4">
          <ImageIcon size={10} /> Referencias / Moodboard
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-all"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CloudUpload size={14} />
            )}{" "}
            Subir
          </button>
          <input
            id="ref-img-input"
            type="text"
            placeholder="O pega URL..."
            className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none focus:border-blue-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addRefImageUrl(e.target.value);
                e.target.value = "";
              }
            }}
          />
        </div>

        {reference_images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reference_images.map((url, i) => (
              <div
                key={i}
                className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-100 aspect-video bg-gray-100"
              >
                <img
                  src={url}
                  alt="Ref"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeRefImage(url)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs italic">
            Sube imágenes para el equipo de video.
          </div>
        )}
      </div>
    </div>
  );
}
