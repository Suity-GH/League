/* =========================================
   Global state
========================================= */

let LEADERBOARDS = null
let PLAYERS_TOP = null

const INDEX_CACHE = new Map()

let CURRENT_TAB = "osrs"
let SORT_COLUMN = "rank"
let SORT_DIR = "asc"

const PAGE_SIZE = 100
let CURRENT_PAGE = 1

const LEAGUE_ICONS = {
  TL: "/icons/tl.png",
  TBL: "/icons/tbl.png",
  SRL: "/icons/srl.png",
  TBLR: "/icons/tblr.png",
  REL: "/icons/rel.png",
  CATA: "/icons/cata.png"
}


/* =========================================
   Helpers
========================================= */

function norm(s) {
  return (s || "").toLowerCase().replace(/_/g, " ").trim()
}

function bucketFor(query) {
  const s = norm(query).replace(/[^a-z0-9]/g, "")

  if (s.length === 0) return "__"
  if (s.length === 1) return s[0] + "_"

  return s.slice(0, 2)
}

function fmt(n) {
  if (n === null || n === undefined) return ""
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return x.toLocaleString()
}

function trophyClass(trophy) {
  if (!trophy) return ""

  const t = String(trophy).toLowerCase()

  if (t === "top 100") return "trophy-top100"
  if (t === "true dragon") return "trophy-truedragon"
  if (t === "dragon") return "trophy-dragon"
  if (t === "rune") return "trophy-rune"
  if (t === "adamant") return "trophy-adamant"
  if (t === "mithril") return "trophy-mithril"
  if (t === "steel") return "trophy-steel"
  if (t === "iron") return "trophy-iron"
  if (t === "bronze") return "trophy-bronze"

  return ""
}

function getActiveTab() {
  const h = (location.hash || "").replace("#", "")
  if (h === "rs3" || h === "combined" || h === "osrs") return h
  return "osrs"
}

function setActiveTab(tab) {
  location.hash = "#" + tab
}

function pageCount(totalRows) {
  return Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
}


/* =========================================
   Load leaderboard data
========================================= */

async function loadCoreData() {
  const [lb, pt] = await Promise.all([
    fetch("/data/leaderboards.json").then(r => r.json()),
    fetch("/data/players_top.json").then(r => r.json())
  ])

  LEADERBOARDS = lb
  PLAYERS_TOP = pt
}


/* =========================================
   Sorting
========================================= */

function compareValues(a, b, dir) {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b)) * dir
  }
  return ((Number(a) || 0) - (Number(b) || 0)) * dir
}

function sortRows(rows) {
  const dir = SORT_DIR === "asc" ? 1 : -1

  rows.sort((a, b) => {
    const primary = compareValues(a[SORT_COLUMN], b[SORT_COLUMN], dir)
    if (primary !== 0) return primary
    return compareValues(a.rank, b.rank, 1)
  })
}

function sortIndicator(col) {
  if (SORT_COLUMN !== col) return ""
  return SORT_DIR === "asc" ? " ▲" : " ▼"
}


/* =========================================
   Pager
========================================= */

function buildPageList(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
  }

  const sorted = [...pages]
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const out = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const prev = sorted[i - 1]

    if (i > 0 && p - prev > 1) out.push("...")
    out.push(p)
  }

  return out
}

function goToPage(page) {
  const totalPages = pageCount(getCurrentRows().length)
  const nextPage = Math.max(1, Math.min(totalPages, page))

  if (nextPage === CURRENT_PAGE) return

  CURRENT_PAGE = nextPage
  renderLeaderboard(CURRENT_TAB)
  window.scrollTo({ top: 0, behavior: "instant" })
}

