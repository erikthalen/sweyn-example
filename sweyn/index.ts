import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import fsPromise from 'node:fs/promises'
import { renderFile } from './renderer.ts'
import { HMRServer, injectHMR } from './hmr.server.ts'
import {
  createServer,
  handleError,
  middlewares,
  routes,
  staticFolders,
} from './server.ts'
import api from './api.server.ts'

function defaultHandler(file: string, port?: number) {
  return async function (req: http.IncomingMessage, res: http.ServerResponse) {
    const page = await renderFile(file, { [file.replace(':', '')]: req.url })

    if (process.env.NODE_ENV === 'dev') {
      const withHMR = injectHMR(page, '../sweyn/hmr.client.js', port)
      res.end(withHMR)
    } else {
      res.end(page)
    }
  }
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
  plugins?: ((req: http.IncomingMessage, res: http.ServerResponse) => void)[]
  routes?: Route[]
}

async function init(config: Config) {
  HMRServer(config.hmrPort)

  /**
   * add /pages as static folder
   */
  const sweynStaticFolders = ['pages']
  sweynStaticFolders.concat(config.static).forEach(s => staticFolders.add(s))

  routes.get('GET')?.set('error', defaultHandler('error', config.hmrPort))

  /**
   * register files in /pages as routes
   */
  if (fs.existsSync('pages')) {
    const files = await fsPromise.readdir('pages')

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
  api.forEach(({ method, endpoint, module }) => {
    routes.get(method)?.set(path.join('/api', endpoint), module)
  })

  /**
   * add plugins
   */
  config.plugins.forEach(plugin => middlewares.add(plugin))

  /**
   * register user defined routes from config
   */
  config.routes.forEach(item => {
    const method = item.method?.toUpperCase() || 'GET'
    const { route, handler } = item
    routes.get(method)?.set(route, handler)
  })

  /**
   * register /snippets/file as routes
   */
  if (fs.existsSync('snippets')) {
    const snippets = await fsPromise.readdir('snippets')

    snippets.forEach(snippet => {
      const name = path.parse(snippet).name
      const route = path.join('/snippets', name)
      const handler = async (_, res) => {
        try {
          const file = await fsPromise.readFile(
            path.join('./snippets', snippet)
          )

          res.end(file)
        } catch (error) {
          console.log('????')
          // res.status(400).send({
          //   message: 'This is an error!',
          // })
        }
      }
      routes.get('GET')?.set(route, handler)
    })
  }

  /**
   * start server
   */
  const port = config.port || 3003

  createServer.listen(port, () => console.log(`http://localhost:${port}`))
}

export { init as createServer }
