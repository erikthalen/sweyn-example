import { readFile } from 'fs'
import { normalize, join, resolve, extname } from 'path'

const DOUBLE_CURLY_BRACKETS = /\{{(.*?)\}}/g // {{ foo }}
const DOUBLE_SQUARE_BRACKETS = /\[\[(.*?)\]]/g // [[ foo ]]
const DOUBLE_TAGS = /\<<(.*?)\>>/g // << foo >>

let extension = '.html'

const partialPaths = ['', 'pages', 'snippets']
const layoutPaths = ['', 'layouts']

const getFile =
  name =>
  (path): Promise<string> => {
    return new Promise((res, rej) => {
      try {
        readFile(
          join(resolve(path), normalize(name)),
          { encoding: 'utf8' },
          (err, data) => {
            if (err) return rej(err)
            return res(data)
          }
        )
      } catch (error) {
        rej(error)
      }
    })
  }

const renderLayout = async (fileString, layout = 'default') => {
  try {
    const layedOut = await Promise.any(
      layoutPaths.map(getFile(layout + extension))
    )
    const matches = Array.from(layedOut.matchAll(DOUBLE_TAGS))

    return matches.reduce(
      (acc, [match]) => acc.replaceAll(match, fileString || ''),
      layedOut
    )
  } catch (error) {
    return fileString
  }
}

const renderPartials = async fileString => {
  const matches = [...fileString.matchAll(DOUBLE_SQUARE_BRACKETS)]

  if (!matches.length) return fileString

  let output = fileString

  await Promise.all(
    matches.map(async ([match, name]) => {
      let content

      try {
        content = await Promise.any(
          partialPaths.map(getFile(name.trim() + extension))
        )
      } catch (error) {
        content = ''
        console.log('404 - Missing partial: ' + match)
      }

      output = output.replace(match, content || '')
      return
    })
  )

  return await renderPartials(output)
}

export const renderVariables = (fileString, data = {}) => {
  const matches = [...fileString.matchAll(DOUBLE_CURLY_BRACKETS)]

  if (!matches.length) return fileString

  return matches.reduce(
    (acc, [match, variable]) =>
      acc.replaceAll(match, data[variable.trim()] || ''),
    fileString
  )
}

export const renderFile = async (name, data?) => {
  try {
    console.log('name', name)
    const file = await Promise.any(
      partialPaths.map(getFile(extname(name) ? name : name + extension))
    )

    const layout = await renderLayout(file)
    const partial = await renderPartials(layout)

    const result = renderVariables(partial, data)

    return result
  } catch (error) {
    throw '500 - Found no partial to render: ' + name
  }
}
