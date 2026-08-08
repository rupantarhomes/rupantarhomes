import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  client ??= createClient(supabaseUrl!, supabasePublishableKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export async function getAccessToken(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your admin session has expired. Please log in again.");
  }
  return data.session.access_token;
}

export type { Session };
