/**
 * INFRAESTRUCTURA: Supabase Client SDK
 * ------------------------------------
 * Instancia centralizada de conexión para el ecosistema de base de datos y Storage.
 * 
 * CONFIGURACIÓN:
 * - Sincronizado vía variables de entorno (VITE_) para permitir despliegues multi-entorno.
 * - Expone el cliente singleton para operaciones CRUD, Storage y Real-time.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Atencion: Faltan las variables de entorno de Supabase. La conexion fallara en ejecucion.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
