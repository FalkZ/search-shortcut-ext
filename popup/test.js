const urlInput = document.getElementById('url')
const keywordInput = document.getElementById('keyword')
const addInput = document.getElementById('add')

let url

document.addEventListener('DOMContentLoaded', async function () {
  const [currentTab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  })
  url = new URL(currentTab.url)
  console.log(url)
  const [_, hostname] = /([^.]+)\.[^.]+$/.exec(url.hostname)
  const guid = 'f006196d-38e2-4dbb-840b-a797b1a23909'
  if (url.searchParams.has('query')) url.searchParams.set('query', guid)
  else if (url.searchParams.has('q')) url.searchParams.set('q', guid)

  keywordInput.textContent = hostname
  urlInput.textContent = url.pathname + url.search.replace(guid, '%s')
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
  const b = await browser.bookmarks.create({
    parentId: await createOrGetFolder(),
    title: `@ ${keywordInput.textContent}`,
    url: url.origin + urlInput.textContent
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

var currentTab
var currentBookmark

/*
 * Switches currentTab and currentBookmark to reflect the currently active tab
 */
function updateActiveTab (tabs) {
  function isSupportedProtocol (urlString) {
    var supportedProtocols = ['https:', 'http:', 'ftp:', 'file:']
    var url = document.createElement('a')
    url.href = urlString
    return supportedProtocols.indexOf(url.protocol) != -1
  }

  function updateTab (tabs) {
    if (tabs[0]) {
      currentTab = tabs[0]
      if (isSupportedProtocol(currentTab.url)) {
        var searching = browser.bookmarks.search({ url: currentTab.url })
        searching.then(bookmarks => {
          currentBookmark = bookmarks[0]
          //updateIcon()
        })
      } else {
        console.log(
          `Bookmark it! does not support the '${currentTab.url}' URL.`
        )
      }
    }
  }

  var gettingActiveTab = browser.tabs.query({
    active: true,
    currentWindow: true
  })
  gettingActiveTab.then(updateTab)
}

// listen for bookmarks being created
browser.bookmarks.onCreated.addListener(updateActiveTab)

// listen for bookmarks being removed
browser.bookmarks.onRemoved.addListener(updateActiveTab)

// listen to tab URL changes
browser.tabs.onUpdated.addListener(updateActiveTab)

// listen to tab switching
browser.tabs.onActivated.addListener(updateActiveTab)

// listen for window switching
browser.windows.onFocusChanged.addListener(updateActiveTab)

// update when the extension loads initially
updateActiveTab()