function renderPager(totalRows) {
  const box = document.getElementById("leaderboardPager")
  if (!box) return

  const totalPages = pageCount(totalRows)

  if (totalRows <= PAGE_SIZE) {
    box.innerHTML = ""
    return
  }

  const items = buildPageList(totalPages, CURRENT_PAGE)

  box.innerHTML = `
    <div class="leaderboard-pager-shell">
      <button
        type="button"
        class="leaderboard-page-btn leaderboard-page-arrow"
        id="pagerPrev"
        ${CURRENT_PAGE <= 1 ? "disabled" : ""}
        aria-label="Previous page"
      >
        ‹
      </button>

      ${items.map(item => {
        if (item === "...") {
          return `<span class="leaderboard-page-ellipsis">...</span>`
        }

        const active = item === CURRENT_PAGE ? " is-active" : ""

        return `
          <button
            type="button"
            class="leaderboard-page-btn${active}"
            data-page="${item}"
            aria-label="Page ${item}"
            ${item === CURRENT_PAGE ? 'aria-current="page"' : ""}
          >
            ${item}
          </button>
        `
      }).join("")}

      <button
        type="button"
        class="leaderboard-page-btn leaderboard-page-arrow"
        id="pagerNext"
        ${CURRENT_PAGE >= totalPages ? "disabled" : ""}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  `

  const prev = document.getElementById("pagerPrev")
  const next = document.getElementById("pagerNext")

  if (prev) prev.onclick = () => goToPage(CURRENT_PAGE - 1)
  if (next) next.onclick = () => goToPage(CURRENT_PAGE + 1)

  box.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = () => {
      const page = Number(btn.getAttribute("data-page"))
      if (Number.isFinite(page)) goToPage(page)
    }
  })
}


/* =========================================
   Leaderboard rows
========================================= */

function getCurrentRows() {
  if (!LEADERBOARDS || !PLAYERS_TOP) return []

  const tab = LEADERBOARDS.tabs[CURRENT_TAB]
  const ids = tab.top
  const leagues = tab.leagues

  const rows = []

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const p = PLAYERS_TOP[id]
    if (!p) continue

    const total = p[tab.total] ?? 0

    const row = {
      id,
      name: p.name,
      rank: i + 1,
      total,
      player: p
    }

    for (const code of leagues) {
      const arr = p.leagues?.[code]
      row[code] = arr ? arr[0] : -1
    }

    rows.push(row)
  }

  sortRows(rows)
  return rows
}

function renderLeagueHeaderCell(code) {
  const icon = LEAGUE_ICONS[code]

  return `
    <th data-sort="${code}">
      <div class="leaderboard-head-league">
        <span class="leaderboard-head-side leaderboard-head-side-left">
          ${icon ? `<img class="league-icon leaderboard-head-icon" src="${icon}" alt="${code} icon">` : ""}
        </span>
        <span class="leaderboard-head-code">${code}</span>
        <span class="leaderboard-head-side leaderboard-head-side-right sort-indicator">${sortIndicator(code)}</span>
      </div>
    </th>
  `
}


/* =========================================
   Leaderboard rendering
========================================= */

function renderLeaderboard(tabName) {
  if (!LEADERBOARDS || !PLAYERS_TOP) return

  CURRENT_TAB = tabName

  const tab = LEADERBOARDS.tabs[tabName]
  const leagues = tab.leagues

  const tbody = document.getElementById("leaderboardBody")
  const thead = document.getElementById("leaderboardHead")

  if (!tbody || !thead) return

  thead.innerHTML = `
    <tr>
      <th data-sort="rank">Rank${sortIndicator("rank")}</th>
      <th data-sort="name">Player${sortIndicator("name")}</th>
      <th data-sort="total">Total${sortIndicator("total")}</th>
      ${leagues.map(renderLeagueHeaderCell).join("")}
    </tr>
  `

  const rows = getCurrentRows()
  const totalRows = rows.length
  const totalPages = pageCount(totalRows)

  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1

  const startIdx = (CURRENT_PAGE - 1) * PAGE_SIZE
  const endIdx = startIdx + PAGE_SIZE
  const pageRows = rows.slice(startIdx, endIdx)

  const html = []

  for (const r of pageRows) {
    const p = r.player

    const cols = leagues.map(code => {
      const arr = p.leagues?.[code]
      if (!arr) return "<td></td>"

      const pts = arr[0]
      const trophy = arr[2]
      const cls = trophyClass(trophy)

      return `
        <td>
          <span class="trophy-badge ${cls}">${fmt(pts)}</span>
        </td>
      `
    }).join("")

    html.push(`
      <tr>
        <td>${r.rank}</td>
        <td>
          <a href="/player.html?id=${encodeURIComponent(r.id)}&key=${encodeURIComponent(p.key)}">
            ${p.name}
          </a>
        </td>
        <td>${fmt(r.total)}</td>
        ${cols}
      </tr>
    `)
  }

  tbody.innerHTML = html.join("")
  renderPager(totalRows)

  thead.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer"

    th.onclick = () => {
      const col = th.dataset.sort

      if (SORT_COLUMN === col) {
        SORT_DIR = SORT_DIR === "asc" ? "desc" : "asc"
      } else {
        SORT_COLUMN = col
        SORT_DIR = col === "name" ? "asc" : "desc"
      }

      CURRENT_PAGE = 1
      renderLeaderboard(CURRENT_TAB)
    }
  })
}

