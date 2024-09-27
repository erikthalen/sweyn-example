import http from 'node:http'
import fs, { createReadStream } from 'node:fs'
import { normalize, join, resolve, extname } from 'node:path'
import { URL } from 'node:url'
import { createRequestHandler } from './helpers.ts'

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

      if (regUrlArr.length !== reqUrlArr.length) return
      if (!regUrlArr.find(part => part.startsWith('['))) return

      const isMatch = reqUrlArr.every((part, idx) => {
        return part === regUrlArr[idx] || regUrlArr[idx].startsWith('[')
      })

      if (!isMatch) return

      const matches = regUrlArr
        .map(
          (part, idx) =>
            part.startsWith('[') && {
              key: part.replace('[', '').replace(']', ''),
              value: reqUrlArr[idx],
            }
        )
        .filter(Boolean)

      matchedRoutes.push({ matches, handler })
    })

    const matchedRoutesSorted = matchedRoutes.toSorted((a, b) => {
      return a.matches.length - b.matches.length
    })

    return matchedRoutesSorted.at(0)
  } catch (error) {
    throw { status: 404, message: 'No route found' + error }
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

export async function streamFile(filename) {
  try {
    return await Promise.any(
      Array.from(staticFolders).map(getFileFromFS(filename))
    )
  } catch (error) {
    throw { status: 404, message: 'streamFile dit not find ' + filename }
  }
}

export function renderErrorPage(req, res) {
  const errorRoute = getRouteHandler('error')
  if (typeof errorRoute.handler === 'string')
    return streamFile(errorRoute.handler)

  if (typeof errorRoute.handler === 'function') {
    return errorRoute.handler(req, res)
  }
}

export const requestHandler = await createRequestHandler(async (req, res) => {
  const { method, url, headers } = req
  const { pathname, searchParams } = new URL('https://' + headers.host + url)

  // is request for a static file?
  if (extname(normalize(pathname))) {
    return await streamFile(resolve(url))
  }

  const result =
    getRouteHandler(resolve(pathname), method) || getRouteHandler('error')

  try {
    if (typeof result.handler === 'string')
      return await streamFile(result.handler)

    const handlerFunction = await Promise.resolve(result.handler)

    if (typeof handlerFunction === 'function') {
      result.matches?.forEach(match => {
        if (!req[match.key]) req[match.key] = match.value
      })

      req.query = Object.fromEntries(searchParams)

      return handlerFunction(req, res)
    }
  } catch (error) {
    return 'error no route'
  }

  throw { status: 500, message: 'could not handle request' }
})

export const createServer = http.createServer(requestHandler)
