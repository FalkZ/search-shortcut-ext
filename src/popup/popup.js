const urlInput = document.getElementById('url')
const keywordInput = document.getElementById('keyword')
const addInput = document.getElementById('add')
const deleteInput = document.getElementById('delete')

const getSearchFolder = () =>
  browser.bookmarks
    .search({ title: '@ search' })
    .then(([{ id }]) => browser.bookmarks.getSubTree(id))
    .then(([{ children }]) => {
      return children
        .filter(
          ({ type, title }) => type === 'bookmark' && title.startsWith('@ ')
        )
        .map(({ title, url, id }) => ({
          title: title.replace('@ ', ''),
          url,
          id
        }))
    })
    .catch(e => {
      console.error(e)
      return []
    })

let url
let bookmarkId

const parseValuesFromUrl = url => {
  const [_, name] = /([^.]+)\.[^.]+$/.exec(url.hostname)
  const guid = 'f006196d-38e2-4dbb-840b-a797b1a23909'
  if (url.searchParams.has('query')) url.searchParams.set('query', guid)
  else if (url.searchParams.has('q')) url.searchParams.set('q', guid)

  const path = url.pathname + url.search.replace(guid, '%s')
  return { name, path }
}
const getValues = async currentUrl => {
  bookmarkId = null
  const all = await getSearchFolder()
  const ret = all.find(({ url }) => url.startsWith(currentUrl.origin))

  if (ret) {
    bookmarkId = ret.id
    deleteInput.classList.remove('hidden')
    return { name: ret.title, path: ret.url.replace(currentUrl.origin, '') }
  } else return parseValuesFromUrl(currentUrl)
}

document.addEventListener('DOMContentLoaded', async function () {
  const [currentTab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  })
  url = new URL(currentTab.url)

  const { name, path } = await getValues(url)

  keywordInput.textContent = name
  urlInput.textContent = path
})

const createOrGetFolder = async () => {
  let [folder] = await browser.bookmarks.search({ title: '@ search' })
  if (!folder) {
    folder = await browser.bookmarks.create({ title: '@ search' })
  }

  console.log({ folder })
  return folder.id
}

const apply = async () => {
  const body = {
    title: `@ ${keywordInput.textContent}`,
    url: url.origin + urlInput.textContent
  }
  if (bookmarkId) await browser.bookmarks.update(bookmarkId, body)
  else
    await browser.bookmarks.create({
      parentId: await createOrGetFolder(),
      ...body
    })

  window.close()
}

addInput.addEventListener('click', apply)
document.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    event.preventDefault()
    apply()
  }
})

deleteInput.addEventListener('click', async () => {
  await browser.bookmarks.remove(bookmarkId)

  window.close()
})
