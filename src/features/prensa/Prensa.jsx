import { useState, useEffect, useRef } from "react";
import { supabase } from "../../app/supabase";
import {
  Newspaper,
  UploadCloud,
  Save,
  Trash2,
  Plus,
  ExternalLink,
  BarChart3,
  Search,
  PenTool,
  Image as ImageIcon,
  Loader2,
  Send,
  X,
  FileText,
  Clock,
  CheckCircle2,
  Lock, // <--- Icono seguridad
} from "lucide-react";

export default function Prensa() {
  const [loading, setLoading] = useState(true);

  // --- SEGURIDAD: ESTADO DE LECTURA ---
  const [isReadOnly, setIsReadOnly] = useState(true);

  // DATOS
  const [clippings, setClippings] = useState([]);
  const [releases, setReleases] = useState([]);

  // ESTADOS DEL EDITOR (Notas de Prensa)
  const [editingId, setEditingId] = useState(null); // Si es null, es nueva nota
  const [draftForm, setDraftForm] = useState({
    title: "",
    subtitle: "",
    body_content: "",
    cover_image_url: "",
    is_published: false,
  });
  const [uploadingImg, setUploadingImg] = useState(false);

  // ESTADOS DEL CLIPPER (Artículos Externos)
  const [clipForm, setClipForm] = useState({
    title: "",
    url: "",
    media_name: "",
    published_date: new Date().toISOString().split("T")[0],
  });
  const [showClipForm, setShowClipForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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

        // REGLAS PRO:
        // 1. Admin -> Siempre edita.
        // 2. Usuario -> Edita SOLO si 'edit_press' es TRUE.

        if (profile?.role === "admin") {
          canEdit = true;
        } else if (profile?.edit_press === true) {
          canEdit = true;
        }
      }
      setIsReadOnly(!canEdit);
    } catch (e) {
      console.error("Error permisos:", e);
    }

    // 2. Cargar Datos
    const { data: clips } = await supabase
      .from("press_clippings")
      .select("*")
      .order("published_date", { ascending: false });

    const { data: notes } = await supabase
      .from("press_releases")
      .select("*")
      .order("created_at", { ascending: false });

    setClippings(clips || []);
    setReleases(notes || []);
    setLoading(false);
  }

  // --- LÓGICA EDITOR DE NOTAS (BLINDADA) ---
  const handleImageUpload = async (e) => {
    if (isReadOnly) return; // CANDADO
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from("press-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("press-images")
        .getPublicUrl(fileName);
      setDraftForm((prev) => ({ ...prev, cover_image_url: data.publicUrl }));
    } catch (err) {
      alert("Error subiendo imagen: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = () => {
    if (isReadOnly) return; // CANDADO
    setDraftForm((prev) => ({ ...prev, cover_image_url: "" }));
  };

  const saveRelease = async (isFinalPublish = false) => {
    if (isReadOnly) return; // CANDADO
    if (!draftForm.title) return alert("El título es obligatorio");

    const payload = {
      ...draftForm,
      is_published: isFinalPublish,
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase
        .from("press_releases")
        .update(payload)
        .eq("id", editingId);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("press_releases")
        .insert([payload]);
      error = err;
    }

    if (error) alert("Error: " + error.message);
    else {
      alert(isFinalPublish ? "¡Publicado con éxito!" : "Borrador guardado.");
      if (isFinalPublish) resetEditor();
      fetchData();
    }
  };

  const loadDraft = (note) => {
    setEditingId(note.id);
    setDraftForm({
      title: note.title,
      subtitle: note.subtitle || "",
      body_content: note.body_content || "",
      cover_image_url: note.cover_image_url || "",
      is_published: note.is_published,
    });
  };

  const resetEditor = () => {
    setEditingId(null);
    setDraftForm({
      title: "",
      subtitle: "",
      body_content: "",
      cover_image_url: "",
      is_published: false,
    });
  };

  const deleteRelease = async (id, e) => {
    e.stopPropagation();
    if (isReadOnly) return; // CANDADO
    if (confirm("¿Borrar esta nota para siempre?")) {
      await supabase.from("press_releases").delete().eq("id", id);
      fetchData();
      if (editingId === id) resetEditor();
    }
  };

  // --- LÓGICA CLIPPER (BLINDADA) ---
  const saveClipping = async () => {
    if (isReadOnly) return; // CANDADO
    if (!clipForm.title || !clipForm.url)
      return alert("Título y URL son obligatorios");

    const { error } = await supabase.from("press_clippings").insert([clipForm]);
    if (error) alert("Error: " + error.message);
    else {
      setClipForm({
        title: "",
        url: "",
        media_name: "",
        published_date: new Date().toISOString().split("T")[0],
      });
      setShowClipForm(false);
      fetchData();
    }
  };

  const deleteClipping = async (id) => {
    if (isReadOnly) return; // CANDADO
    if (confirm("¿Eliminar este artículo?")) {
      await supabase.from("press_clippings").delete().eq("id", id);
      fetchData();
    }
  };

  const totalImpact =
    clippings.length + releases.filter((r) => r.is_published).length;
  const draftCount = releases.filter((r) => !r.is_published).length;

  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-8 py-6 flex justify-between items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <Newspaper className="text-brand" size={32} /> Sala de Prensa
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic flex items-center gap-2">
            Gestión de Medios y Comunicados
            {isReadOnly && (
              <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                <Lock size={10} /> SOLO LECTURA
              </span>
            )}
          </p>
        </div>

        {/* STATS RÁPIDAS */}
        <div className="flex gap-4">
          <div className="bg-white px-5 py-2 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <ExternalLink size={16} />
            </div>
            <div>
              <span className="block text-xl font-black text-gray-900 leading-none">
                {clippings.length}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                Menciones
              </span>
            </div>
          </div>
          <div className="bg-white px-5 py-2 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-sm">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
              <Send size={16} />
            </div>
            <div>
              <span className="block text-xl font-black text-gray-900 leading-none">
                {releases.filter((r) => r.is_published).length}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                Publicadas
              </span>
            </div>
          </div>
          <div className="bg-white px-5 py-2 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-sm">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
              <FileText size={16} />
            </div>
            <div>
              <span className="block text-xl font-black text-gray-900 leading-none">
                {draftCount}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                Borradores
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-8 gap-8">
        {/* COLUMNA IZQUIERDA: CLIPPER */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
                <GlobeIcon size={18} className="text-blue-500" /> Medios
                Externos
              </h2>
              {/* BOTÓN + MEDIOS: OCULTO SI ES READONLY */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowClipForm(!showClipForm)}
                  className="bg-gray-900 text-white p-2 rounded-xl hover:scale-105 transition-all"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {showClipForm && !isReadOnly && (
              <div className="space-y-3 animate-in slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="Pegar URL de la noticia..."
                  value={clipForm.url}
                  onChange={(e) =>
                    setClipForm({ ...clipForm, url: e.target.value })
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="Título del artículo..."
                  value={clipForm.title}
                  onChange={(e) =>
                    setClipForm({ ...clipForm, title: e.target.value })
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del Medio (ej: BBC)"
                    value={clipForm.media_name}
                    onChange={(e) =>
                      setClipForm({ ...clipForm, media_name: e.target.value })
                    }
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                  />
                  <input
                    type="date"
                    value={clipForm.published_date}
                    onChange={(e) =>
                      setClipForm({
                        ...clipForm,
                        published_date: e.target.value,
                      })
                    }
                    className="w-32 bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                  />
                </div>
                <button
                  onClick={saveClipping}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors"
                >
                  Guardar Artículo
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {clippings.map((clip) => (
              <div
                key={clip.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-md mb-2 inline-block">
                    {clip.media_name || "Medio Desconocido"}
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => deleteClipping(clip.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <a
                  href={clip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-bold text-gray-800 leading-tight hover:text-blue-600 mb-1"
                >
                  {clip.title}
                </a>
                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <Clock size={10} />{" "}
                  {new Date(clip.published_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: EDITOR */}
        <div className="flex-1 flex flex-col bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* BOTÓN NUEVA NOTA: SOLO EDITOR */}
              {!isReadOnly && (
                <button
                  onClick={resetEditor}
                  className="text-xs font-black text-gray-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white transition-all"
                >
                  <Plus size={14} /> Nueva Nota
                </button>
              )}
              {!isReadOnly && <div className="h-6 w-px bg-gray-200"></div>}
              <span className="text-xs font-bold text-gray-500">
                {editingId
                  ? "Editando Nota..."
                  : isReadOnly
                    ? "Visualizando Nota"
                    : "Creando Nueva Nota"}
              </span>
            </div>
            {/* BOTONES GUARDAR: SOLO EDITOR */}
            {!isReadOnly && (
              <div className="flex gap-2">
                <button
                  onClick={() => saveRelease(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-black text-xs uppercase tracking-wider hover:border-amber-400 hover:text-amber-500 transition-all"
                >
                  <Save size={16} /> Guardar Borrador
                </button>
                <button
                  onClick={() => saveRelease(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-brand/20 active:scale-95 transition-all"
                >
                  <Send size={16} /> Publicar
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* LISTA DE NOTAS */}
            <div className="w-64 bg-gray-50 border-r border-gray-100 overflow-y-auto custom-scrollbar p-4 space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2">
                Mis Notas
              </p>
              {releases.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => loadDraft(rel)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all group relative ${editingId === rel.id ? "bg-white border-brand shadow-md" : "bg-transparent border-transparent hover:bg-white hover:border-gray-200"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${rel.is_published ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                    >
                      {rel.is_published ? "Publicado" : "Borrador"}
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={(e) => deleteRelease(rel.id, e)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p
                    className={`text-xs font-bold leading-tight line-clamp-2 ${editingId === rel.id ? "text-brand" : "text-gray-700"}`}
                  >
                    {rel.title || "(Sin título)"}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {new Date(rel.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* AREA DE EDICIÓN */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* PORTADA */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Imagen de Portada
                  </label>
                  {!draftForm.cover_image_url ? (
                    <label
                      className={`w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center ${isReadOnly ? "cursor-default opacity-50" : "cursor-pointer hover:border-brand hover:bg-brand/5"} transition-all group`}
                    >
                      {uploadingImg ? (
                        <Loader2 className="animate-spin text-brand" />
                      ) : (
                        <>
                          <ImageIcon
                            className="text-gray-300 group-hover:text-brand mb-2"
                            size={24}
                          />
                          <span className="text-xs font-bold text-gray-400 group-hover:text-brand">
                            {isReadOnly
                              ? "Sin imagen"
                              : "Clic para subir imagen"}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImg || isReadOnly}
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden group border border-gray-100 shadow-sm">
                      <img
                        src={draftForm.cover_image_url}
                        className="w-full h-full object-cover"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={removeImage}
                          className="absolute top-3 right-3 bg-white/90 text-red-500 p-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* CAMPOS DE TEXTO */}
                <div className="space-y-4">
                  <input
                    disabled={isReadOnly}
                    type="text"
                    placeholder={
                      isReadOnly ? "" : "Escribe un título impactante..."
                    }
                    className="w-full text-3xl font-black text-gray-900 placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent outline-none disabled:bg-transparent"
                    value={draftForm.title}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, title: e.target.value })
                    }
                  />
                  <input
                    disabled={isReadOnly}
                    type="text"
                    placeholder={
                      isReadOnly ? "" : "Subtítulo o bajada (opcional)..."
                    }
                    className="w-full text-lg font-bold text-gray-500 placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent outline-none disabled:bg-transparent"
                    value={draftForm.subtitle}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, subtitle: e.target.value })
                    }
                  />
                  <div className="h-px w-full bg-gray-100"></div>
                  <textarea
                    disabled={isReadOnly}
                    placeholder={
                      isReadOnly
                        ? ""
                        : "Empieza a redactar tu nota de prensa aquí..."
                    }
                    className="w-full min-h-[400px] text-base text-gray-700 leading-relaxed placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent outline-none resize-none font-medium disabled:bg-transparent"
                    value={draftForm.body_content}
                    onChange={(e) =>
                      setDraftForm({
                        ...draftForm,
                        body_content: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon({ size, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
