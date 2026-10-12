// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL no está configurada. " +
      "Agrega la variable de entorno en Vercel (Project Settings > Environment Variables) " +
      "o en .env.local para desarrollo local.",
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada. " +
      "Agrega la variable de entorno en Vercel (Project Settings > Environment Variables) " +
      "o en .env.local para desarrollo local.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "pos-auth",
  },
});
