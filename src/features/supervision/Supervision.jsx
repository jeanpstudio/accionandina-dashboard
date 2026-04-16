/**
 * COMPONENTE: Supervision (Dashboard Maestro)
 * ------------------------------------------
 * Centro neurálgico para la administración de la red de socios y paisajes.
 * 
 * ARQUITECTURA:
 * 1. GESTIÓN DE SOCIOS (Partners): CRUD de ONGs vinculadas.
 * 2. GESTIÓN DE PAISAJES (Projects): Configuración de metas de auditoría por sitio.
 * 3. CONTROL DE ACCESOS (RBAC): Lógica granular que permite a editores supervisar 
 *    proyectos específicos sin privilegios de Admin total.
 * 4. CONFIGURACIÓN GLOBAL: Seteo de campañas de temporada y cronograma Milkywire.
 * 
 * SEGURIDAD:
 * - Implementa un modo 'isReadOnly' dinámico basado en permisos de Supabase.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../app/supabase";
import {
  readMilkywireFeatureEnabled,
  writeMilkywireFeatureEnabled,
  subscribeMilkywireFeatureEnabled,
} from "../../lib/milkywireFeature";
import {
  Users,
  Settings2,
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Search,
  Globe,
  Calendar,
  Smartphone,
  Mail,
  Globe2,
  Check,
  X,
  ChevronRight,
  History,
  UserPlus,
  Shield,
  Settings,
  Megaphone,
  MapPin,
  Lock,
  Briefcase,
  BarChart3,
  FileText,
  Image as ImageIcon,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Copy,
  Eraser,
} from "lucide-react";

/**
 * COMPONENTE: Supervision
 * -----------------------
 * Este es el centro de control para los administradores y editores de Acción Andina.
 * Su función principal es gestionar la red de socios (Partners), los usuarios del sistema
 * y la configuración global de las temporadas (Campañas y Milkywire).
 * 
 * SEGURIDAD (RBAC):
 * - ADMIN: Acceso total a todos los socios, proyectos, creación de usuarios y configuraciones.
 * - EDITOR (con edit_supervision): Puede gestionar reportes y ver todo, pero con restricciones.
 * - OTROS (PARTNERS): Solo ven lo que les corresponde según 'user_project_access'.
 * */
