const [_, FILE_NAME] = window.location.pathname.split('/').filter(Boolean)

/**
 * body layout
 */
document.body.style.display = 'flex'
document.body.style.flexWrap = 'wrap'
document.body.style.gap = '2vw'
document.body.style.fontFamily = 'monospace'
document.body.style.fontSize = '15px'
document.body.style.lineHeight = 1.4

/**
 * menu
 */
const menu = document.createElement('ul')

Object.assign(menu.style, {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  flexDirection: 'column',
  paddingLeft: 0,
  marginTop: 0,
  listStyle: 'none',
})

const itemsRes = await fetch('/cms-get-pages')
const items = await itemsRes.json()

if (!FILE_NAME && items.length) {
  window.location = window.location + '/' + items[0].replace('.md', '')
}

items.forEach(item => {
  const li = document.createElement('li')

  const a = document.createElement('a')
  a.textContent = item
  a.href = './' + item.replace('.md', '')
  li.append(a)

  const removeButton = document.createElement('button')
  removeButton.textContent = '❌'
  removeButton.style.marginLeft = '10px'
  removeButton.addEventListener('click', async () => {
    const remove = window.confirm('Do you want to remove ' + item + '?')
    if (!remove) return
    const response = await fetch(
      '/cms-remove-page?page=' + item.replace('.md', '')
    )

    if (response.ok) {
      window.location =
        window.location.origin + '/admin/' + items[0].replace('.md', '')
    }
  })
  li.append(removeButton)

  menu.append(li)
})

const addPageButton = document.createElement('button')
addPageButton.textContent = '➕'
addPageButton.addEventListener('click', async () => {
  const filename = window.prompt('Name of the new page?')
  console.log(filename)

  const res = await fetch('/cms-save', {
    method: 'POST',
    body: JSON.stringify({
      name: filename,
      content: '',
    }),
  })

  if (res.ok) {
    window.location = window.location.origin + '/admin/' + filename
  }
})

menu.append(addPageButton)

document.body.append(menu)

/**
 * input
 */
const form = document.createElement('form')

form.style.display = 'flex'
form.style.flexDirection = 'column'
form.style.alignItems = 'flex-start'
form.style.gap = '10px'

function renderMarkdownInput(container, content) {
  const element = document.createElement('div')
  element.innerText = content || '# Start typing...'
  element.classList.add('markdown')
  element.setAttribute('contenteditable', '')

  const style = {
    border: '1px solid #aaa',
    padding: '10px',
    borderRadius: '5px',
    width: '100%',
    boxSizing: 'border-box',
  }

  Object.assign(element.style, style)

  container.append(element)

  return element
}

/**
 * content
 */
const content = await fetch('/cms-get-page-content?page=' + FILE_NAME)
const text = await content.text()

const markdownInput = renderMarkdownInput(form, text)

const submitButton = document.createElement('button')
submitButton.textContent = '💾'

form.append(submitButton)

document.body.append(form)

form.addEventListener('submit', async e => {
  e.preventDefault()

  console.log(markdownInput.innerText, markdownInput.innerHTML)

  const res = await fetch('/cms-save', {
    method: 'POST',
    body: JSON.stringify({
      name: FILE_NAME,
      content: markdownInput.innerText.replace('\n\n\n', '\n\n'),
    }),
  })

  if (!res.ok) {
    console.warn(res.statusText)
    e.target.firstElementChild.style.backgroundColor =
      'rgba(252, 148, 148, 0.3)'
    return
  }

  const response = await res.text()

  const defaultSubmitText = submitButton.textContent
  submitButton.textContent = '✅'
  const message = document.createElement('span')
  message.textContent = response
  submitButton.insertAdjacentElement('afterend', message)
  e.target.firstElementChild.style.backgroundColor = 'rgba(148, 252, 159, 0.3)'

  setTimeout(() => {
    submitButton.textContent = defaultSubmitText
    message.remove()
    e.target.firstElementChild.style.removeProperty('background-color')
  }, 1000)
})

// save on cmd-s
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    form.requestSubmit()
  }
})
