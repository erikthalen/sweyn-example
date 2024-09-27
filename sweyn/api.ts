import fs from 'node:fs'
import fsPromise from 'node:fs/promises'
import path from 'path'

const base = './api'

let res = []

if (fs.existsSync(base)) {
  const filenames = await fsPromise.readdir(base)

  const endpoints = filenames.map(async filename => {
    const [endpoint, method] = path.parse(filename).name.split('.')
    const modules = await import(path.resolve(base, filename))

    if (Object.values(modules).length === 1) {
      return [
        {
          method: method?.toUpperCase() || 'GET',
          endpoint,
          module: Object.values(modules)[0],
        },
      ]
    }

    let result = []

    for (let module in modules) {
      const nestedEndpoint = path.join('/', endpoint, module)

      result.push({
        method: method?.toUpperCase() || 'GET',
        endpoint: nestedEndpoint,
        module: modules[module],
      })
    }

    return result
  })

  res = (await Promise.all(endpoints)).flat()
}

export default res
