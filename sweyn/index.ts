import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import fsPromise from 'node:fs/promises'
import { renderFile, renderVariables } from './renderer.ts'
import { HMRServer, injectHMR } from './hmr.ts'
import { createServer, middlewares, routes, staticFolders } from './server.ts'
import api from './api.ts'
import { createRequestHandler } from './helpers.ts'
import { createCms } from './cms.ts'

function defaultHandler(file: string, port?: number) {
  return createRequestHandler(
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const page = await renderFile(file, {
        [file.replace('[', '').replace(']', '')]: req.url,
      })

      if (process.env.NODE_ENV === 'dev') {
        const withHMR = injectHMR(page, port)
        return withHMR
      } else {
        return page
      }
    }
  )
}

type Route = {
  method?: string
  route: string
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
}

type Config = {
  port?: number
  hmrPort?: number
  static?: string | string[]
  cms: {
    login: string
    password: string
  }
  plugins?: ((req: http.IncomingMessage, res: http.ServerResponse) => void)[]
  routes?: Route[]
}

async function init(config: Config) {
  const defaults = {
    static: ['pages', 'sweyn'],
    pagesDir: './pages',
    snippetsDir: './snippets',
    snippetsBaseEndpoint: '/snippets',
    apiBaseEndpoint: '/api',
    port: config.port || 3003,
  }

  HMRServer(config.hmrPort)

  if (config.cms) {
    createCms({
      username: config.cms.login,
      password: config.cms.password,
    })
  }

  // add hmr to the error page
  routes.get('GET')?.set('error', defaultHandler('error', config.hmrPort))

  /**
   * add /pages as static folder
   */
  defaults.static.concat(config.static).forEach(s => staticFolders.add(s))

  /**
   * register files in /pages as routes
   */
  if (fs.existsSync(defaults.pagesDir)) {
    const files = await fsPromise.readdir(defaults.pagesDir)

    files.map(file => {
      const path = file.replace('.html', '')
      const route = '/' + (path === 'index' ? '' : path)
      const handler = defaultHandler(path, config.hmrPort)
      routes.get('GET')?.set(route, handler)
    })
  }

  /**
   * register files in /api as routes
   */
  api?.forEach(({ method, endpoint, module }) => {
    routes
      .get(method)
      ?.set(path.join(defaults.apiBaseEndpoint, endpoint), module)
  })

  /**
   * add plugins
   */
  config.plugins?.forEach(plugin => middlewares.add(plugin))

  /**
   * register user defined routes from config
   */
  config.routes?.forEach(item => {
    const method = item.method?.toUpperCase() || 'GET'
    const { route, handler } = item
    routes.get(method)?.set(route, handler)
  })

  /**
   * register /snippets/file as routes
   */
  if (fs.existsSync(defaults.snippetsDir)) {
    const snippets = await fsPromise.readdir(defaults.snippetsDir)

    snippets.forEach(async snippet => {
      const name = path.parse(snippet).name
      const route = path.join(defaults.snippetsBaseEndpoint, name)
      const handler = await createRequestHandler(async (req, res) => {
        const { searchParams } = new URL('http://foo.com' + req.url)
        const data = Object.fromEntries(searchParams.entries())

        const file = await fsPromise.readFile(
          path.join(defaults.snippetsDir, snippet)
        )

        res.setHeader('Content-Type', 'text/html')

        return renderVariables(file.toString(), data)
      })

      routes.get('GET')?.set(route, handler)
    })
  }

  /**
   * start server
   */
  createServer.listen(defaults.port, () =>
    console.log(`http://localhost:${defaults.port}`)
  )
}

export { init as createServer }
