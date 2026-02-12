// Admin Supabase client for MRKTCMD (for webhooks and server operations)
// Uses service role key to bypass RLS
import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from './fetch-with-timeout'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
