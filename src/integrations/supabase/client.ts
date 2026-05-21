import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Supabase is optional - frontend connects to backend only
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Export null or the client - code importing this should handle null case
export const supabase = supabaseClient as any;
