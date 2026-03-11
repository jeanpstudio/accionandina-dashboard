/**
 * PESTAÑA: CampaignStrategy
 * -------------------------
 * Definición del ADN y la narrativa de la campaña.
 * 
 * COMPONENTES:
 * 1. STORYTELLING: Editor enriquecido para el contexto narrativo.
 * 2. MATRIZ DE OBJETIVOS: Diferenciación entre el objetivo rector y los tácticos.
 * 3. AUDIENCIAS & MENSAJES: Segmentación y "Key Messages" para garantizar coherencia editorial.
 */
import { useState } from "react";
import { Target, MessageSquare, Plus, X, Quote } from "lucide-react";
import RichEditor from "../../../components/RichEditor";

export default function CampaignStrategy({ formData, liveUpdate, isReadOnly }) {
  // Estados locales para los inputs
  const [newSpecificObj, setNewSpecificObj] = useState("");
  const [newKeyMsg, setNewKeyMsg] = useState("");

  const addListItem = (field, text, setText) => {
    if (isReadOnly || !text.trim()) return;
    const currentList = Array.isArray(formData[field]) ? formData[field] : [];
    liveUpdate(field, [...currentList, { id: Date.now(), text }]);
    setText("");
  };

  const removeListItem = (field, id) => {
    if (isReadOnly) return;
    const currentList = Array.isArray(formData[field]) ? formData[field] : [];
    liveUpdate(
      field,
      currentList.filter((i) => i.id !== id),
    );
  };

  const getList = (key) => (Array.isArray(formData[key]) ? formData[key] : []);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
      {/* 1. OBJETIVOS ESTRATÉGICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Storytelling */}
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Storytelling / Contexto
          </label>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <RichEditor
              value={formData.description || ""}
              onChange={(val) => liveUpdate("description", val)}
              placeholder="¿Cuál es la historia detrás de la campaña?..."
              minHeight="200px"
            />
          </div>
        </div>

        {/* Objetivos */}
        <div className="space-y-6">
          {/* Objetivo Principal */}
          <div className="space-y-3">
            <label className="text-xs font-black text-brand uppercase tracking-widest flex items-center gap-2">
              <Target size={16} /> Objetivo Principal
            </label>
            <textarea
              disabled={isReadOnly}
              className="w-full bg-brand/5 border border-brand/10 p-5 rounded-2xl text-lg font-bold text-gray-800 outline-none focus:bg-white focus:border-brand transition-all resize-none leading-relaxed placeholder:font-normal placeholder:text-gray-300"
              rows="3"
              placeholder="¿Qué queremos lograr principalmente?"
              value={formData.main_objective || ""}
              onChange={(e) => liveUpdate("main_objective", e.target.value)}
            ></textarea>
          </div>

          {/* Objetivos Específicos (DISEÑO MEJORADO: NUMERADO) */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Objetivos Específicos
            </label>
            {!isReadOnly && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Agregar objetivo..."
                  className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-brand transition-all"
                  value={newSpecificObj}
                  onChange={(e) => setNewSpecificObj(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    addListItem(
                      "specific_objectives",
                      newSpecificObj,
                      setNewSpecificObj,
                    )
                  }
                />
                <button
                  onClick={() =>
                    addListItem(
                      "specific_objectives",
                      newSpecificObj,
                      setNewSpecificObj,
                    )
                  }
                  className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition-colors shadow-md"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            <div className="space-y-3">
              {getList("specific_objectives").map((item, index) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  {/* Número Estilizado */}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-black shrink-0 mt-0.5 border border-gray-200">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed flex-1 pt-0.5">
                    {item.text}
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={() =>
                        removeListItem("specific_objectives", item.id)
                      }
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {getList("specific_objectives").length === 0 && (
                <p className="text-xs text-gray-300 italic p-2 border border-dashed border-gray-200 rounded-xl text-center">
                  No hay objetivos definidos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 2. AUDIENCIA Y MENSAJES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Público Objetivo */}
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Público Objetivo
          </label>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <RichEditor
              value={formData.target_audience || ""}
              onChange={(val) => liveUpdate("target_audience", val)}
              placeholder="Describe a tu audiencia ideal..."
              minHeight="200px"
            />
          </div>
        </div>

        {/* Mensajes Clave (DISEÑO MEJORADO: BURBUJAS) */}
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={16} /> Mensajes Clave
          </label>
          {!isReadOnly && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Agregar mensaje clave..."
                className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-brand transition-all"
                value={newKeyMsg}
                onChange={(e) => setNewKeyMsg(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  addListItem("key_messages", newKeyMsg, setNewKeyMsg)
                }
              />
              <button
                onClick={() =>
                  addListItem("key_messages", newKeyMsg, setNewKeyMsg)
                }
                className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition-colors shadow-md"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {getList("key_messages").map((item) => (
              <div
                key={item.id}
                className="group relative p-4 bg-blue-50/50 border border-blue-100 rounded-2xl rounded-tl-none ml-2 transition-all hover:bg-blue-50"
              >
                {/* Icono Cita decorativo */}
                <div className="absolute -top-2 -left-2 bg-white text-blue-300 p-1 rounded-full border border-blue-100 shadow-sm">
                  <Quote size={12} fill="currentColor" />
                </div>

                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm text-blue-900 font-medium leading-relaxed">
                    {item.text}
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={() => removeListItem("key_messages", item.id)}
                      className="text-blue-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {getList("key_messages").length === 0 && (
              <p className="text-xs text-gray-300 italic p-2 border border-dashed border-gray-200 rounded-xl text-center">
                No hay mensajes clave.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
