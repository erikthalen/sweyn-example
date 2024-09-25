export default function (port) {
  const connection = new WebSocket(`ws://localhost:${port}`)
  connection.onmessage = e => {
    if (e.data === 'reload') {
      window.location.reload()
    } else {
      console.log(
        '%c ' + e.data + ' ',
        'color: green; font-weight:bold; background: lightgreen; border-radius: 3px'
      )
    }
  }

  connection.onclose = function () {
    window.location.reload()
  }
}
