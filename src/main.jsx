import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

// 👇 Importamos nuestro nuevo Proveedor de Auth
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {/* 👇 EL CAMBIO ESTÁ AQUÍ:
          Envolvemos <App /> con <AuthProvider>.
          Ahora toda la app tiene acceso al usuario logueado. */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
