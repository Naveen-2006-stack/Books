import { createBrowserClient } from "@supabase/ssr";
import { createMockSupabaseClient } from "@/lib/supabase/mock";
import type { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockSupabaseClient();
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
  );
}
