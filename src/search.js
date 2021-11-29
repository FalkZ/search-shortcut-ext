const getSearchFolder = () =>
  browser.bookmarks
    .search({ title: '@ search' })
    .then(([{ id }]) => browser.bookmarks.getSubTree(id))
    .then(([{ children }]) => {
      return children
        .filter(
          ({ type, title }) => type === 'bookmark' && title.startsWith('@ ')
        )
        .map(({ title, url }) => ({ title: title.replace('@ ', ''), url }))
    })
    .catch(e => {
      console.error(e)
      return []
    })

const defaultSuggestion =
  'Use ⭾ to select keyword.  |  Search on a website and the ⌕+ symbol on the right side to add a search shortcut.'

browser.omnibox.setDefaultSuggestion({
  description: defaultSuggestion
})

let subTree
browser.omnibox.onInputStarted.addListener(() => {
  subTree = getSearchFolder()
})

const parseKeywords = text => {
  const str = text.trim()
  let index = str.indexOf(' ')
  let inputKeyword = false
  if (index < 1) {
    index = str.length
    inputKeyword = true
  }
  const code = str.substr(0, index)
  const query = str.substr(index + 1)

  return { code, query, inputKeyword }
}

let topUrl
// Update the suggestions whenever the input is changed.
browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
  const { code, query, inputKeyword } = parseKeywords(text)

  console.log({ code, query })
  const s = await subTree

  if (inputKeyword) {
    await browser.omnibox.setDefaultSuggestion({
      description: defaultSuggestion
    })

    const suggestions = s
      .filter(({ title }) => title.startsWith(code))
      .map(({ title, url }) => ({
        content: `${title} `,
        description: `${title} ⌕`,
        url
      }))

    addSuggestions(suggestions)
  } else {
    const { title, url } = s.find(({ title }) => title.startsWith(code))

    browser.omnibox.setDefaultSuggestion({
      description: `${title} ⌕`
    })
    topUrl = url
  }
})

browser.omnibox.onInputEntered.addListener((text, disposition) => {
  const { code, query, inputKeyword } = parseKeywords(text)

  if (!topUrl) console.error('could not set top url on time')

  const url = topUrl.replace('%s', query)
  switch (disposition) {
    case 'currentTab':
      browser.tabs.update({ url })
      break
    case 'newForegroundTab':
      browser.tabs.create({ url })
      break
    case 'newBackgroundTab':
      browser.tabs.create({ url, active: false })
      break
  }
})
