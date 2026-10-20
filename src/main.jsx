/**
 * PUNTO DE ENTRADA (Entry Point): main.jsx
 * ---------------------------------------
 * Este es el archivo raíz que inicializa la aplicación React en el DOM.
 * 
 * ARQUITECTURA DE PROVEEDORES:
 * 1. <StrictMode>: Ayuda a identificar problemas potenciales en el desarrollo.
 * 2. <BrowserRouter>: Habilita el sistema de navegación (React Router).
 * 3. <AuthProvider>: Gestiona el estado global de autenticación (Supabase).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

// 👇 Importamos nuestro nuevo Proveedor de Auth y Layout
import { AuthProvider } from "./context/AuthContext.jsx";
import { LayoutProvider } from "./context/LayoutContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
