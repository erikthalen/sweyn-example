import fs from 'node:fs'
import { WebSocketServer } from 'ws'

const dirs = ['./src', './pages', './snippets', './layouts', '/api']

export function HMRServer(port = 8080) {
  const wss = new WebSocketServer({ port })

  wss.on('connection', function connection(ws) {
    ws.send('Connected to HMR')

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) return

      fs.watch(dir, (eventType, filename) => {
        if (filename === '.DS_Store') return
        console.clear()
        console.log('hmr reload:', filename)
        ws.send('reload')
      })
    })
  })
}

function hmrClientScript(path, port) {
  return `<script type="module">(await import('${path}')).default(${port})</script>`
}

export function injectHMR(str, path, port) {
  return str.replace('<head>', '<head>' + hmrClientScript(path, port))
}
