import { createContext, useContext, useState, useEffect } from "react";

const LayoutContext = createContext(null);

const SCALE_STEPS = [85, 92, 100, 110, 120, 130];
const DEFAULT_SCALE = 100;
const STORAGE_KEY_SCALE = "aa_dashboard_text_scale";
const STORAGE_KEY_SIDEBAR = "aa_dashboard_sidebar_collapsed";

export function LayoutProvider({ children }) {
  // 1. ESCALA GLOBAL DE TEXTO
  const [textScale, setTextScaleState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCALE);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 75 && parsed <= 150) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SCALE;
  });

  // Aplicar escala a nivel del elemento raíz (HTML) para que afecte todas las unidades rem
  useEffect(() => {
    try {
      document.documentElement.style.fontSize = `${textScale}%`;
      document.documentElement.setAttribute("data-text-scale", String(textScale));
      localStorage.setItem(STORAGE_KEY_SCALE, String(textScale));
    } catch (err) {
      console.error("Error setting text scale:", err);
    }
  }, [textScale]);

  const zoomIn = () => {
    setTextScaleState((prev) => {
      const next = SCALE_STEPS.find((s) => s > prev);
      return next !== undefined ? next : Math.min(prev + 10, 140);
    });
  };

  const zoomOut = () => {
    setTextScaleState((prev) => {
      const reversed = [...SCALE_STEPS].reverse();
      const prevStep = reversed.find((s) => s < prev);
      return prevStep !== undefined ? prevStep : Math.max(prev - 10, 80);
    });
  };

  const resetZoom = () => {
    setTextScaleState(DEFAULT_SCALE);
  };

  const setTextScale = (val) => {
    const clamped = Math.max(75, Math.min(150, val));
    setTextScaleState(clamped);
  };

  // 2. DETECCIÓN RESPONSIVA Y MODO VERTICAL
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(orientation: portrait)").matches ||
      window.innerHeight > window.innerWidth
    );
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  // Preferencia manual de colapso de sidebar en escritorio horizontal
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIDEBAR) === "true";
    } catch {
      return false;
    }
  });

  // Estado del drawer de sidebar (abierto/cerrado)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portraitQuery = window.matchMedia("(orientation: portrait)").matches;
      const isTall = window.innerHeight > window.innerWidth;
      const portraitNow = portraitQuery || isTall;
      setIsPortrait(portraitNow);
      setIsMobile(window.innerWidth < 1024);

      // Si entra en modo vertical o móvil, asegurar que el sidebar fijo se oculte
      if (portraitNow || window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // El sidebar debe comportarse como Drawer (oculto por defecto) si estamos en modo vertical o pantalla pequeña
  const isDrawerMode = isPortrait || isMobile;

  // El sidebar está anclado (visible permanentemente en desktop horizontal) solo si no es drawer y no está colapsado
  const isSidebarPinned = !isDrawerMode && !isSidebarCollapsed;

  return (
    <LayoutContext.Provider
      value={{
        // Text zoom
        textScale,
        zoomIn,
        zoomOut,
        resetZoom,
        setTextScale,
        SCALE_STEPS,
        // Responsive orientation
        isPortrait,
        isMobile,
        isDrawerMode,
        isSidebarPinned,
        // Sidebar controls
        isSidebarOpen,
        isSidebarCollapsed,
        toggleSidebar,
        closeSidebar,
        openSidebar,
        toggleSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
