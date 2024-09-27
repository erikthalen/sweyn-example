import { createServer } from './sweyn/index.ts'
import { getContent } from './sweyn/cms.ts'
import { renderFile } from './sweyn/renderer.ts'
import { createRequestHandler } from './sweyn/helpers.ts'
import { renderErrorPage } from './sweyn/server.ts'

createServer({
  port: 3030,
  hmrPort: 8000,
  static: ['src'],
  cms: {
    login: 'admin',
    password: 'password',
  },
  routes: [
    {
      route: '/[slug]',
      handler: createRequestHandler(async (req, res) => {
        return renderFile('[slug]', {
          slug: req.slug,
          content: getContent(req.slug) || 'no content',
        })
      }),
    },
    {
      route: '/not/found',
      handler: createRequestHandler(async (req, res) => {
        return renderErrorPage(req, res)
      }),
    },
  ],
})
