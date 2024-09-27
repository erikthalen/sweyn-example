console.log('hello from app.js')

if (window.location.pathname === '/') {
  try {
    const searchParams = new URLSearchParams()
    searchParams.set('data', 'this is some data 🥸')
    const res = await fetch('/snippets/example?' + searchParams.toString())

    if (!res.ok) throw 'noooo'

    document.body.insertAdjacentHTML('beforeend', await res.text())
  } catch (error) {
    console.warn(error)
  }

  try {
    const api = await fetch('/api/hello-world')

    if (!api.ok) throw 'noooo'

    const json = await api.json()

    document.body.insertAdjacentHTML(
      'beforeend',
      `<pre>${JSON.stringify(json, null, 2)}</pre>`
    )
  } catch (error) {
    console.warn(error)
  }
}

const firstRes = await fetch('/api/multiple/first')
const firstText = await firstRes.text()
console.log(firstText)
const secondRes = await fetch('/api/multiple/second')
const secondText = await secondRes.text()
console.log(secondText)