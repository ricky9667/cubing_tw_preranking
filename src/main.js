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
    <main class="page">
      <header class="page__header">
        <div>
          <p class="eyebrow">Taiwan Championship 2025</p>
          <h1>Competitors</h1>
          <p class="lead">Fetched live from <a href="${sourceUrl}" target="_blank" rel="noreferrer">${sourceUrl}</a> via axios.</p>
        </div>
        <button id="refresh" class="button">Refresh</button>
      </header>
      <section class="panel">
        <div id="status" class="status status--muted">Waiting to fetch…</div>
        <div class="table-wrap">
          <table id="table" class="table"></table>
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
    <thead>
      <tr>
        <th class="col-number">#</th>
        <th>Name</th>
        <th>WCA ID</th>
        <th>Country</th>
        <th>Gender</th>
        <th>Events</th>
      </tr>
    </thead>
  `

  const body = rows
    .map(
      (row, index) => `
      <tr>
        <td class="col-number">${index + 1}</td>
        <td>${row.name || '-'}</td>
        <td>${row.wcaId ? `<a href="https://www.worldcubeassociation.org/persons/${row.wcaId}" target="_blank" rel="noreferrer">${row.wcaId}</a>` : '-'}</td>
        <td>${row.country || '-'}</td>
        <td>${row.gender || '-'}</td>
        <td>${row.events.length ? row.events.join(', ') : '—'}</td>
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
  statusEl.className = `status status--${tone}`
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
