import axios from 'axios'
import './style.css'

const competitorsProxyUrl = '/api/competitors'
const eventsProxyUrl = '/api/events'
const competitorsUrl = competitorsProxyUrl
const eventsUrl = eventsProxyUrl
const themeStorageKey = 'cubing-tw-theme'

const app = document.querySelector('#app')

const eventNameToCode = {
  '3x3x3 Cube': '333',
  '2x2x2 Cube': '222',
  '4x4x4 Cube': '444',
  '5x5x5 Cube': '555',
  '6x6x6 Cube': '666',
  '7x7x7 Cube': '777',
  '3x3x3 Blindfolded': '333bf',
  '3x3x3 Fewest Moves': '333fm',
  '3x3x3 One-Handed': '333oh',
  Clock: 'clock',
  Megaminx: 'minx',
  Pyraminx: 'pyram',
  Skewb: 'skewb',
  'Square-1': 'sq1',
  '4x4x4 Blindfolded': '444bf',
  '5x5x5 Blindfolded': '555bf',
  '3x3x3 Multi-Blind': '333mbf',
}

const eventCodes = [
  '333',
  '222',
  '444',
  '555',
  '666',
  '777',
  '333bf',
  '333fm',
  '333oh',
  'clock',
  'minx',
  'pyram',
  'skewb',
  'sq1',
  '444bf',
  '555bf',
  '333mbf',
]

const singleFirstEvents = new Set(['333bf', '444bf', '555bf', '333mbf'])

let competitorsCache = []
let currentRankingEvent = null
let rankingMap = new Map()

const buildLayout = () => {
  app.innerHTML = `
  <main class="space-y-6 max-w-5xl mx-auto p-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cubing TW Pre-Ranking</p>
        <h1 class="text-3xl font-semibold text-slate-900">Taiwan Championship 2025</h1>
      </div>
      <div class="flex items-center gap-2">
        <button id="theme-toggle" class="btn-secondary" type="button">🌙 Theme</button>
        <button id="refresh" class="btn-primary self-start">Reload Competitors</button>
      </div>
    </header>
    <section class="card p-6 space-y-5">
      <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div class="space-y-1">
          <label for="event-select" class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Event</label>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select id="event-select" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">Loading events…</option>
            </select>
            <button id="list-ranking" class="btn-secondary whitespace-nowrap">Load Pre-Ranking</button>
          </div>
          <p id="event-status" class="text-xs text-slate-500">Fetching events…</p>
        </div>
      </div>
      <div id="status" class="status text-slate-500">Waiting to fetch competitors…</div>
      <div class="overflow-x-auto rounded-xl border border-slate-100">
        <table id="table" class="min-w-full divide-y divide-slate-200 bg-white text-sm"></table>
      </div>
    </section>
  </main>
  `
}

const parseCompetitors = (htmlText) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')
  const firstTbody = doc.querySelector('table tbody')
  if (!firstTbody) return []

  const rows = Array.from(firstTbody.querySelectorAll('tr'))

  const competitors = rows
    .map((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 5) return null

      const name = cells[1]?.textContent.trim()
      const wcaLink = cells[2]?.querySelector('a')
      const wcaId = wcaLink?.textContent.trim() || cells[2]?.textContent.trim()
      const country = cells[3]?.textContent.trim()
      const gender = cells[4]?.textContent.trim()

      const events = Array.from(cells)
        .slice(5)
        .reduce((list, cell, index) => {
          if (cell.textContent.trim() !== "-") list.push(eventCodes[index])
          return list
        }, [])

      return { name, wcaId, country, gender, events }
    })
    .filter(Boolean)

  return competitors
}

