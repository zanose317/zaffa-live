const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ quiet: true })

const app = express()
const PORT = process.env.PORT || 3000

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('Starting ZAFFA LIVE...')
console.log('PORT:', PORT)
console.log('SUPABASE_URL set:', !!SUPABASE_URL)
console.log('SUPABASE_SERVICE_KEY set:', !!SUPABASE_SERVICE_KEY)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars:', Object.keys(process.env).filter(k => k.startsWith('SUPABASE')).join(', '))
}

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))

app.use(express.static(__dirname))
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')))
app.use(express.json())

app.get('/health', (req, res) => res.send('OK'))

if (supabaseAdmin) {
  app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true
    })
    if (authError) return res.status(400).json({ error: authError.message })
    const userId = authData.user.id
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000)
    const { data: profile, error: insertError } = await supabaseAdmin.from('users').insert([
      { id: userId, username, email, coins: 500, diamonds: 0, role: 'user', is_banned: false }
    ]).select().single()
    if (insertError) return res.status(400).json({ error: insertError.message })
    res.json({ success: true, profile })
  })

  app.post('/api/get-profile', async (req, res) => {
    const { userId } = req.body
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).single()
    if (error || !data) return res.status(400).json({ error: 'حساب غير مكتمل' })
    if (data.is_banned) return res.status(403).json({ error: 'الحساب محظور' })
    res.json({ profile: data })
  })

  app.get('/api/gifts', async (req, res) => {
    const { data, error } = await supabaseAdmin.from('gifts').select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.json({ gifts: data })
  })

  app.get('/api/settings', async (req, res) => {
    const { data, error } = await supabaseAdmin.from('settings').select('*')
    if (error) return res.status(400).json({ error: error.message })
    const settings = {}
    data.forEach(s => { settings[s.key] = s.value })
    res.json({ settings })
  })

  app.post('/api/recharge', async (req, res) => {
    const { userId, agentUsername, amount } = req.body
    const { data: agent } = await supabaseAdmin.from('users').select('id').eq('username', agentUsername).eq('role', 'recharge_agent').single()
    if (!agent) return res.status(400).json({ error: 'وكيل الشحن غير موجود' })
    const { data: user } = await supabaseAdmin.from('users').select('coins, total_recharged').eq('id', userId).single()
    const newCoins = (user?.coins || 0) + amount
    await supabaseAdmin.from('users').update({ coins: newCoins, total_recharged: (user?.total_recharged || 0) + amount }).eq('id', userId)
    await supabaseAdmin.from('transactions').insert({ from_user: agent.id, to_user: userId, amount, type: 'recharge' })
    res.json({ success: true, coins: newCoins })
  })

  app.post('/api/send-gift', async (req, res) => {
    const { userId, hostUsername, giftId } = req.body
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', userId).single()
    if (!user) return res.status(400).json({ error: 'مستخدم غير موجود' })
    const { data: host } = await supabaseAdmin.from('users').select('*').eq('username', hostUsername).single()
    if (!host || host.role !== 'host') return res.status(400).json({ error: 'المضيف غير موجود' })
    const { data: gift } = await supabaseAdmin.from('gifts').select('*').eq('id', giftId).single()
    if (!gift) return res.status(400).json({ error: 'الهدية غير موجودة' })
    const price = gift.price_coins
    if (user.coins < price) return res.status(400).json({ error: 'رصيدك لا يكفي' })
    const newCoins = user.coins - price
    await supabaseAdmin.from('users').update({ coins: newCoins }).eq('id', userId)
    await supabaseAdmin.from('users').update({ diamonds: host.diamonds + price }).eq('id', host.id)
    await supabaseAdmin.from('transactions').insert({ from_user: userId, to_user: host.id, amount: price, type: 'gift' })
    let luckyWin = 0
    if (gift.is_lucky) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'daily_luck_percent').single()
      if (Math.random() * 100 <= parseInt(s?.value || 10)) {
        luckyWin = Math.floor(price * (gift.lucky_percent / 100)) || price
        await supabaseAdmin.from('users').update({ coins: newCoins + luckyWin }).eq('id', userId)
      }
    }
    if (host.host_agency_id) {
      const { data: agency } = await supabaseAdmin.from('host_agencies').select('agent_id, commission_percent').eq('id', host.host_agency_id).single()
      if (agency) {
        const commission = Math.floor(price * (agency.commission_percent / 100))
        if (commission > 0) {
          const { data: au } = await supabaseAdmin.from('users').select('diamonds').eq('id', agency.agent_id).single()
          if (au) await supabaseAdmin.from('users').update({ diamonds: au.diamonds + commission }).eq('id', agency.agent_id)
          await supabaseAdmin.from('transactions').insert({ from_user: host.id, to_user: agency.agent_id, amount: commission, type: 'agent_commission' })
        }
      }
    }
    res.json({ success: true, coins: newCoins + luckyWin, luckyWin })
  })

  const ALLOWED_TABLES = ['users', 'gifts', 'settings', 'transactions', 'host_agencies', 'agency_hosts', 'roles_permissions', 'withdrawals']

  app.post('/api/admin', async (req, res) => {
    const { action, table, match, data: payload, order, limit, offset, single, count, or: orCondition } = req.body
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'جدول غير مسموح' })
    let query
    if (action === 'select') {
      query = supabaseAdmin.from(table).select(payload || '*', count ? { count: 'exact' } : undefined)
      if (orCondition) query = query.or(orCondition)
      else if (match) {
        for (const [k, v] of Object.entries(match)) {
          if (typeof v === 'object' && v.op) query = query[v.op](k, ...(v.args || [v.val]))
          else query = query.eq(k, v)
        }
      }
      if (order) query = query.order(order.column, { ascending: order.ascending !== false })
      if (limit) query = query.limit(limit)
      if (single) query = query.single()
      const result = await query
      return res.json(count ? { data: result.data, count: result.count } : { data: result.data, error: result.error })
    }
    if (action === 'insert') { const r = await supabaseAdmin.from(table).insert(payload).select(); return res.json({ data: r.data, error: r.error }) }
    if (action === 'update') {
      let q = supabaseAdmin.from(table).update(payload)
      if (match) { for (const [k, v] of Object.entries(match)) q = q.eq(k, v) }
      const r = await q; return res.json({ data: r.data, error: r.error })
    }
    if (action === 'upsert') { const r = await supabaseAdmin.from(table).upsert(payload); return res.json({ data: r.data, error: r.error }) }
    if (action === 'delete') {
      let q = supabaseAdmin.from(table).delete()
      if (match) { for (const [k, v] of Object.entries(match)) q = q.eq(k, v) }
      const r = await q; return res.json({ data: r.data, error: r.error })
    }
    res.status(400).json({ error: 'عملية غير معروفة' })
  })

  app.post('/api/admin/stats', async (req, res) => {
    const { data: users } = await supabaseAdmin.from('users').select('id, coins')
    res.json({ totalUsers: users.length, totalCoins: users.reduce((a, b) => a + (b.coins || 0), 0) })
  })

  app.post('/api/admin/reports', async (req, res) => {
    const { data: topHosts } = await supabaseAdmin.from('users').select('username, diamonds').eq('role', 'host').order('diamonds', { ascending: false }).limit(10)
    const { data: agents } = await supabaseAdmin.from('users').select('username').eq('role', 'recharge_agent')
    const { data: recharges } = await supabaseAdmin.from('transactions').select('amount').eq('type', 'recharge')
    const { count: giftsCount } = await supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'gift')
    res.json({ topHosts: topHosts || [], agentsCount: agents.length, totalRecharged: recharges.reduce((a, b) => a + (b.amount || 0), 0), giftsCount: giftsCount || 0 })
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT)
})
