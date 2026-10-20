import { useState, useRef, useEffect } from "react";
import { useLayout } from "../context/LayoutContext";
import { ZoomIn, ZoomOut, RotateCcw, Type } from "lucide-react";

export default function TextScaleWidget({ compact = false }) {
  const { textScale, zoomIn, zoomOut, resetZoom, setTextScale, SCALE_STEPS } =
    useLayout();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Cerrar el popover al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const isDefault = textScale === 100;

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <div className="flex items-center bg-white/90 backdrop-blur-xs border border-gray-200/80 rounded-xl p-0.5 shadow-xs transition-all hover:border-brand/40">
        {/* BOTÓN: REDUCIR TEXTO */}
        <button
          type="button"
          onClick={zoomOut}
          disabled={textScale <= 80}
          title="Reducir tamaño de texto (A-)"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
          aria-label="Reducir tamaño de texto"
        >
          <span className="text-xs font-black tracking-tighter">A-</span>
        </button>

        {/* PILL CENTRAL: INDICADOR DE ESCALA Y APERTURA DE PRESETS */}
        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          title={`Tamaño actual: ${textScale}%. Clic para opciones o restablecer.`}
          className={`flex items-center gap-1 px-2 h-7 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
            isDefault
              ? "text-gray-600 hover:bg-gray-100"
              : "bg-emerald-50 text-emerald-800 font-black border border-emerald-200/70 shadow-2xs"
          }`}
          aria-label={`Escala de texto ${textScale}%`}
        >
          <Type size={11} className={isDefault ? "text-gray-400" : "text-emerald-700"} />
          <span>{textScale}%</span>
        </button>

        {/* BOTÓN: AUMENTAR TEXTO */}
        <button
          type="button"
          onClick={zoomIn}
          disabled={textScale >= 140}
          title="Aumentar tamaño de texto (A+)"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
          aria-label="Aumentar tamaño de texto"
        >
          <span className="text-xs font-black tracking-tighter">A+</span>
        </button>
      </div>

      {/* DROPDOWN FLOTANTE DE PRESETS */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Tamaño de Texto
            </span>
            {!isDefault && (
              <button
                type="button"
                onClick={() => {
                  resetZoom();
                  setShowMenu(false);
                }}
                className="text-[9px] font-bold text-brand hover:underline flex items-center gap-1"
                title="Restablecer a 100%"
              >
                <RotateCcw size={10} /> Restablecer
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1">
            {SCALE_STEPS.map((step) => {
              const active = textScale === step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    setTextScale(step);
                    setShowMenu(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all ${
                    active
                      ? "bg-brand text-white shadow-xs scale-102"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {step}%
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 px-2 text-[9px] text-gray-400 text-center font-medium">
            Optimizado para monitores verticales y pantallas de alta resolución.
          </div>
        </div>
      )}
    </div>
  );
}
