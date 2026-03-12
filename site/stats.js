const LEAGUE_NAMES = {
  TL: "Twisted",
  TBL: "Trailblazer",
  SRL: "Shattered Relics",
  TBLR: "Trailblazer Reloaded",
  REL: "Raging Echoes",
  CATA: "Cataclysm"
}

const LEAGUE_ICONS = {
  TL: "/icons/tl.png",
  TBL: "/icons/tbl.png",
  SRL: "/icons/srl.png",
  TBLR: "/icons/tblr.png",
  REL: "/icons/rel.png",
  CATA: "/icons/cata.png"
}

const OSRS_ORDER = ["TL", "TBL", "SRL", "TBLR", "REL"]
const RS3_ORDER = ["CATA"]

const TASK_OSRS = ["SRL", "TBLR", "REL"]
const TASK_RS3 = ["CATA"]

let STATS = null
let TASKS = null
let CURRENT_TAB = "trophies"

let TASK_SORT_COLUMN = "task"
let TASK_SORT_DIR = "asc"

function fmt(n) {
  return Number(n || 0).toLocaleString()
}

function trimZeros(s) {
  return s.replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")
}

function pct(v, total) {
  if (!total || !v) return ""
  const p = (v / total) * 100

  if (p >= 10) return trimZeros(p.toFixed(1)) + "%"
  if (p >= 1) return trimZeros(p.toFixed(2)) + "%"
  return trimZeros(p.toFixed(3)) + "%"
}

function pctValue(v) {
  if (v === null || v === undefined) return ""
  return String(v)
}

function parsePctString(v) {
  if (v === null || v === undefined || v === "") return -1

  const s = String(v).trim()
  if (s.startsWith("<")) {
    const n = parseFloat(s.slice(1))
    return Number.isFinite(n) ? n / 2 : -1
  }

  const n = parseFloat(s.replace("%", ""))
  return Number.isFinite(n) ? n : -1
}

async function loadStats() {
  const r = await fetch("/data/stats.json")
  if (!r.ok) throw new Error("stats.json failed")
  return await r.json()
}

async function loadTasks() {
  const r = await fetch("/data/tasks.json")
  if (!r.ok) throw new Error("tasks.json failed")
  return await r.json()
}

function trophyClass(t) {
  const s = String(t || "").toLowerCase()

  if (s === "cap") return "trophy-cap"
  if (s === "top 100") return "trophy-top100"
  if (s === "true dragon") return "trophy-truedragon"
  if (s === "dragon") return "trophy-dragon"
  if (s === "rune") return "trophy-rune"
  if (s === "adamant") return "trophy-adamant"
  if (s === "mithril") return "trophy-mithril"
  if (s === "steel") return "trophy-steel"
  if (s === "iron") return "trophy-iron"
  if (s === "bronze") return "trophy-bronze"

  return ""
}

function regionIcon(region) {
  const r = String(region || "").toLowerCase()

  if (r === "karamja") return "/icons/regions/karamja.png"
  if (r === "tirannwn") return "/icons/regions/tirannwn.png"
  if (r === "fremennik") return "/icons/regions/fremennik.png"
  if (r === "morytania") return "/icons/regions/morytania.png"
  if (r === "desert") return "/icons/regions/desert.png"
  if (r === "kandarin") return "/icons/regions/kandarin.png"
  if (r === "asgarnia") return "/icons/regions/asgarnia.png"
  if (r === "misthalin") return "/icons/regions/misthalin.png"
  if (r === "zeah") return "/icons/regions/zeah.png"
  if (r === "varlamore") return "/icons/regions/varlamore.png"
  if (r === "wilderness") return "/icons/regions/wilderness.png"
  if (r === "global") return "/icons/regions/global.png"

  return "/icons/regions/global.png"
}

