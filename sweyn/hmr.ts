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

const hmrClient =
  port => `const connection = new WebSocket('ws://localhost:${port}')
  connection.onmessage = e => {
    if (e.data === 'reload') {
      window.location.reload()
    } else {
      console.log(
        '%c ' + e.data + ' ',
        'color: green; font-weight:bold; background: lightgreen; border-radius: 3px'
      )
    }
  }

  connection.onclose = function () {
    window.location.reload()
  }`

export function injectHMR(str, port) {
  return str.replace(
    '<head>',
    `<head><script type="module">${hmrClient(port)}</script>`
  )
}
