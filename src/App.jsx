/**
 * NÚCLEO DE LA APLICACIÓN: App.jsx
 * --------------------------------
 * Este componente orquestador gestiona el enrutamiento principal (Routing)
 * y la lógica de protección de rutas basada en el contexto de autenticación.
 * 
 * ESTRUCTURA DE RUTAS:
 * - Públicas: /login (redirige si ya hay sesión).
 * - Privadas: Envueltas en <MainLayout /> para persistencia de la interfaz.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./features/auth/Login";
import MainLayout from "./layouts/MainLayout";
import Supervision from "./features/supervision/Supervision";
import ReportForm from "./features/supervision/ReportForm";
import History from "./features/supervision/History";
import ProjectForm from "./features/supervision/ProjectForm";
import PartnerForm from "./features/supervision/PartnerForm";
import GlobalReport from "./features/supervision/GlobalReport";
import AdminDashboard from "./features/admin/AdminDashboard";
import VideosDashboard from "./features/videos/VideosDashboard";
import MeetingsDashboard from "./features/meetings/MeetingsDashboard";
import HomeDashboard from "./features/dashboard/HomeDashboard";
import MailingBuilder from "./features/mailing/MailingBuilder";
import Prensa from "./features/prensa/Prensa";
import UserAdmin from "./features/admin/UserAdmin";
import PartnerStories from "./features/stories/PartnerStories";
import CampaignsDashboard from "./features/campaigns/CampaignsDashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-brand flex items-center justify-center text-white">
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

      {/* Rutas Privadas */}
      {user ? (
        <Route element={<MainLayout />}>
          {/* Dashboard Principal */}
          <Route
            path="/"
            element={
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-800">
                  Panel de Control
                </h1>
                <p className="text-gray-500">
                  Bienvenido al Hub de Comunicaciones.
                </p>
              </div>
            }
          />
          <Route index element={<HomeDashboard />} />
          {/* === MÓDULO SUPERVISIÓN === */}
          <Route path="/supervision" element={<Supervision />} />
          <Route
            path="/supervision/nuevo-reporte/:projectId"
            element={<ReportForm />}
          />
          <Route
            path="/supervision/editar-reporte/:projectId/:reportId"
            element={<ReportForm />}
          />
          <Route
            path="/supervision/historial/:projectId"
            element={<History />}
          />
          <Route path="/new-project/:partnerId" element={<ProjectForm />} />
          <Route path="/edit-project/:projectId" element={<ProjectForm />} />
          <Route path="/new-partner" element={<PartnerForm />} />
          <Route path="/edit-partner/:partnerId" element={<PartnerForm />} />
          <Route path="/global-report" element={<GlobalReport />} />

          {/* === MÓDULO CAMPAÑAS (Aquí estaba el error) === */}
          {/* Ahora usamos el componente real dentro del Layout */}
          <Route path="/campaigns" element={<CampaignsDashboard />} />

          {/* === OTROS MÓDULOS (Aún con placeholders) === */}

          <Route path="/videos" element={<VideosDashboard />} />
          <Route path="meetings" element={<MeetingsDashboard />} />
          <Route path="mailing" element={<MailingBuilder />} />
          <Route path="/prensa" element={<Prensa />} />
          <Route path="/historias" element={<PartnerStories />} />
          <Route path="/admin-users" element={<UserAdmin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
}
