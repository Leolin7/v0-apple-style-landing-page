import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn(
    "%c[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable",
    "color: #ff6b6b; font-weight: bold"
  )
}

if (!supabaseAnonKey) {
  console.warn(
    "%c[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable",
    "color: #ff6b6b; font-weight: bold"
  )
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
)
