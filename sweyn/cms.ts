import fs from 'node:fs'
import fsPromise from 'node:fs/promises'
import path, { resolve } from 'node:path'
import { routes, streamFile } from './server.ts'
import { createRequestHandler, readBody } from './helpers.ts'
import { renderVariables } from './renderer.ts'

let rootDir = ''

async function saveFile(req, res) {
  const body = await readBody(req)
  const { filename, content } = Object.fromEntries(
    body.split('&').map(part => part.split('='))
  )

  fs.mkdirSync('.' + path.dirname(filename), {
    recursive: true,
  })

  const decodedContent = decodeURIComponent(content.replaceAll('+', ' '))

  fs.writeFileSync(
    path.join('.', rootDir, filename.replaceAll(' ', '-') + '.md'),
    decodedContent
  )

  return `Saved ${filename} successfully`
}

function authenticate(req, res, login) {
  const { authorization } = req.headers

  if (!authorization) {
    res.setHeader('WWW-Authenticate', 'Basic')
    throw { status: 401, message: 'Not authorized' }
  }

  const [_, encodedLogin] = authorization.split(' ')
  const [user, pw] = Buffer.from(encodedLogin, 'base64')
    .toString('ascii')
    .split(':')

  if (user === login.username && pw === login.password) {
    return true
  } else {
    res.setHeader('WWW-Authenticate', 'Basic')
    throw { status: 401, message: 'Not authorized' }
  }
}

function getFilepath(file) {
  return path.join('.', rootDir, file + '.md')
}

export function createCms(options) {
  rootDir = options.root || '/content'

  async function renderCms(req, res) {
    authenticate(req, res, options)
    res.setHeader('Content-Type', 'text/html')
    const index = await fsPromise.readFile(resolve('./sweyn/cms.html'))
    const pages = fs.readdirSync(`.${rootDir}`, { encoding: 'utf8' })

    const menu = pages
      .map(page => {
        return `<a href="/admin/${page.replace('.md', '')}">${page}</a>
          <form action="/admin/api/delete">
            <input type="hidden" value="${page}" name="page">
            <input type="submit" value="Delete">
          </form>`
      })
      .join('')

    return renderVariables(index.toString(), {
      pages: menu,
      content: getContent(req.page),
      filename: req.page,
    })
  }

  routes.get('GET').set('/admin', createRequestHandler(renderCms))

  routes.get('GET').set('/admin/[page]', createRequestHandler(renderCms))

  routes.get('GET').set(
    '/admin/api/pages',
    createRequestHandler((req, res) => {
      authenticate(req, res, options)
      return fs.readdirSync(`.${rootDir}`, { encoding: 'utf8' })
    })
  )

  routes.get('GET').set(
    '/admin/api/content',
    createRequestHandler((req, res) => {
      authenticate(req, res, options)
      const { searchParams } = new URL('http://foo.com' + req.url)
      return getContent(searchParams.get('page'))
    })
  )

  routes.get('GET').set(
    '/admin/api/delete',
    createRequestHandler((req, res) => {
      authenticate(req, res, options)
      const { searchParams } = new URL('http://foo.com' + req.url)
      const filename = searchParams.get('page')
      const filepath = path.join('.', rootDir, filename)
      fs.unlinkSync(filepath)

      res.writeHead(301, { Location: '/admin' }).end()
    })
  )

  routes.get('GET').set(
    '/admin/api/new',
    createRequestHandler((req, res) => {
      authenticate(req, res, options)

      const { searchParams } = new URL('http://foo.com' + req.url)
      const filename = searchParams.get('filename').replaceAll(' ', '-')
      fs.writeFileSync(
        path.join('.', rootDir, filename + '.md'),
        '# Start typing...'
      )
      res.writeHead(301, { Location: '/admin/' + filename }).end()
    })
  )

  routes.get('POST').set(
    '/admin/api/save',
    createRequestHandler((req, res) => {
      authenticate(req, res, options)
      saveFile(req, res)
      res.writeHead(301, { Location: req.headers.referer }).end()
    })
  )
}

export function getContent(name) {
  try {
    return fs.readFileSync(getFilepath(name), { encoding: 'utf8' })
  } catch (error) {
    return null
  }
}
