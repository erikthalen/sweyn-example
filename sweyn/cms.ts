import fs from 'fs'
import path from 'path'

let rootDir = ''

async function readBody(req): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('error', reject)
    req.on('end', () => resolve(body))
  })
}

async function saveFile(req, res) {
  try {
    const body = await readBody(req)
    const { content, name } = JSON.parse(body)
    const filename = path.resolve(rootDir, name + '.md')

    fs.mkdirSync('.' + path.dirname(filename), {
      recursive: true,
    })

    fs.writeFileSync('.' + filename, content)

    res.end(`Saved ${filename} successfully`)
  } catch (error) {
    console.log(error)
    res.writeHead(500).end('noooope')
  }
}

function authenticate(req, res, login) {
  const { authorization } = req.headers

  if (!authorization) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic' }).end('Not authorized')
    return false
  }

  const [_, encodedLogin] = authorization.split(' ')
  const [user, pw] = Buffer.from(encodedLogin, 'base64')
    .toString('ascii')
    .split(':')

  if (user === login.username && pw === login.password) {
    return true
  } else {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic' }).end('Not authorized')
    return false
  }
}

function getFilepath(file) {
  return `.${rootDir}/${path.join('./', file)}.md`
}

export function createCms(options) {
  rootDir = options.root || '/content'

  return (req, res) => {
    try {
      const url = new URL('http://foo.bar' + req.url)

      if (
        !url.pathname.startsWith('/admin') &&
        !url.pathname.startsWith('/cms')
      )
        return

      const authenticated = authenticate(req, res, options)

      if (!authenticated) return

      // render admin page
      if (url.pathname.startsWith('/admin')) {
        return res.end(`<html>
          <head>
            <title>Admin</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script type="module" src="/sweyn/cms.client.js"></script>
          </head>
          <body></body>
        </html>`)
      }

      // get all pages, by name
      if (url.pathname === '/cms-get-pages') {
        const files = fs.readdirSync(`.${rootDir}`, { encoding: 'utf8' })
        return res.end(JSON.stringify(files))
      }

      // get content of a page
      if (url.pathname === '/cms-get-page-content') {
        const page = url.searchParams.get('page')
        return res.end(getCmsContent(page))
      }

      // delete page by name
      if (url.pathname === '/cms-remove-page') {
        const page = url.searchParams.get('page')

        fs.unlinkSync(getFilepath(page))
        return res.end('deleted')
      }

      // save content of page
      if (url.pathname === '/cms-save') {
        return saveFile(req, res)
      }
    } catch (error) {
      console.log(error)
    }
  }
}

export function getCmsContent(name) {
  try {
    return fs.readFileSync(getFilepath(name), { encoding: 'utf8' })
  } catch (error) {
    return null
  }
}