function buildLeagueCell(code) {
  const name = LEAGUE_NAMES[code] || code
  const icon = LEAGUE_ICONS[code]

  return `
    <div class="league-name-cell">
      ${icon ? `<img class="league-icon" src="${icon}" alt="">` : ""}
      <span>${name}</span>
    </div>
  `
}

function buildLeagueShortCell(code) {
  const icon = LEAGUE_ICONS[code]

  return `
    <div class="league-name-cell">
      ${icon ? `<img class="league-icon" src="${icon}" alt="">` : ""}
      <span>${code}</span>
    </div>
  `
}

function buildStatCell(v, total) {
  if (!v) return `<td></td>`

  return `
    <td>
      <span class="stats-value">${fmt(v)}</span>
      <span class="stats-pct">${pct(v, total)}</span>
    </td>
  `
}

function buildThreeLineTrophyCell(trophy, league) {
  const count = league.trophies?.[trophy] || 0
  const points = league.trophy_points?.[trophy] || 0

  let percent = pct(count, league.players)
  if (!count) percent = "0%"

  if (!count && !points) return `<td></td>`

  return `
    <td>
      <span class="stats-value">${fmt(count)}</span>
      <span class="stats-pct">${points ? fmt(points) + " pts" : ""}</span>
      <span class="stats-pct">${percent}</span>
    </td>
  `
}

function buildTrophyStatCell(trophy, league) {
  if (
    trophy === "Cap" ||
    trophy === "Top 100" ||
    trophy === "True Dragon" ||
    trophy === "Dragon"
  ) {
    return buildThreeLineTrophyCell(trophy, league)
  }

  const count = league.trophies?.[trophy] || 0
  return buildStatCell(count, league.players)
}

