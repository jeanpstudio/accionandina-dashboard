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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
