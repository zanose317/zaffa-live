const { createClient } = window.supabase;

var supabaseUrl = 'https://golribpehsyjacmuqrtq.supabase.co';
var supabaseAnonKey = 'sb_publishable_bjGw0T1SEP330qCEHbHZNA_9fDXm4JQ';

var supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

var isLocalWeb = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.protocol === 'http:';
var API_BASE = isLocalWeb ? '' : 'https://zaffa-live-production.up.railway.app';
