console.log('hello from app.js')

if (window.location.pathname === '/') {
  try {
    const res = await fetch('/snippets/example')

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
