import { createServer } from './sweyn/index.ts'
import { createCms, getCmsContent } from './sweyn/cms.ts'
import { renderFile } from './sweyn/renderer.ts'
import { handleError } from './sweyn/server.ts'

createServer({
  port: 3030,
  hmrPort: 8000,
  static: ['src'],
  plugins: [
    createCms({
      username: 'admin',
      password: 'password',
    }),
  ],
  routes: [
    {
      route: '/about',
      handler: async (req, res) => {
        const markdown = getCmsContent('about')

        if (!markdown) return handleError(req, res, 'No file with that name')

        res.end(await renderFile('about', { content: markdown }))
      },
    },
  ],
})
