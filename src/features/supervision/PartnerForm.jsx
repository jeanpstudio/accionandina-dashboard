import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../app/supabase";
import { Save, ArrowLeft, Building2, Globe2, Mail, Image } from "lucide-react";

export default function PartnerForm() {
  const navigate = useNavigate();
  const { partnerId } = useParams(); // Para saber si editamos
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(partnerId);

  const [formData, setFormData] = useState({
    name: "",
    country: "Perú",
    contact_email: "",
    logo_url: "",
  });

  // CARGAR DATOS SI ESTAMOS EDITANDO
  useEffect(() => {
    if (isEditing) {
      const fetchPartner = async () => {
        const { data, error } = await supabase
          .from("partners")
          .select("*")
          .eq("id", partnerId)
          .single();

        if (data) {
          setFormData({
            name: data.name,
            country: data.country,
            contact_email: data.contact_email || "",
            logo_url: data.logo_url || "",
          });
        }
      };
      fetchPartner();
    }
  }, [partnerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from("partners")
        .update(formData)
        .eq("id", partnerId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("partners")
        .insert([{ ...formData, is_active: true }]);
      error = insertError;
    }

    if (error) {
      alert("Error: " + error.message);
    } else {
      navigate("/supervision");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-gray-50/20 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand mb-4 font-bold text-[10px] uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">
            {isEditing ? "Editar Socio" : "Nuevo Socio"}
          </h1>
          <p className="text-brand font-bold text-sm md:text-lg mt-1 italic">
            {isEditing
              ? "Actualizar información de la ONG"
              : "Registrar nueva alianza"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl text-brand">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
              Datos de la Organización
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Nombre de la ONG / Socio
              </label>
              <input
                type="text"
                placeholder="Ej: ECOAN"
                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-brand/20"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  País
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                  <Globe2
                    size={16}
                    className="absolute right-4 top-4 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Email de Contacto
                </label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_email: e.target.value,
                      })
                    }
                  />
                  <Mail
                    size={16}
                    className="absolute right-4 top-4 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                URL del Logo (Opcional)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-sm outline-none"
                  value={formData.logo_url}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_url: e.target.value })
                  }
                />
                <Image
                  size={16}
                  className="absolute right-4 top-4 text-gray-400 pointer-events-none"
                />
              </div>
              {formData.logo_url && (
                <div className="mt-2 w-16 h-16 rounded-xl border overflow-hidden">
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 md:py-6 rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 text-sm tracking-[0.2em] uppercase active:scale-[0.98]"
        >
          {loading
            ? "Guardando..."
            : isEditing
              ? "Actualizar Socio"
              : "Registrar Socio"}
          <Save size={20} className="text-brand" />
        </button>
      </form>
    </div>
  );
}
