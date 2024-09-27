import { extname, resolve } from 'node:path'

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.md': 'text/plain',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export async function readBody(req): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => (body += chunk.toString()))
    req.on('error', reject)
    req.on('end', () => resolve(body))
  })
}

export function createRequestHandler(callback) {
  return async function (req, res) {
    try {
      const result = await callback(req, res)

      if (result instanceof Error) {
        return res.writeHead(500).end(JSON.stringify(result))
      }

      if (res.headersSent) return

      if (result && typeof result.on === 'function') {
        const contentType = CONTENT_TYPES[extname(resolve(req.url))]
        if (contentType) res.setHeader('Content-Type', contentType)
        return result.pipe(res.writeHead(200))
      }

      if (res.headersSent) return

      if (typeof result === 'string') {
        return res.writeHead(200).end(result)
      }

      if (res.headersSent) return

      if (Buffer.isBuffer(result)) {
        return res.writeHead(200).end(result)
      }

      if (res.headersSent) return

      return res.writeHead(200).end(JSON.stringify(result))
    } catch (error) {
      console.log(error)
      res.writeHead(error.status || 500).end(JSON.stringify(error))
    }
  }
}
