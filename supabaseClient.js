import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://golribpehsyjacmuqrtq.supabase.co'
const supabaseAnonKey = 'sb_publishable_bjGw0T1SEP330qCEHbHZNA_9fDXm4JQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