const renderTable = (rows) => {
  const table = document.querySelector('#table')
  if (!table) return

  const header = `
    <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <tr>
        <th class="px-3 py-2 text-center">#</th>
        <th class="px-3 py-2 text-left">Name</th>
        <th class="px-3 py-2 text-left">WCA ID</th>
        <th class="px-3 py-2 text-left">Country</th>
        <th class="px-3 py-2 text-left">Gender</th>
        <th class="px-3 py-2 text-left">Average</th>
        <th class="px-3 py-2 text-left">Single</th>
      </tr>
    </thead>
  `

  const sortedRows = rankingMap.size
    ? [...rows].sort((a, b) => {
        const ra = rankingMap.get(a.wcaId) || {}
        const rb = rankingMap.get(b.wcaId) || {}
        const avgA = Number.isFinite(ra.average) ? ra.average : Infinity
        const avgB = Number.isFinite(rb.average) ? rb.average : Infinity
        const bestA = Number.isFinite(ra.single) ? ra.single : Infinity
        const bestB = Number.isFinite(rb.single) ? rb.single : Infinity
        const comparePairs = singleFirstEvents.has(currentRankingEvent)
          ? [
              [bestA, bestB],
              [avgA, avgB],
            ]
          : [
              [avgA, avgB],
              [bestA, bestB],
            ]
        for (const [valA, valB] of comparePairs) {
          if (valA !== valB) return valA - valB
        }
        return (a.name || '').localeCompare(b.name || '')
      })
    : rows

  if (!sortedRows.length) {
    table.innerHTML = '<caption>No competitors found.</caption>'
    return
  }

  const formatTime = (value, eventCode, { isAverage = false } = {}) => {
    if (!Number.isFinite(value) || value <= 0) return '—'
    if (eventCode === '333mbf') {
      const s = String(value).padStart(9, "0");

      const DD = s.slice(0, 2);
      const TTTTT = s.slice(2, 7);
      const MM = s.slice(7);

      let difference = 99 - DD
      let timeInSeconds = parseInt(TTTTT)
      let missed = parseInt(MM)
      let solved = difference + missed
      let attempted = solved + missed

      const minutes = Math.floor(timeInSeconds / 60)
      const seconds = timeInSeconds % 60

      return `${solved}/${attempted} ${minutes}:${String(seconds).padStart(2, '0')}`
    }
    if (eventCode === '333fm') {
      if (isAverage) {
        const moves = value >= 100 ? value / 100 : value
        const formatted = Number.isInteger(moves)
          ? moves.toFixed(0)
          : moves.toFixed(2)
        return `${formatted} moves`
      }
      return `${Math.round(value)} moves`
    }
    const cs = value
    const totalSeconds = cs / 100
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes) {
      const paddedSeconds = seconds.padStart(5, '0')
      return `${minutes}:${paddedSeconds}`
    }
    return seconds
  }

  const body = sortedRows
    .map(
      (row, index) => `
      <tr>
        <td class="px-3 py-2 text-center text-slate-500">${index + 1}</td>
        <td class="px-3 py-2 font-semibold text-slate-900">${row.name || '-'}</td>
        <td class="px-3 py-2">
          ${
            row.wcaId
              ? `<a class="text-blue-700 font-semibold hover:underline" href="https://www.worldcubeassociation.org/persons/${row.wcaId}" target="_blank" rel="noreferrer">${row.wcaId}</a>`
              : '-'
          }
        </td>
        <td class="px-3 py-2 text-slate-700">${row.country || '-'}</td>
        <td class="px-3 py-2 text-slate-700">${row.gender || '-'}</td>
        <td class="px-3 py-2 text-slate-800 font-semibold">${
          rankingMap.has(row.wcaId)
            ? formatTime(
                rankingMap.get(row.wcaId).average,
                currentRankingEvent,
                { isAverage: true }
              )
            : '—'
        }</td>
        <td class="px-3 py-2 text-slate-800 font-semibold">${
          rankingMap.has(row.wcaId)
            ? formatTime(rankingMap.get(row.wcaId).single, currentRankingEvent)
            : '—'
        }</td>
      </tr>
    `
    )
    .join('')

  table.innerHTML = `${header}<tbody>${body}</tbody>`
}

const setStatus = (text, tone = 'muted') => {
  const statusEl = document.querySelector('#status')
  if (!statusEl) return
  statusEl.textContent = text
  const toneClass = {
    muted: 'text-slate-500',
    info: 'text-blue-700',
    success: 'text-emerald-700',
    error: 'text-rose-700',
  }
  statusEl.className = `status ${toneClass[tone] || toneClass.muted}`
}

const fetchCompetitors = async () => {
  setStatus('Loading competitors…', 'info')
  try {
    const response = await axios.get(competitorsUrl)
    const competitors = parseCompetitors(response.data)
    competitorsCache = competitors
    rankingMap = new Map()
    currentRankingEvent = null
    renderTable(competitorsCache)
    setStatus(`Loaded ${competitors.length} competitors.`, 'success')
  } catch (error) {
    console.error(error)
    setStatus('Failed to load competitors. Check the network or proxy settings.', 'error')
  }
}

const attachEvents = () => {
  const refreshButton = document.querySelector('#refresh')
  if (!refreshButton) return
  refreshButton.addEventListener('click', fetchCompetitors)
}

const parseEvents = (htmlText) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')
  const firstTbody = doc.querySelector('table tbody')
  if (!firstTbody) return []
  const rows = Array.from(firstTbody.querySelectorAll('tr'))
  return rows
    .map((row) => row.querySelector('td.text-start')?.textContent.trim())
    .filter((name) => name && !/base fee/i.test(name))
    .map((name) => ({ name, code: eventNameToCode[name] }))
    .filter((item) => item.code)
}

const setEventStatus = (text, tone = 'muted') => {
  const el = document.querySelector('#event-status')
  if (!el) return
  const toneClass = {
    muted: 'text-slate-500',
    info: 'text-blue-700',
    success: 'text-emerald-700',
    error: 'text-rose-700',
  }
  el.textContent = text
  el.className = `text-xs ${toneClass[tone] || toneClass.muted}`
}

