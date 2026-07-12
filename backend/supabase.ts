import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is missing')
}

if (!supabaseSecretKey) {
  throw new Error('SUPABASE_SECRET_KEY is missing')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)