export default function Supervision() {
  const navigate = useNavigate();

  // --- ESTADOS DE NAVEGACIÓN Y SELECCIÓN ---
  const [activeTab, setActiveTab] = useState("partners"); // Pestaña actual: "partners" | "users"
  const [selectedPartnerForHistory, setSelectedPartnerForHistory] =
    useState(null); // Socio seleccionado para ver historial (si tiene múltiples proyectos)
  const [selectedPartnerForReport, setSelectedPartnerForReport] =
    useState(null); // Socio seleccionado para crear reporte (si tiene múltiples proyectos)

  // --- ESTADOS DE DATOS ---
  const [partners, setPartners] = useState([]); // Lista de socios (con proyectos anidados)
  const [profiles, setProfiles] = useState([]); // Lista de perfiles de usuario
  const [campaigns, setCampaigns] = useState([]); // Campañas activas generales

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Filtro de búsqueda por nombre/país

  // --- LÓGICA DE SEGURIDAD: MODO LECTURA ---
  /**
   * isReadOnly determina si el usuario actual puede realizar acciones destructivas 
   * o creativas (añadir socio, borrar usuario, etc). Basado en el rol de Supabase.
   */
  const [isReadOnly, setIsReadOnly] = useState(true);

  // --- ESTADOS DE GESTIÓN DE USUARIOS (MODAL) ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    partner_id: "", // Si se asigna, el usuario será de tipo PARTNER
  });

  // --- CONFIGURACIÓN GLOBAL DE TEMPORADA (ADMIN ONLY) ---
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  /** Temporada activa: solo valores que existen en BD (sin lista hardcodeada). */
  const [activeSeason, setActiveSeason] = useState("");
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [newSeasonName, setNewSeasonName] = useState("");
  /** Temporada origen para "Duplicar configuración" (campañas + Milkywire). */
  const [duplicateFromSeason, setDuplicateFromSeason] = useState("");
  const [duplicatingConfig, setDuplicatingConfig] = useState(false);
  const [settingsTab, setSettingsTab] = useState("campaigns"); // Sub-pestaña: "campaigns" | "milkywire"
  const [seasonCampaigns, setSeasonCampaigns] = useState([]); // Lista dinámica de campañas globals
  const [newCampaignTitle, setNewCampaignTitle] = useState("");
  const [newCampaignStartMonth, setNewCampaignStartMonth] = useState("Enero");
  const [newCampaignEndMonth, setNewCampaignEndMonth] = useState("Diciembre");
  const [seasonVideoMonths, setSeasonVideoMonths] = useState([]);
  const [isUpdatingVideoMonths, setIsUpdatingVideoMonths] = useState(false);
  const [milkywireSchedule, setMilkywireSchedule] = useState([]); // Cronograma generado para Milkywire
  const [isGeneratingMilky, setIsGeneratingMilky] = useState(false);
  /** Interruptor global: oculta Milkywire en parametrización, reportes e historial (localStorage). */
  const [milkywireFeatureEnabled, setMilkywireFeatureEnabled] = useState(
    readMilkywireFeatureEnabled,
  );
  const [clearingSeason, setClearingSeason] = useState(false);

  // Efecto inicial: Carga los datos maestros del dashboard
  useEffect(() => {
    fetchData();
  }, []);

  // Catálogo de temporadas (header + formularios): al montar
  useEffect(() => {
    loadAvailableSeasons();
  }, []);

  useEffect(() => subscribeMilkywireFeatureEnabled(setMilkywireFeatureEnabled), []);

  useEffect(() => {
    if (!milkywireFeatureEnabled && settingsTab === "milkywire") {
      setSettingsTab("campaigns");
    }
  }, [milkywireFeatureEnabled, settingsTab]);

  // Si activas Milkywire de nuevo con el modal abierto, recarga el cronograma.
  useEffect(() => {
    if (isSettingsModalOpen && activeSeason) {
      loadSeasonSettings(activeSeason);
    }
  }, [milkywireFeatureEnabled]);

  // Misma temporada sugerida en nuevos reportes (solo si es una temporada válida en BD).
  useEffect(() => {
    if (!activeSeason) return;
    try {
      localStorage.setItem("aa_supervision_active_season", activeSeason);
    } catch {
      /* ignore */
    }
  }, [activeSeason]);

  // Modal parametrización: recarga campañas/milkywire al abrir o al cambiar temporada activa
  useEffect(() => {
    if (isSettingsModalOpen) {
      loadAvailableSeasons();
      loadSeasonSettings(activeSeason);
    }
  }, [isSettingsModalOpen, activeSeason]);

  // Origen por defecto para duplicar: última temporada distinta a la activa
  useEffect(() => {
    if (!isSettingsModalOpen) return;
    const others = availableSeasons.filter((s) => s !== activeSeason);
    if (others.length === 0) {
      setDuplicateFromSeason("");
      return;
    }
    setDuplicateFromSeason((prev) =>
      prev && others.includes(prev) ? prev : others[others.length - 1],
    );
  }, [isSettingsModalOpen, activeSeason, availableSeasons]);

  /**
   * Temporadas = solo datos reales en Supabase:
   * reportes (historial), campañas globales, milkywire, y registro explícito (season_registry).
   * No se inventan años en el desplegable.
   */
  async function loadAvailableSeasons() {
    setSeasonsLoading(true);
    const bag = new Set();
    try {
      const [{ data: fromCamps }, { data: fromMilky }, { data: fromReports }] =
        await Promise.all([
          supabase.from("season_campaigns").select("season_name"),
          supabase.from("milkywire_schedules").select("season_name"),
          supabase.from("monthly_reports").select("season_name"),
        ]);

      (fromCamps || []).forEach((r) => r?.season_name && bag.add(r.season_name.trim()));
      (fromMilky || []).forEach((r) => r?.season_name && bag.add(r.season_name.trim()));
      (fromReports || []).forEach((r) => r?.season_name && bag.add(r.season_name.trim()));

      const regRes = await supabase.from("season_registry").select("season_name");
      if (!regRes.error && regRes.data) {
        regRes.data.forEach((r) => r?.season_name && bag.add(r.season_name.trim()));
      } else if (regRes.error) {
        console.warn("season_registry (opcional):", regRes.error.message);
      }
    } catch (e) {
      console.error("No se pudo cargar temporadas:", e);
    }

    const sorted = Array.from(bag).filter(Boolean).sort((a, b) => a.localeCompare(b));
    setAvailableSeasons(sorted);

    setActiveSeason((prev) => {
      if (sorted.length === 0) return "";
      let stored;
      try {
        stored = localStorage.getItem("aa_supervision_active_season");
      } catch {
        stored = null;
      }
      if (stored && sorted.includes(stored)) return stored;
      if (prev && sorted.includes(prev)) return prev;
      return sorted[sorted.length - 1];
    });
    setSeasonsLoading(false);
  }

  /**
   * Carga la configuración específica de una temporada (Campañas y Cronograma)
   * desde las tablas globales 'season_campaigns' y 'milkywire_schedules'.
   */
  async function loadSeasonSettings(season) {
    if (!season) return;
    // 1. Campañas Globales: Influyen en qué opciones ven los socios en sus reportes mensuales
    const { data: camps } = await supabase
      .from("season_campaigns")
      .select("*")
      .eq("season_name", season)
      .order("created_at", { ascending: true });
    setSeasonCampaigns(camps || []);

    if (!milkywireFeatureEnabled) {
      setMilkywireSchedule([]);
      return;
    }

    // 2. Cronograma Milkywire: Determina a quién le toca subir contenido este mes
    const { data: milky } = await supabase
      .from("milkywire_schedules")
      .select("*, partners(name)")
      .eq("season_name", season)
      .order("target_month");
    setMilkywireSchedule(milky || []);

    // 3. Meses de Video de la temporada (season_registry)
    const { data: reg } = await supabase
      .from("season_registry")
      .select("video_months")
      .eq("season_name", season)
      .single();
    if (reg?.video_months) {
      setSeasonVideoMonths(Array.isArray(reg.video_months) ? reg.video_months : []);
    } else {
      setSeasonVideoMonths(["Junio", "Octubre", "Marzo"]); // Default fallback
    }
  }

  /**
   * fetchData: El corazón del dashboard.
   * Realiza 3 cosas críticas:
   * 1. Autenticación y Autorización (RBAC).
   * 2. Obtención de datos maestros (Partners + Projects + Reports).
   * 3. Filtrado de seguridad (Garantiza que nadie vea proyectos que no le pertenecen).
   */
  async function fetchData() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let canEdit = false;
      let allowedProjectIds = []; // Buffer para IDs de proyectos permitidos
      let isAdmin = false;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // PASO 1: Determinar nivel de privilegio
        if (profile?.role === "admin") {
          canEdit = true;
          isAdmin = true;
        } else if (
          profile?.role === "editor" &&
          profile?.edit_supervision === true
        ) {
          canEdit = true;
        }

        // PASO 2: Si no es admin, buscamos explícitamente a qué proyectos tiene acceso
        // Esta tabla puente define la visibilidad granular.
        if (!isAdmin) {
          const { data: accessData } = await supabase
            .from("user_project_access")
            .select("project_id")
            .eq("user_id", user.id);

          allowedProjectIds = accessData
            ? accessData.map((a) => a.project_id)
            : [];
        }
      }
      setIsReadOnly(!canEdit);

      // PASO 3: Carga de Datos Estructurales
      // Nota técnica: Usamos consultas anidadas de Supabase para traer socios con sus proyectos 
      // y un conteo rápido de reportes en una sola llamada (optimización de red).
      const { data: partnersData } = await supabase
        .from("partners")
        .select(
          `
            *, 
            logo_url, 
            projects (
              *,
              monthly_reports (id, report_month, report_year, photo_count, season_name)
            )
          `,
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*, partners(name)");

      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title, status, partner_ids")
        .neq("status", "PUBLICADO");

      // PASO 4: Filtrado Dinámico de Seguridad
      // Si el usuario no es admin, "podamos" el árbol de datos para ocultar lo prohibido.
      let filteredPartnersData = partnersData || [];

      if (!isAdmin) {
        filteredPartnersData = filteredPartnersData
          .map((partner) => {
            // Solo mantenemos los proyectos permitidos para este usuario
            const visibleProjects = partner.projects.filter((proj) =>
              allowedProjectIds.includes(proj.id),
            );
            return { ...partner, projects: visibleProjects };
          })
          // Si un socio se quedó con 0 proyectos visibles, lo eliminamos de la vista por completo.
          .filter((partner) => partner.projects.length > 0);
      }

      setPartners(filteredPartnersData);
      setProfiles(profilesData || []);
      setCampaigns(campaignsData || []);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- HELPERS (Utilidades de Renderizado) ---

  /** Reportes mensuales de un paisaje filtrados por temporada (selector del header). */
  const monthlyReportsForSeason = (project, season) => {
    if (!season) return [];
    const reps = project?.monthly_reports;
    if (!Array.isArray(reps)) return [];
    return reps.filter((r) => (r.season_name || "").trim() === season.trim());
  };

  /**
   * Obtiene el email del usuario principal vinculado a un socio (Partner).
   */
  const getPartnerEmail = (partnerId) => {
    const linkedUser = profiles.find((p) => p.partner_id === partnerId);
    return linkedUser ? linkedUser.email : "Sin usuario asignado";
  };

  /**
   * Calcula estadísticas agregadas para un socio para mostrar en las tarjetas.
   * Campañas = módulo general de campañas (no filtrado por temporada).
   * Fotos y actividad = solo la temporada seleccionada en el header (evita mezclar 2025-26 con 2026-27).
   */
  const getPartnerStats = (partner, season) => {
    const activeCampaignsCount = campaigns.filter(
      (c) => Array.isArray(c.partner_ids) && c.partner_ids.includes(partner.id),
    ).length;

    let totalPhotos = 0;
    partner.projects?.forEach((proj) => {
      monthlyReportsForSeason(proj, season).forEach((rep) => {
        totalPhotos += parseInt(rep.photo_count || 0);
      });
    });

    const hasRecentActivity = partner.projects?.some(
      (p) => monthlyReportsForSeason(p, season).length > 0,
    );

    return {
      campaigns: activeCampaignsCount,
      photos: totalPhotos,
      status: hasRecentActivity ? "Activo" : "Sin reportes",
      statusColor: hasRecentActivity
        ? "text-emerald-500 bg-emerald-50"
        : "text-orange-500 bg-orange-50",
    };
  };

  /**
   * Elimina datos operativos de una temporada sin borrar el registro en season_registry
   * ni socios/paisajes. Útil para una temporada nueva que quedó con datos duplicados o de prueba.
   */
  async function handleClearSeasonData() {
    if (isReadOnly || !activeSeason || clearingSeason) return;
    const s = activeSeason.trim();
    if (
      !confirm(
        `¿Vaciar por completo la temporada ${s}?\n\n` +
          "Se eliminarán:\n" +
          "• Todos los reportes mensuales guardados con esa temporada\n" +
          "• Campañas globales de parametrización (season_campaigns)\n" +
          "• Cronograma Milkywire de esa temporada\n\n" +
          "No se borra el registro de la temporada (sigue en la lista), ni socios ni paisajes.",
      )
    )
      return;

    setClearingSeason(true);
    try {
      const { error: eRep } = await supabase
        .from("monthly_reports")
        .delete()
        .eq("season_name", s);
      if (eRep) throw eRep;

      const { error: eCamp } = await supabase
        .from("season_campaigns")
        .delete()
        .eq("season_name", s);
      if (eCamp) throw eCamp;

      const { error: eMilk } = await supabase
        .from("milkywire_schedules")
        .delete()
        .eq("season_name", s);
      if (eMilk) throw eMilk;

      await fetchData();
      await loadAvailableSeasons();
      if (isSettingsModalOpen) await loadSeasonSettings(s);
      alert(`Temporada ${s} vaciada.`);
    } catch (e) {
      alert(e?.message || "No se pudo vaciar la temporada.");
    } finally {
      setClearingSeason(false);
    }
  }

  // --- GESTIÓN DE DATOS (ACCIONES PROTEGIDAS) ---

  /**
   * softDeletePartner: "Elimina" un socio cambiando su estado a inactivo (is_active: false).
   * No borra datos físicos de la DB para preservar integridad de reportes históricos.
   */
  async function softDeletePartner(id, name) {
    if (isReadOnly) return; // BLOQUEO DE SEGURIDAD UI
    if (confirm(`¿Estás seguro de eliminar a "${name}"?`)) {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: false })
        .eq("id", id);
      if (error) alert(error.message);
      else fetchData();
    }
  }

  /**
   * Actualiza el estado operativo de un paisaje/proyecto.
   * Estados sugeridos para operación: ACTIVO, PAUSADO, CERRADO.
   */
  async function updateProjectStatus(projectId, targetStatus) {
    if (isReadOnly) return;
    const { error } = await supabase
      .from("projects")
      .update({ status: targetStatus })
      .eq("id", projectId);
    if (error) {
      alert(error.message);
      return;
    }
    fetchData();
  }

  const normalizeProjectStatus = (status) => (status || "ACTIVO").toUpperCase();

  const getProjectStatusPill = (status) => {
    const s = normalizeProjectStatus(status);
    if (s === "CERRADO") return "bg-gray-200 text-gray-600";
    if (s === "PAUSADO") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  /**
   * handleCreateUser: Registra un nuevo acceso en Supabase Auth y crea el perfil en 'profiles'.
   * Diferencia automáticamente entre ADMIN y PARTNER según si se elige organización.
   */
  const handleCreateUser = async () => {
    if (isReadOnly) return;
    if (!newUser.email || !newUser.password) return;

    // 1. Registro en el sistema de autenticación de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    // 2. Creación del perfil con metadatos de rol y asociación al socio
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          email: newUser.email,
          role: newUser.partner_id ? "PARTNER" : "ADMIN",
          partner_id: newUser.partner_id || null,
        },
      ]);
      if (profileError) alert(profileError.message);
      else {
        alert("✅ Usuario creado satisfactoriamente.");
        setIsUserModalOpen(false);
        setNewUser({ email: "", password: "", partner_id: "" });
        fetchData();
      }
    }
  };

  /**
   * Borra un perfil de usuario (No borra el email de Auth, solo el acceso al dashboard).
   */
  const handleDeleteUser = async (id) => {
    if (isReadOnly) return;
    if (confirm("¿Borrar acceso?")) {
      await supabase.from("profiles").delete().eq("id", id);
      fetchData();
    }
  };

  // --- LÓGICA DE CONFIGURACIÓN GLOBAL (PARAMETRIZACIÓN ADMIN) ---

  /**
   * Añade una campaña global (Ej: 'Vuelo de Campaña 2026').
   * Estas campañas se vuelven metadatos obligatorios u opcionales en los reportes de los socios.
   */
  const handleAddSeasonCampaign = async () => {
    if (!newCampaignTitle.trim()) return;
    const { error } = await supabase.from("season_campaigns").insert([{
      season_name: activeSeason,
      title: newCampaignTitle.trim(),
      start_month: newCampaignStartMonth,
      end_month: newCampaignEndMonth
    }]);
    if (error) alert(error.message);
    else {
      setNewCampaignTitle("");
      loadSeasonSettings(activeSeason);
    }
  };

  /**
   * handleUpdateVideoMonth: Toggle un mes en la lista de meses de video globales.
   */
  const handleToggleVideoMonth = async (month) => {
    if (isUpdatingVideoMonths) return;
    setIsUpdatingVideoMonths(true);
    try {
      let updated;
      if (seasonVideoMonths.includes(month)) {
        updated = seasonVideoMonths.filter(m => m !== month);
      } else {
        updated = [...seasonVideoMonths, month];
      }
      
      const { error } = await supabase
        .from("season_registry")
        .update({ video_months: updated })
        .eq("season_name", activeSeason);
        
      if (error) throw error;
      setSeasonVideoMonths(updated);
    } catch (err) {
      alert("Error actualizando meses de video: " + err.message);
    } finally {
      setIsUpdatingVideoMonths(false);
    }
  };

  /**
   * Elimina una campaña global.
   */
  const handleDeleteSeasonCampaign = async (id) => {
    if (confirm("¿Eliminar campaña global?")) {
      const { error } = await supabase.from("season_campaigns").delete().eq("id", id);
      if (error) alert(error.message);
      else loadSeasonSettings(activeSeason);
    }
  };

  /**
   * Copia campañas globales y cronograma Milkywire de una temporada a otra.
   * No modifica monthly_reports (histórico de socios permanece intacto).
   */
  const handleDuplicateSeasonConfig = async () => {
    const fromSeason = duplicateFromSeason;
    const toSeason = activeSeason;
    if (!fromSeason || fromSeason === toSeason) {
      alert("Elige una temporada origen distinta a la que estás editando.");
      return;
    }
    const copyMilky = milkywireFeatureEnabled;
    if (
      !confirm(
        `¿Copiar configuración de ${fromSeason} → ${toSeason}?\n\n` +
          (copyMilky
            ? "Se reemplazarán las campañas globales y el cronograma Milkywire de la temporada destino. "
            : "Se reemplazarán solo las campañas globales de la temporada destino (Milkywire desactivado en el panel). ") +
          "Los reportes mensuales guardados no se modifican.",
      )
    )
      return;
    setDuplicatingConfig(true);
    try {
      await supabase.from("season_campaigns").delete().eq("season_name", toSeason);
      const { data: camps, error: errCamps } = await supabase
        .from("season_campaigns")
        .select("*")
        .eq("season_name", fromSeason);
      if (errCamps) throw errCamps;
      if (camps?.length) {
        const rows = camps.map(({ id: _id, ...rest }) => ({
          ...rest,
          season_name: toSeason,
        }));
        const { error: insC } = await supabase.from("season_campaigns").insert(rows);
        if (insC) throw insC;
      }

      if (copyMilky) {
        await supabase.from("milkywire_schedules").delete().eq("season_name", toSeason);
        const { data: milky, error: errM } = await supabase
          .from("milkywire_schedules")
          .select("*")
          .eq("season_name", fromSeason);
        if (errM) throw errM;
        if (milky?.length) {
          const rows = milky.map(({ id: _id, ...rest }) => ({
            ...rest,
            season_name: toSeason,
          }));
          const { error: insM } = await supabase.from("milkywire_schedules").insert(rows);
          if (insM) throw insM;
        }
      }

      await loadSeasonSettings(toSeason);
      alert("✅ Configuración duplicada en la temporada destino.");
    } catch (e) {
      alert(e?.message || "Error al duplicar.");
    } finally {
      setDuplicatingConfig(false);
    }
  };

  /**
   * Crea una nueva temporada a nivel de configuración.
   * Nota: no borra ni sobreescribe históricos; solo habilita la temporada para parametrizarla.
   */
  const handleCreateSeason = async () => {
    const season = newSeasonName.trim();
    if (!season) return;
    if (!/^\d{4}-\d{4}$/.test(season)) {
      alert("Formato inválido. Usa AAAA-AAAA (ej: 2026-2027).");
      return;
    }
    if (availableSeasons.includes(season)) {
      setActiveSeason(season);
      setNewSeasonName("");
      return;
    }
    const { error } = await supabase.from("season_registry").insert({ season_name: season });
    if (error) {
      if (error.code === "42P01" || error.message?.includes("season_registry")) {
        alert(
          "Falta aplicar la migración en Supabase (tabla season_registry). Revisa el archivo supabase/migrations/20260406120000_season_registry.sql o ejecuta el SQL en el dashboard.",
        );
      } else {
        alert(error.message);
      }
      return;
    }
    await loadAvailableSeasons();
    setActiveSeason(season);
    setNewSeasonName("");
  };

  /**
   * handleGenerateMilkywire: ALGORITMO DE DISTRIBUCIÓN EQUITATIVA ("CHOCOLETAREO")
   * ----------------------------------------------------------------------------
   * Propósito: Distribuir a todos los socios activos en los 12 meses del año, 
   * garantizando que haya exactamente 3 socios por mes (36 slots anuales) para Milkywire.
   * 
   * Mecánica:
   * 1. Limpia cualquier cronograma previo para la temporada.
   * 2. Crea un 'pool' circular con los socios actuales.
   * 3. Aplica Shuffle (Mezcla aleatoria Fisher-Yates).
   * 4. Asigna 3 a cada mes, validando que un socio no se repita en el mismo mes.
   */
  const handleGenerateMilkywire = async () => {
    if (!milkywireFeatureEnabled) return;
    if (!confirm("Se generará un nuevo cronograma equitativo (3 cupos x mes). ¿Continuar?")) return;

    setIsGeneratingMilky(true);
    try {
      // 1. Reset de la temporada
      await supabase.from("milkywire_schedules").delete().eq("season_name", activeSeason);

      // 2. Obtención de participantes
      const { data: activePartners } = await supabase.from("partners").select("id").eq("is_active", true);
      if (!activePartners || activePartners.length === 0) throw new Error("No hay socios activos.");

      const pIds = activePartners.map(p => p.id);
      const targetMonths = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];

      // Creamos pool: Si hay 15 socios, los repetimos hasta cubrir los 36 espacios (3 x mes)
      let pool = [];
      while (pool.length < 36) {
        pool = pool.concat(pIds);
      }
      pool = pool.slice(0, 36);

      // MIX: Fisher-Yates para asegurar aleatoriedad real
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // 3. Distribución mensual
      const newSchedules = [];
      let poolIndex = 0;

      for (const month of targetMonths) {
        let assignedInThisMonth = new Set();
        let tries = 0;

        while (assignedInThisMonth.size < 3) {
          if (tries > 50) break; // Guardrail contra loops infinitos

          let candidate = pool[poolIndex % pool.length];

          // Validación de unicidad mensual
          if (!assignedInThisMonth.has(candidate)) {
            assignedInThisMonth.add(candidate);
            newSchedules.push({
              season_name: activeSeason,
              target_month: month,
              partner_id: candidate
            });
            pool.splice(poolIndex % pool.length, 1); // Removemos del pool para que rote la lista
          } else {
            poolIndex++;
          }
          tries++;
        }
      }

      // 4. Persistencia en Supabase
      const { error: insErr } = await supabase.from("milkywire_schedules").insert(newSchedules);
      if (insErr) throw insErr;

      loadSeasonSettings(activeSeason);
      alert("Cronograma generado exitosamente.");

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsGeneratingMilky(false);
    }
  };

  const filteredPartners = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.country.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Total partners ahora refleja solo lo visible
  const totalPartners = partners.length;
  const totalProjects = partners.reduce(
    (acc, p) => acc + (p.projects?.length || 0),
    0,
  );

  // --- RENDERIZADO DEL DASHBOARD ---
  return (
    <div className="h-screen flex flex-col bg-gray-50/30 overflow-hidden font-sans">
      {/* 
          BARRA DE NAVEGACIÓN SUPERIOR (HEADER)
          Contiene el título dinámico y las acciones rápidas (Configuración, Reportes, Creación).
      */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end bg-white/80 backdrop-blur-sm border-b border-gray-100 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none flex items-center gap-3">
            <Eye className="text-brand" size={24} md:size={32} /> Supervision
          </h1>
          <p className="text-brand font-bold text-lg mt-1 italic flex items-center gap-2">
            Control de socios y paisajes.
            {/* Indicador visual de seguridad: Informa al editor si no tiene permisos de escritura */}
            {isReadOnly && (
              <span className="ml-2 bg-gray-200 text-gray-500 px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                <Lock size={10} /> SOLO LECTURA
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          {/* Temporada en contexto: solo temporadas que existen en datos reales (reportes / config / registro). */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-brand shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Temporada
              </span>
              {seasonsLoading ? (
                <span className="text-[10px] font-bold text-gray-400 italic">Cargando…</span>
              ) : availableSeasons.length === 0 ? (
                <span className="text-[10px] font-bold text-amber-600 max-w-[200px] leading-tight" title="Aún no hay season_name en reportes ni parametrización">
                  Sin temporadas en BD
                </span>
              ) : (
                <select
                  value={activeSeason || availableSeasons[0]}
                  onChange={(e) => setActiveSeason(e.target.value)}
                  className="bg-transparent text-xs font-black text-gray-900 uppercase outline-none cursor-pointer max-w-[148px] sm:max-w-[200px] truncate"
                  title="Solo aparecen años que ya existen en reportes o configuración"
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              )}
              {availableSeasons.length > 0 && activeSeason && (
                <p className="text-[8px] text-gray-400 font-bold leading-tight mt-1 max-w-[220px]">
                  Métricas de tarjetas (fotos / estado) solo para esta temporada.
                </p>
              )}
            </div>
          </div>

          {!isReadOnly && availableSeasons.length > 0 && activeSeason && (
            <button
              type="button"
              onClick={handleClearSeasonData}
              disabled={clearingSeason || seasonsLoading}
              className="flex items-center gap-2 bg-white border border-amber-200 text-amber-800 px-4 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Borra reportes y parametrización de esta temporada; no borra el alta de la temporada ni socios."
            >
              <Eraser size={14} className="shrink-0" />
              {clearingSeason ? "Vaciando…" : "Vaciar temporada"}
            </button>
          )}

          {/* Milkywire: activar / ocultar en toda la supervisión (persistente en este navegador) */}
          <div
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm"
            title="Desactiva donante Milkywire: no aparece en parametrización, reportes mensuales ni historial. Puedes volver a activarlo cuando quieras."
          >
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Milkywire
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={milkywireFeatureEnabled}
              onClick={() => {
                const next = !milkywireFeatureEnabled;
                writeMilkywireFeatureEnabled(next);
                setMilkywireFeatureEnabled(next);
              }}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                milkywireFeatureEnabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  milkywireFeatureEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-[9px] font-black uppercase max-w-[72px] leading-tight ${
                milkywireFeatureEnabled ? "text-emerald-700" : "text-gray-400"
              }`}
            >
              {milkywireFeatureEnabled ? "Visible" : "Oculto"}
            </span>
          </div>

          {/* Switch de Pestañas: Socios vs Usuarios */}
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab("partners")}
              className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "partners" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Briefcase size={14} /> Socios
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "users" ? "bg-white text-brand shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Users size={14} /> Usuarios
            </button>
          </div>

          {/* ACCIÓN: Parametrización (Solo visible si es Admin/Editor con permiso) */}
          {!isReadOnly && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-black hover:border-brand hover:text-brand transition-all flex items-center gap-2 text-xs uppercase tracking-[0.1em] shadow-sm ml-2"
            >
              <Settings size={16} /> Config. Temporada
            </button>
          )}

          <button
            onClick={() => navigate("/global-report")}
            className="bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-black hover:border-brand hover:text-brand transition-all flex items-center gap-2 text-xs uppercase tracking-[0.1em] shadow-sm"
          >
            <BarChart3 size={16} /> Reporte Global
          </button>

          {/* BOTONES DE CREACIÓN: Se adaptan según la pestaña activa */}
          {!isReadOnly &&
            (activeTab === "partners" ? (
              <button
                onClick={() => navigate("/new-partner")}
                className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs uppercase tracking-[0.2em]"
              >
                <Plus size={16} /> Nuevo Socio
              </button>
            ) : (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs uppercase tracking-[0.2em]"
              >
                <UserPlus size={16} /> Nuevo Usuario
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* --- VISTA SOCIOS --- */}
          {activeTab === "partners" && (
            <>
              {/* Contadores */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white px-6 md:px-8 py-4 md:py-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 flex-1">
                  <div className="bg-brand/10 p-3 rounded-2xl text-brand">
                    <Users size={24} />
                  </div>
                  <div>
                    <strong className="text-gray-900 text-2xl md:text-3xl font-black block tracking-tighter">
                      {totalPartners}
                    </strong>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Socios Visibles
                    </span>
                  </div>
                </div>
                <div className="bg-white px-6 md:px-8 py-4 md:py-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 flex-1">
                  <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <strong className="text-gray-900 text-2xl md:text-3xl font-black block tracking-tighter">
                      {totalProjects}
                    </strong>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Paisajes Asignados
                    </span>
                  </div>
                </div>
              </div>

              {/* Búsqueda */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar organización o país..."
                  className="w-full pl-14 pr-4 py-5 bg-white border-2 border-transparent focus:border-brand rounded-2xl text-sm font-bold outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Grid Tarjetas */}
              {loading ? (
                <div className="text-center py-20">
                  <div className="text-brand font-black text-xs uppercase tracking-widest animate-pulse">
                    Cargando...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {filteredPartners.map((partner) => {
                    const dynamicEmail = getPartnerEmail(partner.id);
                    const hasUser = dynamicEmail.includes("@");
                    const stats = getPartnerStats(partner, activeSeason);

                    return (
                      <div
                        key={partner.id}
                        className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col hover:shadow-xl hover:border-brand/20 transition-all duration-300 overflow-hidden group"
                      >
                        {/* Header Tarjeta */}
                        <div className="p-8 flex justify-between items-start bg-gray-50/50 relative">
                          <div className="flex gap-5 items-center z-10">
                            <div className="w-16 h-16 rounded-2xl shadow-md overflow-hidden flex items-center justify-center bg-white border border-gray-100 p-1">
                              {partner.logo_url ? (
                                <img
                                  src={partner.logo_url}
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              ) : (
                                <Users size={24} className="text-gray-300" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                                {partner.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${hasUser ? "bg-emerald-500" : "bg-orange-300"}`}
                                  ></span>
                                  <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wide max-w-[150px] truncate">
                                    {dynamicEmail}
                                  </span>
                                </div>
                                <span
                                  title="Actividad según la temporada seleccionada arriba"
                                  className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${stats.statusColor}`}
                                >
                                  {stats.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BOTONES EDICIÓN SOCIO: OCULTOS SI ES READONLY */}
                          {!isReadOnly && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={() =>
                                  navigate(`/edit-partner/${partner.id}`)
                                }
                                className="text-gray-400 hover:text-brand p-2 hover:bg-white rounded-xl transition-all"
                                title="Editar Info Socio"
                              >
                                <Settings size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  softDeletePartner(partner.id, partner.name)
                                }
                                className="text-gray-400 hover:text-red-500 p-2 hover:bg-white rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stats Resumen */}
                        <div className="px-6 md:px-8 py-4 border-b border-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:divide-x divide-gray-100 bg-white">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1">
                              <Megaphone size={10} /> Campañas
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.campaigns}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1">
                              <MapPin size={10} /> Paisajes
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {partner.projects?.length || 0}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span
                              title="Suma de fotos en reportes de la temporada seleccionada"
                              className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1"
                            >
                              <ImageIcon size={10} /> Contenido
                            </span>
                            <span className="text-lg font-black text-gray-900">
                              {stats.photos}{" "}
                              <span className="text-[8px] text-gray-400 font-bold">
                                FOTOS
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Lista Paisajes */}
                        <div className="p-8 flex-1 bg-white">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Paisajes Asignados
                            </h4>
                            {/* BOTÓN +AGREGAR PAISAJE: OCULTO SI ES READONLY */}
                            {!isReadOnly && (
                              <button
                                onClick={() =>
                                  navigate(`/new-project/${partner.id}`)
                                }
                                className="text-[9px] font-bold text-brand hover:underline uppercase"
                              >
                                + Agregar
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {partner.projects?.map((project) => (
                              <div
                                key={project.id}
                                className={`flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand/30 transition-all cursor-pointer group/item`}
                                // --- LÓGICA DE CLIC BLINDADA ---
                                onClick={() => {
                                  if (isReadOnly) {
                                    navigate(
                                      `/supervision/historial/${project.id}`,
                                    );
                                  } else {
                                    navigate(
                                      `/supervision/nuevo-reporte/${project.id}`,
                                    );
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-white rounded-lg text-gray-300 group-hover/item:text-brand transition-colors">
                                    <MapPin size={14} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700 uppercase">
                                      {project.name}
                                    </span>
                                    <span
                                      className={`text-[8px] font-black uppercase w-fit mt-1 px-1.5 py-0.5 rounded ${getProjectStatusPill(project.status)}`}
                                    >
                                      {normalizeProjectStatus(project.status)}
                                    </span>
                                  </div>
                                </div>

                                {/* BOTÓN SETTINGS PAISAJE: OCULTO SI ES READONLY */}
                                <div className="flex items-center gap-1">
                                  {!isReadOnly && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateProjectStatus(project.id, "PAUSADO");
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-amber-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                        title="Pausar paisaje"
                                      >
                                        <PauseCircle size={14} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateProjectStatus(project.id, "ACTIVO");
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                        title="Reactivar paisaje"
                                      >
                                        <PlayCircle size={14} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateProjectStatus(project.id, "CERRADO");
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-white rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                        title="Cerrar proyecto"
                                      >
                                        <CheckCircle2 size={14} />
                                      </button>
                                    </>
                                  )}
                                  {!isReadOnly && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/edit-project/${project.id}`);
                                      }}
                                      className="p-1.5 text-gray-300 hover:text-brand hover:bg-white rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                      title="Configurar Paisaje"
                                    >
                                      <Settings size={14} />
                                    </button>
                                  )}
                                  {!isReadOnly && normalizeProjectStatus(project.status) === "CERRADO" && (
                                    <span className="text-[8px] font-black text-gray-400 uppercase px-1">
                                      Finalizado
                                    </span>
                                  )}
                                  <ChevronRight
                                    size={14}
                                    className="text-gray-300 group-hover/item:text-brand"
                                  />
                                </div>
                              </div>
                            ))}
                            {partner.projects?.length === 0 && (
                              <p className="text-[10px] text-gray-300 italic">
                                No hay paisajes registrados.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Footer Acciones */}
                        <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                if (partner.projects?.length === 1)
                                  navigate(
                                    `/supervision/historial/${partner.projects[0].id}`,
                                  );
                                else if (partner.projects?.length > 1)
                                  setSelectedPartnerForHistory(partner);
                                else alert("Este socio aún no tiene paisajes.");
                              }}
                              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-black hover:border-brand hover:text-brand transition-all text-[9px] tracking-[0.1em] uppercase shadow-sm"
                            >
                              <FileText size={14} /> Historial
                            </button>

                            {/* BOTÓN NUEVO REPORTE: VISIBLE SOLO PARA EDITOR/ADMIN */}
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  if (partner.projects?.length === 1)
                                    navigate(
                                      `/supervision/nuevo-reporte/${partner.projects[0].id}`,
                                    );
                                  else if (partner.projects?.length > 1)
                                    setSelectedPartnerForReport(partner);
                                  else alert("Añade un paisaje primero.");
                                }}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white font-black hover:bg-black transition-all text-[9px] tracking-[0.1em] uppercase shadow-md"
                              >
                                <Plus size={14} /> Nuevo Reporte
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* --- VISTA USUARIOS (TABLA BLINDADA) --- */}
          {activeTab === "users" && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Usuario / Email
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Rol Asignado
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Organización Asignada
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {profiles.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                              {user.email.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-gray-700">
                              {user.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${user.role === "ADMIN" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          {user.partners ? (
                            <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                              <Shield size={14} className="text-brand" />{" "}
                              {user.partners.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic font-medium">
                              Global (Acción Andina)
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {/* BOTÓN BORRAR USUARIO: OCULTO SI ES READONLY */}
                          {!isReadOnly && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALES DE SELECCIÓN Y USUARIOS --- */}
      {/* ... (Se mantienen iguales, pero con la lógica de isReadOnly aplicada en los botones) ... */}

      {/* SELECCIÓN PARA REPORTE */}
      {selectedPartnerForReport && !isReadOnly && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Seleccionar Paisaje
            </h2>
            <div className="space-y-3">
              {selectedPartnerForReport.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/supervision/nuevo-reporte/${project.id}`);
                    setSelectedPartnerForReport(null);
                  }}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-50 hover:border-brand hover:bg-brand/5 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-black text-gray-800 group-hover:text-brand uppercase text-sm">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {project.landscape}
                    </p>
                  </div>
                  <Plus
                    size={16}
                    className="text-gray-300 group-hover:text-brand"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPartnerForReport(null)}
              className="w-full mt-6 py-3 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* SELECCIÓN PARA HISTORIAL */}
      {selectedPartnerForHistory && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Ver Historial
            </h2>
            <div className="space-y-3">
              {selectedPartnerForHistory.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/supervision/historial/${project.id}`);
                    setSelectedPartnerForHistory(null);
                  }}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-50 hover:border-brand hover:bg-brand/5 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-black text-gray-800 group-hover:text-brand uppercase text-sm">
                      {project.name}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-300 group-hover:text-brand"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPartnerForHistory(null)}
              className="w-full mt-6 py-3 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {isUserModalOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase">
                Nuevo Usuario
              </h3>
              <button onClick={() => setIsUserModalOpen(false)}>
                <X className="text-gray-400 hover:text-gray-900" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Correo
                </label>
                <input
                  type="email"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border focus:border-brand"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Contraseña
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border focus:border-brand"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Organización
                </label>
                <select
                  className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none border focus:border-brand uppercase"
                  value={newUser.partner_id}
                  onChange={(e) =>
                    setNewUser({ ...newUser, partner_id: e.target.value })
                  }
                >
                  <option value="">-- Admin (Staff) --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateUser}
                className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black mt-2"
              >
                Crear Acceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIG GLOBALES TEMPORADA --- */}
      {isSettingsModalOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 p-5 sm:p-6 md:px-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-brand/10 rounded-xl sm:rounded-2xl text-brand">
                  <Settings size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-gray-900 uppercase tracking-tight leading-tight">Parametrización</h2>
                  <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ajustes globales de la temporada</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 text-gray-400 hover:text-red-500 transition-all">
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 flex flex-col md:flex-row gap-6 sm:gap-8">
              {/* Col Izq: Navegacion e inputs base */}
              <div className="md:w-1/3 shrink-0 flex flex-col gap-4 sm:gap-6">
                <div>
                  <label className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Temporada:</label>
                  <select
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 font-black shadow-sm outline-none focus:border-brand cursor-pointer uppercase text-xs sm:text-sm"
                    value={activeSeason}
                    onChange={(e) => setActiveSeason(e.target.value)}
                  >
                    {availableSeasons.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                    Nueva temporada
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      placeholder="2026-2027"
                      className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold text-xs outline-none focus:border-brand"
                    />
                    <button
                      onClick={handleCreateSeason}
                      type="button"
                      className="bg-brand text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-colors"
                    >
                      Crear
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium mt-1.5 leading-snug">
                    Tras crear, queda seleccionada arriba y en esta pantalla. El histórico de reportes no se borra.
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-4 space-y-3">
                  <p className="text-[10px] font-black text-brand uppercase tracking-widest">
                    Duplicar configuración
                  </p>
                  <p className="text-[9px] text-gray-500 leading-relaxed">
                    Copia{" "}
                    {milkywireFeatureEnabled
                      ? "campañas globales y cronograma Milkywire"
                      : "solo las campañas globales (Milkywire oculto en el panel)"}{" "}
                    desde otra temporada hacia <strong>{activeSeason}</strong>. Los reportes mensuales
                    (historial) no se modifican.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      Origen
                    </label>
                    <select
                      className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 font-bold text-xs outline-none focus:border-brand uppercase"
                      value={duplicateFromSeason}
                      onChange={(e) => setDuplicateFromSeason(e.target.value)}
                    >
                      {availableSeasons.filter((s) => s !== activeSeason).length === 0 ? (
                        <option value="">No hay otra temporada</option>
                      ) : (
                        availableSeasons
                          .filter((s) => s !== activeSeason)
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleDuplicateSeasonConfig}
                    disabled={
                      duplicatingConfig ||
                      !duplicateFromSeason ||
                      duplicateFromSeason === activeSeason
                    }
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy size={14} />
                    {duplicatingConfig ? "Copiando…" : `Copiar hacia ${activeSeason}`}
                  </button>
                </div>

                <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  <button
                    onClick={() => setSettingsTab("campaigns")}
                    className={`flex-1 md:flex-none p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left uppercase text-[9px] sm:text-xs font-black tracking-widest transition-all flex items-center gap-2 sm:gap-3 whitespace-nowrap ${settingsTab === "campaigns" ? "border-brand bg-brand/5 text-brand" : "border-gray-50 bg-gray-50 text-gray-400 hover:text-gray-600 hover:border-gray-200"}`}
                  >
                    <Megaphone size={16} className="shrink-0" /> Campañas
                  </button>
                  {milkywireFeatureEnabled && (
                    <button
                      type="button"
                      onClick={() => setSettingsTab("milkywire")}
                      className={`flex-1 md:flex-none p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left uppercase text-[9px] sm:text-xs font-black tracking-widest transition-all flex items-center gap-2 sm:gap-3 whitespace-nowrap ${settingsTab === "milkywire" ? "border-brand bg-brand/5 text-brand" : "border-gray-50 bg-gray-50 text-gray-400 hover:text-gray-600 hover:border-gray-200"}`}
                    >
                      <MapPin size={16} className="shrink-0" /> Milkywire
                    </button>
                  )}
                </div>
                {!milkywireFeatureEnabled && (
                  <p className="text-[9px] text-amber-700 font-bold leading-snug bg-amber-50 border border-amber-100 rounded-xl p-3">
                    Milkywire está desactivado en el encabezado de Supervisión. Actívalo ahí para
                    gestionar el cronograma o duplicarlo entre temporadas.
                  </p>
                )}
              </div>

              {/* Col Der: Configuración */}
              <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-inner relative overflow-y-auto">
                {settingsTab === "campaigns" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase">Campañas Habilitadas</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Éstas campañas aparecerán en los formularios de los socios como checkboxes para reportar su avance.</p>
                      </div>
                      <span className="bg-brand text-white px-3 py-1 rounded-full text-[10px] font-black">{seasonCampaigns.length}</span>
                    </div>

                    <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl space-y-4 border border-gray-100">
                      <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-2">Añadir Nueva Campaña</p>
                      <input type="text" placeholder="Nombre de la Campaña (Ej: Día del Arbol)..." value={newCampaignTitle} onChange={(e) => setNewCampaignTitle(e.target.value)} className="w-full bg-white border-none rounded-xl p-4 font-bold text-sm outline-none shadow-sm" />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mes Inicio</label>
                          <select 
                            className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold shadow-sm"
                            value={newCampaignStartMonth}
                            onChange={(e) => setNewCampaignStartMonth(e.target.value)}
                          >
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mes Límite</label>
                          <select 
                            className="w-full bg-white border-none rounded-xl p-3 text-xs font-bold shadow-sm"
                            value={newCampaignEndMonth}
                            onChange={(e) => setNewCampaignEndMonth(e.target.value)}
                          >
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <button onClick={handleAddSeasonCampaign} className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all shadow-md mt-2">Crear Campaña</button>
                    </div>

                    <div className="space-y-2 mt-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Campañas Registradas</p>
                      {seasonCampaigns.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50 rounded-2xl border border-dashed border-gray-200">No hay campañas para {activeSeason}</div>
                      ) : (
                        seasonCampaigns.map(camp => (
                          <div key={camp.id} className="flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:border-brand/30 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand"></div> {camp.title}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 pl-4">
                                {camp.start_month} → {camp.end_month || "Sin límite"}
                              </span>
                            </div>
                            <button onClick={() => handleDeleteSeasonCampaign(camp.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* SECCIÓN VIDEOS GLOBALES */}
                    <div className="pt-8 mt-8 border-t border-gray-100 space-y-6">
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase">Videos de Temporada (Global)</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Selecciona los meses en los que TODOS los socios deben subir video.</p>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(mes => (
                          <button
                            key={mes}
                            onClick={() => handleToggleVideoMonth(mes)}
                            className={`p-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${seasonVideoMonths.includes(mes) ? "bg-brand/10 border-brand text-brand" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300"}`}
                          >
                            {mes}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {milkywireFeatureEnabled && settingsTab === "milkywire" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-100 pb-4 gap-4">
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase group flex items-center gap-2"><span className="animate-spin-slow">🌟</span> Sistema Milkywire</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 leading-relaxed">3 Videos exigidos x Mes.<br />Se distribuirán mágicamente ("chocolateo") a los socios de la red para cumplir la cuota del equipo completo en Supabase.</p>
                      </div>
                      <button onClick={handleGenerateMilkywire} disabled={isGeneratingMilky} className={`shrink-0 bg-gray-900 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-colors flex items-center gap-2 ${isGeneratingMilky ? "opacity-50 cursor-wait" : ""}`}>
                        {isGeneratingMilky ? "Distribuyendo..." : "Chocolatear Socios"}
                      </button>
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                      {milkywireSchedule.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50 rounded-2xl border border-dashed border-gray-200">No hay distribución generada para {activeSeason}. ¡Haz clic arriba!</div>
                      ) : (
                        ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(mes => {
                          const sociosMes = milkywireSchedule.filter(m => m.target_month === mes);
                          if (sociosMes.length === 0) return null;
                          return (
                            <div key={mes} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 border-b border-gray-200 pb-1 w-full">{mes}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {sociosMes.map((socio, idx) => (
                                  <div key={idx} className="bg-white px-3 py-2 rounded-xl text-[9px] font-black uppercase text-emerald-700 border border-emerald-100 flex items-center gap-2 truncate shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> {socio.partners?.name || "Eliminado"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
