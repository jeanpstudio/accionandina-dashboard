/**
 * COMPONENTE: RichEditor
 * ---------------------
 * Un editor de texto enriquecido (WYSIWYG) personalizado basado en 'contentEditable'.
 * 
 * FUNCIONALIDADES:
 * 1. FORMATO BÁSICO: Negrita, cursiva, subrayado y listas.
 * 2. MULTIMEDIA: Soporte para inserción de imágenes vía URL o subida directa a Supabase Storage.
 * 3. SINCRONIZACIÓN: Utiliza un useEffect con refs para evitar el "cursor saltarín" al sincronizar 
 *    el estado de React con el DOM nativo.
 * 4. SEGURIDAD: Sanitiza el pegado (paste) de contenido para mantener un HTML limpio.
 */
import { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List as ListIcon,
  Image as ImageIcon,
  X,
  Check,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { supabase } from "../app/supabase";

export default function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = "150px",
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados UI
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // --- CORRECCIÓN DEL CURSOR SALTARÍN ---
  // Sincronizar el contenido solo si es diferente al actual.
  // Esto evita que React "re-pinte" el HTML mientras escribes.
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // --- PASTE SANITIZER ---
  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    document.execCommand("insertText", false, text);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertImageByUrl = () => {
    if (imageUrl) {
      const imgHtml = `<img src="${imageUrl}" alt="img" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; display: block;" />`;
      execCmd("insertHTML", imgHtml);
      setImageUrl("");
      setShowUrlInput(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("story-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("story-attachments")
        .getPublicUrl(fileName);

      const imgHtml = `<img src="${publicData.publicUrl}" alt="uploaded" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; display: block;" />`;
      execCmd("insertHTML", imgHtml);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al subir imagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-brand transition-colors relative z-10 shadow-sm">
      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex items-center justify-between p-1.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => execCmd("bold")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Negrita"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => execCmd("italic")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Cursiva"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => execCmd("underline")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Subrayado"
          >
            <Underline size={14} />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button
            onClick={() => execCmd("insertUnorderedList")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Lista"
          >
            <ListIcon size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
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
            className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors flex items-center gap-1"
            title="Subir imagen"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CloudUpload size={14} />
            )}
          </button>

          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`p-1.5 rounded transition-colors ${showUrlInput ? "bg-gray-200 text-gray-900" : "hover:bg-gray-200 text-gray-600"}`}
            title="Link imagen"
          >
            <ImageIcon size={14} />
          </button>
        </div>
      </div>

      {/* INPUT URL EMERGENTE */}
      {showUrlInput && (
        <div className="absolute top-10 right-2 z-20 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex items-center gap-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            placeholder="Pega URL..."
            className="text-xs border border-gray-200 rounded-lg p-2 w-40 outline-none focus:border-blue-400"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertImageByUrl()}
            autoFocus
          />
          <button
            onClick={insertImageByUrl}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setShowUrlInput(false)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ÁREA EDITABLE CORREGIDA */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning={true} // Silencia advertencia de React
        onPaste={handlePaste}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="p-4 outline-none text-sm font-sans text-gray-700 leading-loose overflow-y-auto prose prose-sm max-w-none prose-img:rounded-xl prose-img:shadow-sm"
        style={{ minHeight, maxHeight: "400px" }}
        placeholder={placeholder}
      // NOTA: Ya no usamos dangerouslySetInnerHTML aquí,
      // usamos el useEffect de arriba para controlar el contenido.
      />
    </div>
  );
}
