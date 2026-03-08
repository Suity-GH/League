/* =========================================
   Global state
========================================= */

let LEADERBOARDS = null
let PLAYERS_TOP = null

const INDEX_CACHE = new Map()

let CURRENT_TAB = "osrs"
let SORT_COLUMN = "rank"
let SORT_DIR = "asc"


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

  if (h === "rs3" || h === "combined" || h === "osrs")
    return h

  return "osrs"
}

function setActiveTab(tab) {
  location.hash = "#" + tab
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
   Leaderboard rendering
========================================= */

function renderLeaderboard(tabName) {
  if (!LEADERBOARDS || !PLAYERS_TOP) return

  CURRENT_TAB = tabName

  const tab = LEADERBOARDS.tabs[tabName]
  const ids = tab.top
  const leagues = tab.leagues

  const tbody = document.getElementById("leaderboardBody")
  const thead = document.getElementById("leaderboardHead")

  if (!tbody || !thead) return

  thead.innerHTML = `
    <tr>
      <th data-sort="rank">Rank${sortIndicator("rank")}</th>
      <th data-sort="name">Player${sortIndicator("name")}</th>
      <th data-sort="total">Total${sortIndicator("total")}</th>
      ${leagues.map(c => `<th data-sort="${c}">${c}${sortIndicator(c)}</th>`).join("")}
    </tr>
  `

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

  const html = []

  for (const r of rows) {
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

      renderLeaderboard(CURRENT_TAB)
    }
  })
}


function syncTabUI(tabName) {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-tab") === tabName
    )
  })
}


/* =========================================
   Search
========================================= */

async function loadIndexBucket(bucket) {
  if (INDEX_CACHE.has(bucket))
    return INDEX_CACHE.get(bucket)

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
  const nameAlnum = String(row[1] || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

  const keyAlnum = String(row[2] || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

  if (!qAlnum) return -Infinity

  if (keyAlnum === qAlnum || nameAlnum === qAlnum)
    return 1000

  if (keyAlnum.startsWith(qAlnum) || nameAlnum.startsWith(qAlnum))
    return 800

  if (keyAlnum.includes(qAlnum) || nameAlnum.includes(qAlnum))
    return 400

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
    box.innerHTML = `
      <div class="result empty">No matches</div>
    `
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
      <a class="result"
         href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}">

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

  if (clearBtn)
    clearBtn.style.visibility = q ? "visible" : "hidden"

  if (!qAlnum) {
    renderSearchResults([], "")
    return
  }

  const bucket = bucketFor(q)
  const bucketRows = await loadIndexBucket(bucket)

  const scored = []

  for (const row of bucketRows) {
    const s = scoreRow(row, qAlnum)

    if (s > -Infinity)
      scored.push({ row, s, total: row[5] || 0 })
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

  if (input)
    input.addEventListener("input", onSearchInput)

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
