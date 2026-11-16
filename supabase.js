import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars are missing. Check .env.local')
}

export const sb = createClient(url || '', key || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
