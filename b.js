const urlInput = document.getElementById('url')
const keywordInput = document.getElementById('keyword')

// chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
//   if (message === 'pageActionClicked') {
//       console.log("test")
//     keywordInput.textContent = hostname
//     urlInput.textContent = url.pathname + url.search
//   }
// })

console.log('asfdfas')
document.onclick = () => console.log('fjkdfsal')

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
