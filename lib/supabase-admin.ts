import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL no está configurada. " +
      "Agrega la variable de entorno en Vercel (Project Settings > Environment Variables) " +
      "o en .env.local para desarrollo local.",
  );
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no está configurada. " +
      "Agrega la variable de entorno en Vercel (Project Settings > Environment Variables) " +
      "o en .env.local para desarrollo local.",
  );
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
