import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // <--- LA CLAVE MÁGICA
import {
  Bell,
  AlertCircle,
  Clock,
  UploadCloud,
  X,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function AlertsCenter({ campaigns, partners }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [alerts, setAlerts] = useState({ critical: [], warning: [], info: [] });

  // Posición del botón para alinear el menú (opcional, por ahora usaremos fixed simple)
  const buttonRef = useRef(null);

  useEffect(() => {
    if (campaigns && partners) {
      generateAlerts();
    }
  }, [campaigns, partners]);

  // Cierra el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        // Un pequeño hack: verificamos que el click no sea dentro del portal del menú
        const dropdown = document.getElementById("alerts-dropdown-portal");
        if (dropdown && !dropdown.contains(event.target)) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateAlerts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let newAlerts = { critical: [], warning: [], info: [] };

    campaigns.forEach((camp) => {
      const tasks = camp.tasks || [];
      const campPartners = camp.partner_ids || [];

      // 1. SOCIOS INACTIVOS
      const activePartnerIds = new Set();
      tasks.forEach((t) =>
        (t.assigned_to || []).forEach((pid) => activePartnerIds.add(pid)),
      );
      campPartners.forEach((pid) => {
        if (!activePartnerIds.has(pid)) {
          const pName = partners.find((p) => p.id === pid)?.name || "Socio";
          newAlerts.warning.push({
            id: `inactive-${camp.id}-${pid}`,
            title: "Socio Sin Tareas",
            desc: `${pName} participa pero no tiene asignaciones.`,
            campName: camp.title,
            type: "INACTIVE",
          });
        }
      });

      // 2. TAREAS
      tasks.forEach((task) => {
        if (task.done) return;
        const taskDate = task.date ? new Date(task.date + "T00:00:00") : null;
        if (!taskDate) return;
        const partnerName = (id) =>
          partners.find((p) => p.id === id)?.name || "Socio";

        // Material Faltante
        if (task.task_type === "MANAGEMENT" && taskDate <= today) {
          (task.assigned_to || []).forEach((pid) => {
            const tracking = task.delivery_tracking?.[pid];
            if (!tracking?.uploaded) {
              newAlerts.critical.push({
                id: `upload-${task.id}-${pid}`,
                title: "Material Faltante",
                desc: `${partnerName(pid)} no ha subido archivos.`,
                taskTitle: task.title,
                campName: camp.title,
                type: "UPLOAD",
              });
            }
          });
        }

        // Vencimientos
        if (taskDate < today) {
          newAlerts.critical.push({
            id: `overdue-${task.id}`,
            title: "Vencida",
            desc: `Venció el ${task.date}.`,
            taskTitle: task.title,
            campName: camp.title,
            type: "OVERDUE",
          });
        } else if (taskDate.getTime() === today.getTime()) {
          newAlerts.warning.push({
            id: `today-${task.id}`,
            title: "Vence Hoy",
            desc: "Cierre programado para hoy.",
            taskTitle: task.title,
            campName: camp.title,
            type: "SOON",
          });
        } else if (taskDate.getTime() === tomorrow.getTime()) {
          newAlerts.info.push({
            id: `tmrw-${task.id}`,
            title: "Mañana",
            desc: "Prepárate para mañana.",
            taskTitle: task.title,
            campName: camp.title,
            type: "INFO",
          });
        }
      });
    });

    setAlerts(newAlerts);

    // AUTO-OPEN solo si hay críticas y es la primera vez
    if (newAlerts.critical.length > 0) {
      setTimeout(() => setShowWelcomeModal(true), 1000);
    }
  };

  const totalAlerts =
    alerts.critical.length + alerts.warning.length + alerts.info.length;

  const AlertCard = ({ alert, variant }) => {
    const colors = {
      critical: "bg-red-50 border-red-100 text-red-600",
      warning: "bg-orange-50 border-orange-100 text-orange-600",
      info: "bg-blue-50 border-blue-100 text-blue-600",
    };
    const icons = {
      UPLOAD: <UploadCloud size={16} />,
      OVERDUE: <AlertCircle size={16} />,
      INACTIVE: <Users size={16} />,
      SOON: <Clock size={16} />,
      INFO: <Clock size={16} />,
    };

    return (
      <div
        className={`p-3 rounded-xl border ${colors[variant]} mb-2 transition-all hover:shadow-sm`}
      >
        <div className="flex gap-3">
          <div className="mt-0.5">
            {icons[alert.type] || <AlertCircle size={16} />}
          </div>
          <div>
            <div className="flex justify-between items-start w-full">
              <h4 className="text-xs font-black uppercase tracking-wide mb-0.5">
                {alert.title}
              </h4>
            </div>
            <p className="text-xs font-bold text-gray-800 mb-1 leading-snug">
              {alert.desc}
            </p>
            <div className="flex flex-col gap-0.5">
              {alert.taskTitle && (
                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[220px]">
                  Tarea: {alert.taskTitle}
                </span>
              )}
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                {alert.campName}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. BOTÓN CAMPANA (SE QUEDA EN EL HEADER) */}
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2.5 rounded-xl transition-all outline-none ${isOpen ? "bg-gray-900 text-white shadow-md ring-2 ring-gray-900 ring-offset-1" : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"}`}
        >
          <Bell size={20} />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-pulse">
              {totalAlerts}
            </span>
          )}
        </button>
      </div>

      {/* 2. MENÚ DESPLEGABLE (PORTAL: SE RENDERIZA FUERA DEL HEADER) */}
      {isOpen &&
        createPortal(
          <div
            id="alerts-dropdown-portal"
            className="fixed top-20 right-10 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right ring-1 ring-black/5"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                  Centro de Alertas
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  {totalAlerts} notificaciones
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3 bg-white">
              {totalAlerts === 0 && (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="bg-emerald-50 p-4 rounded-full mb-3 shadow-sm border border-emerald-100">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    ¡Todo al día!
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                    No tienes tareas vencidas ni pendientes urgentes.
                  </p>
                </div>
              )}

              {alerts.critical.map((a) => (
                <AlertCard key={a.id} alert={a} variant="critical" />
              ))}
              {alerts.warning.map((a) => (
                <AlertCard key={a.id} alert={a} variant="warning" />
              ))}
              {alerts.info.map((a) => (
                <AlertCard key={a.id} alert={a} variant="info" />
              ))}
            </div>
          </div>,
          document.body, // <--- ESTO LO ENVÍA AL BODY
        )}

      {/* 3. MODAL DE BIENVENIDA (PORTAL: SE RENDERIZA FUERA DE TODO) */}
      {showWelcomeModal &&
        createPortal(
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 transform transition-all border border-gray-200">
              <div className="bg-red-500 p-8 flex justify-between items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <AlertCircle size={120} color="white" />
                </div>
                <div className="text-white relative z-10">
                  <div className="bg-white/20 p-2 rounded-xl w-fit mb-4 backdrop-blur-sm">
                    <AlertCircle size={24} />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
                    Atención
                    <br />
                    Requerida
                  </h2>
                  <p className="text-white/90 text-sm font-medium">
                    Tienes{" "}
                    <span className="font-black underline">
                      {alerts.critical.length} asuntos críticos
                    </span>{" "}
                    que requieren tu acción inmediata.
                  </p>
                </div>
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm relative z-10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar bg-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>{" "}
                  Pendientes Urgentes
                </h4>
                <div className="space-y-3">
                  {alerts.critical.map((a) => (
                    <AlertCard key={a.id} alert={a} variant="critical" />
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white">
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
                >
                  Entendido, ir al Dashboard
                </button>
              </div>
            </div>
          </div>,
          document.body, // <--- ESTO TAMBIÉN LO ENVÍA AL BODY
        )}
    </>
  );
}
