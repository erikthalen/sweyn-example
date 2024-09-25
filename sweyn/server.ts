import http from 'node:http'
import fs, { createReadStream } from 'node:fs'
import { normalize, join, resolve, extname } from 'node:path'
import { URL } from 'node:url'

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

export const staticFolders = new Set(['', 'public'])

const defaultRoutes = [
  ['/', 'index.html'],
  ['error', 'error.html'],
]

export const routes = new Map([
  ['GET', new Map(defaultRoutes as Iterable<readonly [unknown, unknown]>)],
  ['POST', new Map()],
  ['PUT', new Map()],
  ['PATCH', new Map()],
  ['DELETE', new Map()],
])

export const middlewares = new Set()

const getRouteHandler = (requestedRoute, method = 'GET') => {
  try {
    const result = routes.get(method).get(requestedRoute)

    // found a route exactly matching the requested route
    if (result) return { handler: result }

    // no exact match, try fuzzy finding a route
    const [_, ...reqUrlArr] = requestedRoute.split('/')

    let matchedRoutes = []

    routes.get(method).forEach((handler, registeredRoute) => {
      const [_, ...regUrlArr] = registeredRoute.split('/')

      const isMatch = reqUrlArr.every((part, idx) => {
        if (!regUrlArr[idx] || regUrlArr.length !== reqUrlArr.length) return
        return part === regUrlArr[idx] || regUrlArr[idx].startsWith(':')
      })

      if (isMatch) {
        const matches = regUrlArr
          .map(
            (part, idx) =>
              part.includes(':') && {
                key: part,
                value: reqUrlArr[idx],
              }
          )
          .filter(Boolean)

        matchedRoutes.push({ matches, handler })
      }
    })

    const matchedRoutesSorted = matchedRoutes.toSorted((a, b) => {
      return a.matches.length - b.matches.length
    })

    return matchedRoutesSorted.at(0)
  } catch (error) {
    throw '404 - No route found' + error
  }
}

const getFileFromFS =
  (name: string) =>
  (path: string): Promise<fs.ReadStream> => {
    return new Promise((res, rej) => {
      try {
        const stream = createReadStream(join(resolve(path), normalize(name)))
        stream.on('error', rej)
        stream.on('open', () => res(stream))
      } catch (error) {
        rej(error)
      }
    })
  }

export async function streamFile(req, res, fileName) {
  try {
    // loop through all registered static folders and check for the file
    const stream = await Promise.any(
      Array.from(staticFolders).map(getFileFromFS(fileName))
    )

    stream.pipe(
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(fileName)] })
    )
  } catch (error) {
    res.writeHead(404).end(error.statusText)
    // return handleError(req, res, '404 - No file found: ' + fileName)
  }
}

export async function handleError(req, res, error) {
  const { handler } = getRouteHandler('error')

  if (typeof handler === 'string') return await streamFile(req, res, handler)

  if (typeof handler === 'function') {
    if (!res.error) res.error = error
    return handler(req, res)
  }
}

export async function requestHandler(req, res) {
  const { method, url, headers } = req
  const { pathname, searchParams } = new URL('https://' + headers.host + url)

  try {
    for (const middleware of Array.from(middlewares)) {
      await middleware(req, res)
    }

    if (res.headersSent) return

    // is request for a static file?
    if (extname(normalize(pathname)))
      return await streamFile(req, res, resolve(url))

    const result = getRouteHandler(resolve(pathname), method)

    if (!result) throw '500 - no route found'

    if (typeof result.handler === 'string')
      return await streamFile(req, res, result.handler)

    if (typeof result.handler === 'function') {
      result.matches?.forEach(match => {
        if (!req[match.key]) req[match.key] = match.value
      })

      req.query = Object.fromEntries(searchParams)

      return result.handler(req, res)
    }

    throw '500 - could not handle request'
  } catch (error) {
    return handleError(req, res, error)
  }
}

export const createServer = http.createServer(requestHandler)
