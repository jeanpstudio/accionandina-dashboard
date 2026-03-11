/**
 * MÓDULO: SocialModule
 * --------------------
 * Herramienta de composición para publicaciones en redes sociales (enfocado en Instagram/Facebook).
 * 
 * FUNCIONALIDADES:
 * 1. REDACCIÓN: Campo de texto para el 'copy' con contador de contexto (visual).
 * 2. HASHTAGS: Input especializado para etiquetas sociales.
 * 3. MOCKUP DINÁMICO: Previsualización en tiempo real de cómo se vería el post en un dispositivo móvil.
 */
import { Hash, Camera } from "lucide-react";

export default function SocialModule({ data, onUpdate }) {
  // data espera: { copy: "", hashtags: "", image_url: "" }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
            Copy (Texto del Post)
          </label>
          <textarea
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs h-24 resize-none outline-none focus:border-pink-400"
            value={data.copy || ""}
            onChange={(e) => onUpdate({ ...data, copy: e.target.value })}
            placeholder="Escribe el texto atractivo para el post..."
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
            Hashtags
          </label>
          <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-xl">
            <Hash size={14} className="text-pink-400" />
            <input
              type="text"
              className="flex-1 outline-none text-xs text-blue-600 font-medium"
              placeholder="#Ong #Ayuda #Peru..."
              value={data.hashtags || ""}
              onChange={(e) => onUpdate({ ...data, hashtags: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
            Link Imagen (URL)
          </label>
          <input
            type="text"
            className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none focus:border-pink-400"
            placeholder="https://..."
            value={data.image_url || ""}
            onChange={(e) => onUpdate({ ...data, image_url: e.target.value })}
          />
        </div>
      </div>

      {/* MOCKUP TELEFONO */}
      <div className="flex justify-center">
        <div className="w-60 bg-white border border-gray-200 rounded-[24px] shadow-xl overflow-hidden flex flex-col scale-90 md:scale-100 origin-top">
          <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-yellow-400 to-pink-600 rounded-full p-[1px]">
              <div className="w-full h-full bg-white rounded-full"></div>
            </div>
            <div className="h-2 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300 relative group">
            {data.image_url ? (
              <img
                src={data.image_url}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <Camera size={32} />
            )}
          </div>
          <div className="p-3 bg-white">
            <div className="flex gap-2 mb-2">
              <div className="w-4 h-4 bg-red-100 rounded-full"></div>{" "}
              <div className="w-4 h-4 bg-gray-100 rounded-full"></div>
            </div>
            <div className="text-[10px] leading-snug">
              <span className="font-bold mr-1">mi_ong</span>
              {data.copy || "Aquí aparecerá el texto de tu publicación..."}
            </div>
            <p className="text-[9px] text-blue-600 mt-1 font-medium">
              {data.hashtags}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
