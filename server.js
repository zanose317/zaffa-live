const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 3000

console.log(`=== ZAFFA LIVE starting on port ${PORT} ===`)
console.log('__dirname:', __dirname)
console.log('PORT env:', process.env.PORT)
console.log('SUPABASE env vars:', !!process.env.SUPABASE_URL, !!process.env.SUPABASE_SERVICE_KEY)

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(content)
    } catch (e) {
      res.writeHead(500)
      res.end('Error loading page: ' + e.message)
    }
    return
  }

  const filePath = path.join(__dirname, req.url)
  try {
    const content = fs.readFileSync(filePath)
    const ext = path.extname(filePath)
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' })
    res.end(content)
  } catch (e) {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`)
})

server.on('error', (err) => {
  console.error('Server error:', err.message)
  process.exit(1)
})
