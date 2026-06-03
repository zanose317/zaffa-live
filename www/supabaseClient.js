const { createClient } = window.supabase

const supabaseUrl = 'https://golribpehsyjacmuqrtq.supabase.co'
const supabaseAnonKey = 'sb_publishable_bjGw0T1SEP330qCEHbHZNA_9fDXm4JQ'

const s = createClient(supabaseUrl, supabaseAnonKey)
window.supabaseClient = s

const isLocalWeb = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.protocol === 'http:'
window.API_BASE = isLocalWeb ? '' : 'https://zaffa-live-production.up.railway.app'