const renderEventOptions = (events) => {
  const select = document.querySelector('#event-select')
  if (!select) return
  if (!events.length) {
    select.innerHTML = `<option value="">No events found</option>`
    return
  }
  const options = events
    .map(
      (event) =>
        `<option value="${event.code}">${event.name}</option>`
    )
    .join('')
  select.innerHTML = `<option disabled selected value="">Select an event</option>${options}`
}

const fetchEvents = async () => {
  setEventStatus('Loading events…', 'info')
  try {
    const response = await axios.get(eventsUrl)
    const events = parseEvents(response.data)
    renderEventOptions(events)
    setEventStatus(`Loaded ${events.length} events.`, 'success')
  } catch (error) {
    console.error(error)
    setEventStatus('Failed to load events. Check the network or proxy settings.', 'error')
  }
}

const extractBestTimes = (personResults, eventCode) => {
  let bestSingle = Infinity
  let bestAverage = Infinity
  Object.values(personResults || {}).forEach((comp) => {
    const rounds = comp[eventCode]
    if (!rounds) return
    rounds.forEach((round) => {
      const best = typeof round.best === 'number' ? round.best : round.single
      const average =
        typeof round.average === 'number' ? round.average : round.mean
      if (best && best > 0 && best < bestSingle) bestSingle = best
      if (average && average > 0 && average < bestAverage)
        bestAverage = average
    })
  })
  return {
    single: Number.isFinite(bestSingle) ? bestSingle : null,
    average: Number.isFinite(bestAverage) ? bestAverage : null,
  }
}

const fetchRankingForCompetitor = async (wcaId, eventCode) => {
  if (!wcaId) return { wcaId, single: null, average: null }
  try {
    const url = `https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/${wcaId}.json`
    const response = await axios.get(url)
    const { single, average } = extractBestTimes(response.data.results, eventCode)
    return { wcaId, single, average }
  } catch (error) {
    console.error(`Failed to load record for ${wcaId}`, error)
    return { wcaId, single: null, average: null }
  }
}

const loadRanking = async () => {
  const select = document.querySelector('#event-select')
  const eventCode = select?.value
  if (!eventCode) {
    setStatus('Select an event first.', 'error')
    return
  }

  if (!competitorsCache.length) {
    setStatus('Load competitors before ranking.', 'error')
    return
  }

  const attendingCompetitiors = competitorsCache.filter((c) => c.events.includes(eventCode))
  if (!attendingCompetitiors.length) {
    setStatus('No competitors registered for that event.', 'info')
    rankingMap = new Map()
    currentRankingEvent = eventCode
    renderTable(attendingCompetitiors)
    return
  }

  setStatus(`Loading pre-ranking for ${eventCode}…`, 'info')
  currentRankingEvent = eventCode

  const concurrency = 8
  let index = 0
  const results = []
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < attendingCompetitiors.length) {
      const currentIndex = index++
      const competitor = attendingCompetitiors[currentIndex]
      const result = await fetchRankingForCompetitor(
        competitor.wcaId,
        eventCode
      )
      results.push(result)
    }
  })
  await Promise.all(workers)

  rankingMap = new Map(results.map((r) => [r.wcaId, r]))
  renderTable(attendingCompetitiors)
  setStatus(
    `Loaded pre-ranking for ${eventCode}.`,
    'success'
  )
}

const attachListRanking = () => {
  const btn = document.querySelector('#list-ranking')
  if (!btn) return
  btn.addEventListener('click', loadRanking)
}

const resolveSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyTheme = (mode) => {
  const root = document.documentElement
  if (mode === 'dark') {
    root.dataset.theme = 'dark'
  } else if (mode === 'light') {
    root.dataset.theme = 'light'
  } else {
    root.removeAttribute('data-theme')
  }

  const resolved = mode === 'system' ? resolveSystemTheme() : mode
  const toggle = document.querySelector('#theme-toggle')
  if (toggle) {
    const isDark = resolved === 'dark'
    toggle.textContent = isDark ? '☀️ Light' : '🌙 Dark'
    toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`)
  }
}

const initTheme = () => {
  const stored = localStorage.getItem(themeStorageKey) || 'system'
  applyTheme(stored)

  const toggle = document.querySelector('#theme-toggle')
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = localStorage.getItem(themeStorageKey) || 'system'
      const resolved = current === 'system' ? resolveSystemTheme() : current
      const next = resolved === 'dark' ? 'light' : 'dark'
      localStorage.setItem(themeStorageKey, next)
      applyTheme(next)
    })
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    const storedPref = localStorage.getItem(themeStorageKey) || 'system'
    if (storedPref === 'system') applyTheme('system')
  })
}

const init = () => {
  buildLayout()
  attachEvents()
  attachListRanking()
  fetchEvents()
  fetchCompetitors()
  initTheme()
}

init()
