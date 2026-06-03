var supabaseClient;
var API_BASE;

(function() {
  var s = window.supabase;
  if (!s || !s.createClient) {
    document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:50px">supabase-js not loaded</h1>';
    return;
  }
  try {
    supabaseClient = s.createClient('https://golribpehsyjacmuqrtq.supabase.co', 'sb_publishable_bjGw0T1SEP330qCEHbHZNA_9fDXm4JQ');
  } catch(e) {
    document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:50px">createClient error: ' + e.message + '</h1>';
    return;
  }
  
  var isLocalWeb = window.location.hostname === 'localhost' && window.location.protocol === 'http:';
  API_BASE = isLocalWeb ? '' : 'https://zaffa-live-production.up.railway.app';
})();