function syncTabUI(tabName) {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName)
  })
}


/* =========================================
   Search
========================================= */

async function loadIndexBucket(bucket) {
  if (INDEX_CACHE.has(bucket)) return INDEX_CACHE.get(bucket)

  const res = await fetch(`/data/index/${bucket}.json`)

  if (!res.ok) {
    INDEX_CACHE.set(bucket, [])
    return []
  }

  const data = await res.json()
  INDEX_CACHE.set(bucket, data)
  return data
}

/*
row format:
[id, name, key, osrs_total, rs3_total, combined_total]
*/

function scoreRow(row, qAlnum) {
  const nameAlnum = String(row[1] || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const keyAlnum = String(row[2] || "").toLowerCase().replace(/[^a-z0-9]/g, "")

  if (!qAlnum) return -Infinity
  if (keyAlnum === qAlnum || nameAlnum === qAlnum) return 1000
  if (keyAlnum.startsWith(qAlnum) || nameAlnum.startsWith(qAlnum)) return 800
  if (keyAlnum.includes(qAlnum) || nameAlnum.includes(qAlnum)) return 400

  return -Infinity
}

function renderSearchResults(results, q) {
  const box = document.getElementById("searchResults")
  if (!box) return

  if (!q) {
    box.innerHTML = ""
    return
  }

  if (!results.length) {
    box.innerHTML = `<div class="result empty">No matches</div>`
    return
  }

  box.innerHTML = results.map(row => {
    const id = row[0]
    const name = row[1]
    const key = row[2]
    const osrs = row[3]
    const rs3 = row[4]
    const combined = row[5]

    return `
      <a class="result" href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}">
        <div class="name">${name}</div>
        <div class="meta">
          <span>OSRS: ${fmt(osrs)}</span>
          <span>RS3: ${fmt(rs3)}</span>
          <span>Total: ${fmt(combined)}</span>
        </div>
      </a>
    `
  }).join("")
}


/* =========================================
   Debounce
========================================= */

function debounce(fn, ms = 120) {
  let t

  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

const onSearchInput = debounce(async () => {
  const input = document.getElementById("search")
  const clearBtn = document.getElementById("clear")

  if (!input) return

  const raw = input.value
  const q = norm(raw)
  const qAlnum = q.replace(/[^a-z0-9]/g, "")

  if (clearBtn) clearBtn.style.visibility = q ? "visible" : "hidden"

  if (!qAlnum) {
    renderSearchResults([], "")
    return
  }

  const bucket = bucketFor(q)
  const bucketRows = await loadIndexBucket(bucket)

  const scored = []

  for (const row of bucketRows) {
    const s = scoreRow(row, qAlnum)
    if (s > -Infinity) scored.push({ row, s, total: row[5] || 0 })
  }

  scored.sort((a, b) =>
    (b.s - a.s) ||
    (b.total - a.total) ||
    String(a.row[2]).localeCompare(String(b.row[2]))
  )

  const top = scored.slice(0, 20).map(x => x.row)
  renderSearchResults(top, q)
}, 120)

function wireSearchUI() {
  const input = document.getElementById("search")
  const clearBtn = document.getElementById("clear")

  if (input) input.addEventListener("input", onSearchInput)

  if (clearBtn) {
    clearBtn.style.visibility = "hidden"

    clearBtn.addEventListener("click", () => {
      if (!input) return

      input.value = ""
      clearBtn.style.visibility = "hidden"
      renderSearchResults([], "")
      input.focus()
    })
  }
}


/* =========================================
   Tabs
========================================= */

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab")
      if (!tab) return
      CURRENT_PAGE = 1
      setActiveTab(tab)
    })
  })

  window.addEventListener("hashchange", () => {
    const tab = getActiveTab()
    syncTabUI(tab)
    renderLeaderboard(tab)
  })
}


/* =========================================
   Boot
========================================= */

async function boot() {
  await loadCoreData()

  wireTabs()
  wireSearchUI()

  const tab = getActiveTab()
  syncTabUI(tab)
  renderLeaderboard(tab)
}

boot()
