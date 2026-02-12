import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 1. HEADER MÓVIL (Solo visible en pantallas pequeñas) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-brand flex items-center justify-between px-6 z-30 border-b border-green-900/50 shadow-md">
        <h1 className="text-white font-bold tracking-tight">ACCIÓN ANDINA</h1>
        <button
          onClick={toggleSidebar}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* 2. BARRA LATERAL */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* 3. CONTENIDO PRINCIPAL */}
      <main
        className={`flex-1 transition-all duration-300 pt-16 lg:pt-0 lg:ml-64 p-4 md:p-8`}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
