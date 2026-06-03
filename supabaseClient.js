import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://golribpehsyjacmuqrtq.supabase.co'
const supabaseAnonKey = 'sb_publishable_bjGw0T1SEP330qCEHbHZNA_9fDXm4JQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const isCapacitor = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
const isLocalWeb = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.protocol === 'http:'
export const API_BASE = isLocalWeb ? '' : 'https://zaffa-live-production.up.railway.app'
