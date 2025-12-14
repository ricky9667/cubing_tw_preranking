import axios from 'axios'
import './style.css'

const sourceUrl =
  'https://cubing-tw.net/event/2025TaiwanChampionship/competitors'
const proxyUrl = '/api/competitors'

const app = document.querySelector('#app')

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

const buildLayout = () => {
  app.innerHTML = `
  <main class="space-y-6 max-w-5xl mx-auto p-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Taiwan Championship 2025</p>
        <h1 class="text-3xl font-semibold text-slate-900">Competitors</h1>
        <p class="text-slate-600">Fetched live from <a class="underline decoration-dotted underline-offset-2" href="${sourceUrl}" target="_blank" rel="noreferrer">${sourceUrl}</a> via axios.</p>
      </div>
      <button id="refresh" class="btn-primary self-start">Refresh</button>
    </header>
    <section class="card p-6 space-y-4">
      <div id="status" class="status text-slate-500">Waiting to fetch…</div>
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
          if (cell.textContent.trim()) list.push(eventCodes[index])
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

  if (!rows.length) {
    table.innerHTML = '<caption>No competitors found.</caption>'
    return
  }

  const header = `
    <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <tr>
        <th class="px-3 py-2 text-center">#</th>
        <th class="px-3 py-2 text-left">Name</th>
        <th class="px-3 py-2 text-left">WCA ID</th>
        <th class="px-3 py-2 text-left">Country</th>
        <th class="px-3 py-2 text-left">Gender</th>
        <th class="px-3 py-2 text-left">Events</th>
      </tr>
    </thead>
  `

  const body = rows
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
        <td class="px-3 py-2 text-slate-700">${row.events.length ? row.events.join(', ') : '—'}</td>
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
    const response = await axios.get(proxyUrl)
    const competitors = parseCompetitors(response.data)
    renderTable(competitors)
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

const init = () => {
  buildLayout()
  attachEvents()
  fetchCompetitors()
}

init()
