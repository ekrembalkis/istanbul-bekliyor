import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://') ? createClient(supabaseUrl, supabaseKey) : null
