const BASE_URL = 'https://searchfox.org/mozilla-central'
const SEARCH_URL = `${BASE_URL}/search`
const SOURCE_URL = `${BASE_URL}/source`

browser.omnibox.setDefaultSuggestion({
  description:
    'Search on a website and the ⌕+ symbol on the right side to add a search shortcut.'
})

let subTree
let first
browser.omnibox.onInputStarted.addListener((_, a) => {
  browser.omnibox.setDefaultSuggestion({
    description:
      'Search on a website and the ⌕+ symbol on the right side to add a search shortcut.'
  })

  console.log(a)
  subTree = browser.bookmarks
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
})

const parseKeywords = text => {
  const str = text.trim()
  let index = str.indexOf(' ')
  let inputKeyword = false
  if (index < 1) {
    index = str.length
    inputKeyword = true
  }
  const code = str.substr(0, index) // "72"
  const query = str.substr(index + 1)

  return { code, query, inputKeyword }
}

let topUrl
let noMatchLast = true
// Update the suggestions whenever the input is changed.
browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
  const { code, query, inputKeyword } = parseKeywords(text)

  console.log({ code, query })
  const s = await subTree

  let suggestions
  if (inputKeyword) {
    suggestions = s
      .filter(({ title }) => title.startsWith(code))
      .map(({ title, url }) => ({
        content: `${title} `,
        description: `${title} ⌕`,
        url
      }))
  } else {
    const { title, url } = s.find(({ title }) => title.startsWith(code))

    suggestions = [
      {
        content: `${title} `,
        description: `${title} ⌕`,
        url
      }
    ]
  }
  let noMatch
  if (suggestions.length === 0) {
    noMatch = true
    suggestions.push({
      content: 'search',
      description:
        'Search on a website and the ⌕+ symbol on the right side to add a search shortcut.'
    })
  }

  let d
  if (!noMatch && noMatchLast) {
    d = suggestions[0]
  } else d = suggestions.shift()

  noMatchLast = noMatch

  topUrl = d.url

  addSuggestions(suggestions)

  await browser.omnibox.setDefaultSuggestion({
    description: d.description
  })
})

// Open the page based on how the user clicks on a suggestion.
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

function buildSearchURL (text) {
  let path = ''
  let queryParts = []
  let query = ''
  let parts = text.split(' ')

  parts.forEach(part => {
    if (part.startsWith('path:')) {
      path = part.slice(5)
    } else {
      queryParts.push(part)
    }
  })

  query = queryParts.join(' ')
  return `${SEARCH_URL}?q=${query}&path=${path}`
}

function createSuggestionsFromResponse (response) {
  return new Promise(resolve => {
    let suggestions = []
    let suggestionsOnEmptyResults = [
      {
        content: SOURCE_URL,
        description: 'no results found'
      }
    ]
    response.json().then(json => {
      if (!json.normal) {
        return resolve(suggestionsOnEmptyResults)
      }

      let occurrences = json.normal['Textual Occurrences']
      let files = json.normal['Files']

      if (!occurrences && !files) {
        return resolve(suggestionsOnEmptyResults)
      }

      if (occurrences) {
        occurrences.forEach(({ path, lines }) => {
          suggestions.push({
            content: `${SOURCE_URL}/${path}#${lines[0].lno}`,
            description: lines[0].line
          })
        })
        return resolve(suggestions)
      }

      // There won't be any textual occurrences if the "path:" prefix is used.
      files.forEach(({ path }) => {
        suggestions.push({
          content: `${SOURCE_URL}/${path}`,
          description: path
        })
      })
      return resolve(suggestions)
    })
  })
}
