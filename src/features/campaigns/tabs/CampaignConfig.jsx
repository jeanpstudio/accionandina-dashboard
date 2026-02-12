import { useState } from "react";
import {
  Link as LinkIcon,
  FolderOpen,
  X,
  ImageIcon,
  Plus,
  Wallet,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

export default function CampaignConfig({
  formData,
  liveUpdate,
  isReadOnly,
  partners,
  onSaveFull,
  isNew,
}) {
  const [newAssetLabel, setNewAssetLabel] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newBudgetItem, setNewBudgetItem] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newKpiName, setNewKpiName] = useState("");
  const [newKpiTarget, setNewKpiTarget] = useState("");

  const addAsset = () => {
    if (isReadOnly || !newAssetLabel || !newAssetUrl) return;
    const asset = { id: Date.now(), label: newAssetLabel, url: newAssetUrl };
    liveUpdate("assets", [...formData.assets, asset]);
    setNewAssetLabel("");
    setNewAssetUrl("");
  };
  const addBudgetItem = () => {
    if (isReadOnly || !newBudgetItem || !newBudgetAmount) return;
    const item = {
      id: Date.now(),
      item: newBudgetItem,
      amount: parseFloat(newBudgetAmount),
    };
    liveUpdate("budget_details", [...formData.budget_details, item]);
    setNewBudgetItem("");
    setNewBudgetAmount("");
  };
  const addKpi = () => {
    if (isReadOnly || !newKpiName.trim()) return;
    const kpi = {
      id: Date.now(),
      name: newKpiName,
      target: newKpiTarget || "0",
      current: "0",
    };
    liveUpdate("kpis", [...formData.kpis, kpi]);
    setNewKpiName("");
    setNewKpiTarget("");
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Nombre de Campaña
        </label>
        <input
          disabled={isReadOnly}
          type="text"
          className="w-full bg-gray-50 p-4 rounded-2xl font-black text-lg border-2 border-transparent focus:bg-white focus:border-brand outline-none"
          value={formData.title}
          onChange={(e) => liveUpdate("title", e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-widest">
          <LinkIcon size={14} /> Centro de Recursos
        </label>
        <div className="space-y-2">
          {formData.assets.map((asset) => (
            <div
              key={asset.id}
              className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-xl"
            >
              <a
                href={asset.url}
                target="_blank"
                className="flex items-center gap-3 text-xs font-bold text-blue-700 hover:underline"
              >
                <FolderOpen size={16} /> {asset.label}
              </a>
              {!isReadOnly && (
                <button
                  onClick={() =>
                    liveUpdate(
                      "assets",
                      formData.assets.filter((a) => a.id !== asset.id),
                    )
                  }
                  className="text-blue-300 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre"
              className="w-1/3 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
              value={newAssetLabel}
              onChange={(e) => setNewAssetLabel(e.target.value)}
            />
            <input
              type="url"
              placeholder="URL..."
              className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-medium outline-none"
              value={newAssetUrl}
              onChange={(e) => setNewAssetUrl(e.target.value)}
            />
            <button
              onClick={addAsset}
              className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-widest">
          <ImageIcon size={14} /> Imagen de Portada (URL)
        </label>
        <input
          type="url"
          className="w-full bg-gray-50 p-3 rounded-xl text-xs font-medium outline-none"
          placeholder="https://..."
          value={formData.cover_image || ""}
          onChange={(e) => liveUpdate("cover_image", e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="border border-gray-200 rounded-3xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
            <Wallet size={20} className="text-brand" /> Presupuesto
          </h3>
          <span className="text-2xl font-black text-gray-900 bg-gray-100 px-4 py-2 rounded-xl">
            S/{" "}
            {formData.budget_details
              .reduce((acc, i) => acc + i.amount, 0)
              .toFixed(2)}
          </span>
        </div>
        <div className="space-y-2 mb-4">
          {formData.budget_details.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group"
            >
              <span className="text-xs font-bold text-gray-700">
                {item.item}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-gray-900">
                  S/ {item.amount}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() =>
                      liveUpdate(
                        "budget_details",
                        formData.budget_details.filter((i) => i.id !== item.id),
                      )
                    }
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Concepto"
              className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none"
              value={newBudgetItem}
              onChange={(e) => setNewBudgetItem(e.target.value)}
            />
            <input
              type="number"
              placeholder="Monto"
              className="w-32 bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
            />
            <button
              onClick={addBudgetItem}
              className="bg-brand text-white px-4 rounded-xl hover:bg-black"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-3xl p-8 bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2">
            <TrendingUp size={20} className="text-brand" /> KPIs
          </h3>
          {!isReadOnly && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Métrica"
                className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold outline-none w-32"
                value={newKpiName}
                onChange={(e) => setNewKpiName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Meta"
                className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold outline-none w-20"
                value={newKpiTarget}
                onChange={(e) => setNewKpiTarget(e.target.value)}
              />
              <button
                onClick={addKpi}
                className="bg-brand text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-black uppercase"
              >
                + KPI
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {formData.kpis.map((k) => (
            <div
              key={k.id}
              className="p-4 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  {k.name}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() =>
                      liveUpdate(
                        "kpis",
                        formData.kpis.filter((x) => x.id !== k.id),
                      )
                    }
                    className="text-gray-300 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <input
                  disabled={isReadOnly}
                  type="number"
                  className="text-2xl font-black text-gray-900 bg-transparent outline-none w-24"
                  value={k.current}
                  onChange={(e) =>
                    liveUpdate(
                      "kpis",
                      formData.kpis.map((x) =>
                        x.id === k.id ? { ...x, current: e.target.value } : x,
                      ),
                    )
                  }
                />
                <span className="text-xs font-bold text-gray-400">
                  / {k.target}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${parseFloat(k.current) / parseFloat(k.target) >= 1 ? "bg-emerald-500" : "bg-brand"}`}
                  style={{
                    width: `${Math.min((parseFloat(k.current) / parseFloat(k.target)) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isNew && !isReadOnly && (
        <div className="pt-8 border-t border-gray-100 flex justify-end">
          <button
            onClick={onSaveFull}
            className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
          >
            Crear Campaña
          </button>
        </div>
      )}
    </div>
  );
}
