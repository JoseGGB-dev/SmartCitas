import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | undefined;

function getSupabaseClient() {
  if (client) return client;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Revisa tu archivo .env.local o las variables de Railway.",
    );
  }

  client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

/**
 * Cliente diferido para no exigir variables de Supabase durante el renderizado
 * del servidor de las páginas públicas. La configuración se valida al usarlo.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    const value = Reflect.get(getSupabaseClient(), property);
    return typeof value === "function" ? value.bind(getSupabaseClient()) : value;
  },
});