function buildTrophyTable(order) {
  const trophies = [
    "Cap",
    "Top 100",
    "True Dragon",
    "Dragon",
    "Rune",
    "Adamant",
    "Mithril",
    "Steel",
    "Iron",
    "Bronze"
  ]

  let head = `<tr><th>League</th><th>Players</th>`

  for (const t of trophies) {
    head += `<th><span class="trophy-badge ${trophyClass(t)}">${t}</span></th>`
  }

  head += `</tr>`

  let rows = ""

  for (const code of order) {
    const league = STATS.leagues?.[code]
    if (!league) continue

    rows += `<tr>`
    rows += `<td>${buildLeagueCell(code)}</td>`
    rows += `<td><span class="stats-value">${fmt(league.players)}</span></td>`

    for (const t of trophies) {
      rows += buildTrophyStatCell(t, league)
    }

    rows += `</tr>`
  }

  return `
    <div class="tablewrap">
      <table class="stats-table">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function buildRelicTable(order) {
  const tiers = ["T8", "T7", "T6", "T5", "T4", "T3", "T2"]

  let head = `<tr><th>League</th><th>Players</th>`

  for (const t of tiers) {
    head += `<th>${t}</th>`
  }

  head += `</tr>`

  let rows = ""

  for (const code of order) {
    const league = STATS.leagues?.[code]
    if (!league) continue

    rows += `<tr>`
    rows += `<td>${buildLeagueCell(code)}</td>`
    rows += `<td><span class="stats-value">${fmt(league.players)}</span></td>`

    for (const t of tiers) {
      rows += buildStatCell(league.relics?.[t], league.players)
    }

    rows += `</tr>`
  }

  return `
    <div class="tablewrap">
      <table class="stats-table">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function sortIndicator(col) {
  if (TASK_SORT_COLUMN !== col) return ""
  return TASK_SORT_DIR === "asc" ? " ▲" : " ▼"
}

function sortedTaskRows(rows) {
  const out = [...(rows || [])]

  out.sort((a, b) => {
    let av, bv

    if (TASK_SORT_COLUMN === "task" || TASK_SORT_COLUMN === "region") {
      av = String(a[TASK_SORT_COLUMN] || "").toLowerCase()
      bv = String(b[TASK_SORT_COLUMN] || "").toLowerCase()

      if (av < bv) return TASK_SORT_DIR === "asc" ? -1 : 1
      if (av > bv) return TASK_SORT_DIR === "asc" ? 1 : -1
      return 0
    }

    av = parsePctString(a[TASK_SORT_COLUMN])
    bv = parsePctString(b[TASK_SORT_COLUMN])

    if (av < bv) return TASK_SORT_DIR === "asc" ? -1 : 1
    if (av > bv) return TASK_SORT_DIR === "asc" ? 1 : -1

    const at = String(a.task || "").toLowerCase()
    const bt = String(b.task || "").toLowerCase()
    if (at < bt) return -1
    if (at > bt) return 1
    return 0
  })

  return out
}

function buildTasksTable(rows, leagues) {
  const sortedRows = sortedTaskRows(rows)

  let head = `<tr>`

  head += `
    <th data-task-sort="task">
      <div class="task-head-cell">
        <span>Task</span>
        <span class="sort-indicator">${sortIndicator("task")}</span>
      </div>
    </th>
  `

  head += `
    <th data-task-sort="region">
      <div class="task-head-cell">
        <span>Region</span>
        <span class="sort-indicator">${sortIndicator("region")}</span>
      </div>
    </th>
  `

  for (const code of leagues) {
    head += `
      <th data-task-sort="${code}">
        <div class="task-head-cell task-head-league">
          ${LEAGUE_ICONS[code] ? `<img class="league-icon" src="${LEAGUE_ICONS[code]}" alt="">` : ""}
          <span>${code}</span>
          <span class="sort-indicator">${sortIndicator(code)}</span>
        </div>
      </th>
    `
  }

  head += `</tr>`

  let body = ""

  for (const row of sortedRows) {
    body += `<tr>`

    body += `
      <td>
        <div class="task-cell">
          ${row.icon ? `<img class="task-icon" src="${row.icon}" alt="">` : ""}
          <span>${row.task || ""}</span>
        </div>
      </td>
    `

    body += `
      <td>
        <div class="task-cell">
          <img class="task-icon" src="${regionIcon(row.region)}" alt="">
          <span>${row.region || ""}</span>
        </div>
      </td>
    `

    for (const code of leagues) {
      const v = row[code]

      body += `
        <td class="task-pct-cell">
          <span class="stats-value">${pctValue(v)}</span>
        </td>
      `
    }

    body += `</tr>`
  }

  return `
    <div class="tablewrap">
      <table class="stats-table stats-table-tasks">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function bindTaskSortHandlers() {
  document.querySelectorAll("th[data-task-sort]").forEach(th => {
    th.style.cursor = "pointer"

    th.onclick = () => {
      const col = th.dataset.taskSort

      if (TASK_SORT_COLUMN === col) {
        TASK_SORT_DIR = TASK_SORT_DIR === "asc" ? "desc" : "asc"
      } else {
        TASK_SORT_COLUMN = col
        TASK_SORT_DIR = col === "task" || col === "region" ? "asc" : "desc"
      }

      render()
    }
  })
}

function render() {
  const box = document.getElementById("statsContent")
  if (!box) return

  if (CURRENT_TAB === "trophies") {
    box.innerHTML =
      buildTrophyTable(OSRS_ORDER) +
      buildTrophyTable(RS3_ORDER)
    return
  }

  if (CURRENT_TAB === "relics") {
    box.innerHTML = buildRelicTable(OSRS_ORDER)
    return
  }

  if (CURRENT_TAB === "tasks") {
    box.innerHTML =
      buildTasksTable(TASKS?.osrs || [], TASK_OSRS) +
      buildTasksTable(TASKS?.rs3 || [], TASK_RS3)

    bindTaskSortHandlers()
  }
}

function setTab(tab) {
  CURRENT_TAB = tab

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab)
  })

  render()
}

async function init() {
  STATS = await loadStats()
  TASKS = await loadTasks()

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => setTab(btn.dataset.tab)
  })

  render()
}

init()
