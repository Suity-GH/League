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

let STATS = null
let CURRENT_TAB = "trophies"

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

async function loadStats() {
  const r = await fetch("/data/stats.json")
  if (!r.ok) {
    throw new Error(`Failed to load stats.json (${r.status})`)
  }
  return await r.json()
}

function trophyClass(trophy) {
  const t = String(trophy || "").toLowerCase()

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

function buildLeagueCell(code) {
  const name = LEAGUE_NAMES[code] || code
  const icon = LEAGUE_ICONS[code]

  return `
    <div class="league-name-cell">
      ${icon ? `<img class="league-icon" src="${icon}" alt="${name} icon">` : ""}
      <span>${name}</span>
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

function buildTrophyTable(order) {
  const trophies = [
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
    head += `
      <th>
        <span class="trophy-badge ${trophyClass(t)}">${t}</span>
      </th>
    `
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
      const v = league.trophies?.[t] || 0
      rows += buildStatCell(v, league.players)
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
      const v = league.relics?.[t] || 0
      rows += buildStatCell(v, league.players)
    }

    rows += `</tr>`
  }

  return `
    <div class="tablewrap">
      <table class="stats-table stats-table-relics">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function renderBlock(title, tableHtml) {
  return `
    <section class="panel">
      <h2 class="section-title">${title}</h2>
      ${tableHtml}
    </section>
  `
}

function render() {
  const box = document.getElementById("statsContent")
  if (!box || !STATS) return

  if (CURRENT_TAB === "trophies") {
    box.innerHTML = `
      ${renderBlock("OSRS Leagues", buildTrophyTable(OSRS_ORDER))}
      ${renderBlock("RS3 Leagues", buildTrophyTable(RS3_ORDER))}
    `
  } else {
    box.innerHTML = `
      ${renderBlock("OSRS Leagues", buildRelicTable(OSRS_ORDER))}
      ${renderBlock("RS3 Leagues", buildRelicTable(RS3_ORDER))}
    `
  }
}

function showError(message) {
  const box = document.getElementById("statsContent")
  if (!box) return

  box.innerHTML = `
    <div class="result empty">
      ${message}
    </div>
  `
}

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => {
      CURRENT_TAB = btn.dataset.tab

      document.querySelectorAll("[data-tab]").forEach(b => {
        b.classList.toggle("active", b === btn)
      })

      render()
    }
  })

  const first = document.querySelector('[data-tab="trophies"]')
  if (first) first.classList.add("active")
}

async function boot() {
  try {
    STATS = await loadStats()
    wireTabs()
    render()
  } catch (err) {
    console.error(err)
    showError("Failed to load stats.json.")
  }
}

boot()
