import { useState, useEffect } from "react";
import { supabase } from "../../app/supabase";
import {
  Layout,
  Filter,
  Plus,
  MousePointer2,
  Trash2,
  X,
  CheckSquare,
  Lightbulb,
  BarChart3,
  Lock,
  FileDown,
} from "lucide-react";

// Módulos Hijos
import CampaignWorkplan from "./tabs/CampaignWorkplan";
import CampaignStrategy from "./tabs/CampaignStrategy";
import CampaignConfig from "./tabs/CampaignConfig";
// NUEVO IMPORT
import AlertsCenter from "./components/AlertsCenter";

export default function CampaignsDashboard() {
  // ... (Toda la lógica de estado, useEffect y handlers se mantiene IGUAL que antes) ...
  const [campaigns, setCampaigns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState("workplan");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [formData, setFormData] = useState(initialFormState());

  function initialFormState() {
    return {
      title: "",
      description: "",
      status: "IDEACION",
      priority: "MEDIA",
      start_date: "",
      end_date: "",
      cover_image: "",
      partner_ids: [],
      tasks: [],
      phases: [],
      assets: [],
      budget_details: [],
      budget_total: 0,
      main_objective: "",
      specific_objectives: [],
      target_audience: "",
      key_messages: [],
      kpis: [],
      deliverables: [],
    };
  }

  useEffect(() => {
    fetchDataAndPermissions();
  }, []);

  async function fetchDataAndPermissions() {
    // ... (Lógica de fetch igual) ...
    setLoading(true);
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
        if (profile?.role === "admin" || profile?.edit_campaigns === true)
          canEdit = true;
      }
      setIsReadOnly(!canEdit);

      const { data: camps } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: parts } = await supabase
        .from("partners")
        .select("id, name, logo_url")
        .eq("is_active", true);
      setCampaigns(camps || []);
      setPartners(parts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ... (Handlers handleSelectCampaign, handleCreateNew, etc. IGUALES) ...
  const handleSelectCampaign = (campaign) => {
    if (selectedCampaignId === campaign.id) {
      handleClosePanel();
      return;
    }
    setSelectedCampaignId(campaign.id);
    setFormData({ ...initialFormState(), ...campaign });
    setActiveTab("workplan");
  };

  const handleCreateNew = () => {
    if (isReadOnly) return;
    setSelectedCampaignId("NEW");
    setFormData(initialFormState());
    setActiveTab("general");
  };

  const handleClosePanel = () => {
    setSelectedCampaignId(null);
    setFormData(initialFormState());
  };

  const liveUpdate = async (field, newData) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: newData }));
    if (selectedCampaignId && selectedCampaignId !== "NEW") {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaignId ? { ...c, [field]: newData } : c,
        ),
      );
      await supabase
        .from("campaigns")
        .update({ [field]: newData })
        .eq("id", selectedCampaignId);
    }
  };

  const handleSaveFull = async () => {
    if (isReadOnly) return;
    const payload = { ...formData };
    payload.budget = (payload.budget_details || []).reduce(
      (acc, item) => acc + parseFloat(item.amount || 0),
      0,
    );
    if (selectedCampaignId === "NEW") {
      const { error } = await supabase.from("campaigns").insert([payload]);
      if (error) alert(error.message);
      else {
        handleClosePanel();
        fetchDataAndPermissions();
      }
    } else {
      await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", selectedCampaignId);
    }
  };

  const handleDelete = async () => {
    if (isReadOnly || !confirm("¿Eliminar campaña?")) return;
    await supabase.from("campaigns").delete().eq("id", selectedCampaignId);
    handleClosePanel();
    fetchDataAndPermissions();
  };

  const handleDropCampaign = async (e, targetStatus) => {
    if (isReadOnly) return;
    e.preventDefault();
    const campaignId = e.dataTransfer.getData("campaignId");
    if (!campaignId) return;
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id == campaignId ? { ...c, status: targetStatus } : c,
      ),
    );
    if (selectedCampaignId == campaignId)
      setFormData((prev) => ({ ...prev, status: targetStatus }));
    await supabase
      .from("campaigns")
      .update({ status: targetStatus })
      .eq("id", campaignId);
  };

  const handleExportCampaignReport = async () => {
    // ... (Tu función de exportar IGUAL) ...
    if (!formData) return;
    const getPartnerName = (id) =>
      partners.find((p) => p.id === id)?.name || "N/A";
    // ... (resto del código de exportar) ...
    // Simulación rápida para que el componente no falle si copias y pegas
    alert("Iniciando exportación...");
  };

  const getPriorityColor = (p) => {
    if (p === "ALTA") return "bg-red-50 text-red-600 border-red-200";
    if (p === "BAJA") return "bg-gray-50 text-gray-500 border-gray-200";
    return "bg-orange-50 text-orange-600 border-orange-200";
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-xs font-black uppercase text-brand">
        Cargando...
      </div>
    );

  const columns = [
    { id: "IDEACION", label: "Ideación", color: "border-gray-200" },
    { id: "PRODUCCION", label: "Producción", color: "border-blue-100" },
    { id: "REVISION", label: "Revisión", color: "border-yellow-100" },
    { id: "PROGRAMADO", label: "Programado", color: "border-purple-100" },
    { id: "PUBLICADO", label: "Publicado", color: "border-emerald-100" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50/30 font-sans relative">
      {/* 1. KANBAN SUPERIOR */}
      <div className="h-[45vh] lg:h-[35vh] min-h-[300px] lg:min-h-[250px] border-b border-gray-200 bg-gray-50/30 flex flex-col relative">
        <div className="px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
              <Layout className="text-brand" size={24} md:size={28} /> Campañas
            </h1>
            <p className="text-brand font-bold text-xs mt-1 italic uppercase tracking-widest">
              Gestión Estratégica{" "}
              {isReadOnly && (
                <span className="ml-3 bg-gray-200 text-gray-500 px-2 py-1 rounded inline-flex items-center gap-1">
                  <Lock size={10} /> READ ONLY
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* AQUI AGREGAMOS EL COMPONENTE DE ALERTAS */}
            <AlertsCenter campaigns={campaigns} partners={partners} />

            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-2xl shadow-sm">
              <Filter size={14} className="text-gray-400" />
              <select
                className="bg-transparent text-[10px] md:text-xs font-black uppercase outline-none text-gray-700 min-w-[80px] md:min-w-[100px]"
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
              >
                <option value="ALL">Todos</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!isReadOnly && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.1em] shadow-lg"
              >
                <Plus size={14} /> Nueva
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
          <div className="flex gap-4 h-full min-w-[1200px]">
            {columns.map((col) => {
              const colCamps = campaigns.filter(
                (c) =>
                  c.status === col.id &&
                  (partnerFilter === "ALL" ||
                    c.partner_ids?.includes(partnerFilter)),
              );
              return (
                <div
                  key={col.id}
                  className="flex-1 min-w-[260px] flex flex-col h-full"
                  onDragOver={(e) => !isReadOnly && e.preventDefault()}
                  onDrop={(e) => handleDropCampaign(e, col.id)}
                >
                  <div
                    className={`text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 pl-2 border-l-4 ${col.color}`}
                  >
                    {col.label} ({colCamps.length})
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {colCamps.map((card) => (
                      <div
                        key={card.id}
                        draggable={!isReadOnly}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("campaignId", card.id)
                        }
                        onClick={() => handleSelectCampaign(card)}
                        className={`rounded-2xl border bg-white p-4 relative group cursor-pointer transition-all ${selectedCampaignId === card.id ? "border-brand ring-2 ring-brand/10 shadow-lg scale-[1.01]" : "border-gray-100 hover:border-brand/30 hover:shadow-md"}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${getPriorityColor(card.priority)}`}
                          >
                            {card.priority}
                          </span>
                        </div>
                        <h4
                          className={`font-black text-xs leading-snug mb-2 uppercase ${selectedCampaignId === card.id ? "text-brand" : "text-gray-800"}`}
                        >
                          {card.title}
                        </h4>
                        <div className="flex -space-x-1.5">
                          {partners
                            .filter((p) => card.partner_ids?.includes(p.id))
                            .slice(0, 3)
                            .map((p) => (
                              <img
                                key={p.id}
                                src={p.logo_url}
                                className="w-5 h-5 rounded-full border border-white object-cover bg-gray-100"
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PANEL DE GESTIÓN (TABS) - SIN CAMBIOS AQUÍ */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col relative z-10 shadow-t border-t border-gray-100">
        {!selectedCampaignId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
            <MousePointer2 size={48} className="mb-4 text-gray-200" />
            <p className="font-black text-xs uppercase tracking-[0.2em]">
              Selecciona una campaña
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-6 duration-500">
            <div className="px-4 md:px-8 py-3 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white shadow-sm z-20 gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-6 w-full">
                <div className="flex flex-wrap bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                  {[
                    { id: "workplan", label: "Ejecución", icon: CheckSquare },
                    { id: "strategy", label: "Estrategia", icon: Lightbulb },
                    { id: "general", label: "Configuración", icon: Layout },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>
                <div className="hidden md:block h-6 w-px bg-gray-100"></div>
                <h2 className="text-lg md:text-2xl font-black text-gray-900 uppercase tracking-tighter truncate leading-none">
                  {selectedCampaignId === "NEW"
                    ? "Nueva Campaña"
                    : formData.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedCampaignId !== "NEW" && (
                  <button
                    onClick={handleExportCampaignReport}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-emerald-100 transition-colors mr-2"
                  >
                    <FileDown size={16} /> Exportar
                  </button>
                )}
                {!isReadOnly && selectedCampaignId !== "NEW" && (
                  <button
                    onClick={handleDelete}
                    className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={handleClosePanel}
                  className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 md:p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto bg-white rounded-[32px] shadow-sm border border-gray-100 min-h-[500px] p-4 md:p-8">
                {activeTab === "workplan" && (
                  <CampaignWorkplan
                    formData={formData}
                    liveUpdate={liveUpdate}
                    isReadOnly={isReadOnly}
                    partners={partners}
                  />
                )}
                {activeTab === "strategy" && (
                  <CampaignStrategy
                    formData={formData}
                    liveUpdate={liveUpdate}
                    isReadOnly={isReadOnly}
                  />
                )}
                {activeTab === "general" && (
                  <CampaignConfig
                    formData={formData}
                    liveUpdate={liveUpdate}
                    isReadOnly={isReadOnly}
                    partners={partners}
                    onSaveFull={handleSaveFull}
                    isNew={selectedCampaignId === "NEW"}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
