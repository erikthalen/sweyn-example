import fs from 'node:fs'
import fsPromise from 'node:fs/promises'
import path from 'path'

const base = './api'

let res = []

if (fs.existsSync(base)) {
  const filenames = await fsPromise.readdir(base)

  res = await Promise.all(
    filenames.map(async filename => {
      const [endpoint, method] = path.parse(filename).name.split('.')

      return {
        method: method?.toUpperCase() || 'GET',
        endpoint,
        module: (await import(path.resolve(base, filename))).default,
      }
    })
  )
}

export default res
