const LEAGUE_NAMES = {
  TL: "Twisted",
  TBL: "Trailblazer",
  SRL: "Shattered Relics",
  TBLR: "Trailblazer Reloaded",
  REL: "Raging Echoes",
  CATA: "Catalyst"
}

const LEAGUE_ICONS = {
  TL: "/icons/tl.png",
  TBL: "/icons/tbl.png",
  SRL: "/icons/srl.png",
  TBLR: "/icons/tblr.png",
  REL: "/icons/rel.png",
  CATA: "/icons/cata.png"
}

function fmt(n) {
  if (n === null || n === undefined) return ""
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return x.toLocaleString()
}

function playerHref(player) {
  return `/player.html?id=${encodeURIComponent(player.id)}&key=${encodeURIComponent(player.key)}`
}

function renderPlayerPill(player) {
  return `
    <a class="ach-player" href="${playerHref(player)}">
      <span class="ach-player-name">${player.name}</span>
    </a>
  `
}

function renderCountCard(badgeText, count, max, badgeClass) {
  return `
    <div class="ach-count-card statcard">
      <div class="ach-count-top">
        <span class="perfect-dragon-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="statvalue ach-count-number">${fmt(count)}</div>
      <div class="ach-count-sub">Theoretical max: ${fmt(max)}</div>
    </div>
  `
}

function renderPerfectLists(data) {
  const counts = data.counts || {}
  const theoretical = data.theoretical_max || {}

  document.getElementById("perfectCountGrid").innerHTML = [
  renderCountCard(
    "Perfect Combined Dragon",
    counts.perfect_combined || 0,
    theoretical.perfect_combined || 0,
    "perfect-combined"
  ),
  renderCountCard(
    "Perfect OSRS Dragon",
    counts.perfect_osrs || 0,
    theoretical.perfect_osrs || 0,
    "perfect-osrs"
  ),
  renderCountCard(
    "Perfect RS3 Dragon",
    counts.perfect_rs3 || 0,
    theoretical.perfect_rs3 || 0,
    "perfect-rs3"
  )
].join("")

document.getElementById("perfectTagline").innerHTML =
  'A player is only counted if they have achieved every Dragon trophy in a category on the same account. The theoretical maximum includes players that are currently unverified due to name changes or account bans. Since Twisted League had the lowest amount of Dragons (1,104) this was used as the initial maximum. Combined Dragons are more difficult to verify due to the mechanic on RS3 leagues which allows players to transfer their Dragon trophies to another account. To qualify for the Perfect Combined Dragon badge an account must have every Dragon trophy.<br><br><a class="sheet-link-btn" href="https://docs.google.com/spreadsheets/d/e/2PACX-1vQohouWkPjFzdFxk7Yl1DJrxthy-dztnkFuT_HIqveImqWGsqlM1bbiKrK5wMxPTXoxIKPDQLYm3V_L/pubhtml" target="_blank" rel="noopener noreferrer">View full Google Sheet analysis</a>'

  const combined = Array.isArray(data.perfects?.combined) ? data.perfects.combined : []
  const osrs = Array.isArray(data.perfects?.osrs) ? data.perfects.osrs : []

  document.getElementById("perfectCombinedList").innerHTML = combined.length
    ? combined.map(p => renderPlayerPill(p)).join("")
    : `<div class="ach-note">None listed.</div>`

  document.getElementById("perfectOsrsList").innerHTML = osrs.length
    ? osrs.map(p => renderPlayerPill(p)).join("")
    : `<div class="ach-note">None listed.</div>`

  document.getElementById("perfectRs3Note").textContent =
    data.perfects?.rs3_note || "There are too many RS3 Dragons to list (6,407). Players will be listed once more RS3 Leagues have taken place and the list has reduced in size."
}

function renderFirstTableRow(entry) {
  const dayNum = Number(entry.day)
  const hasDay = Number.isFinite(dayNum)

  const dayHtml = hasDay
    ? `<span class="ach-first-day-pill">Day ${fmt(dayNum)}</span>`
    : `<span class="ach-first-day-pill">—</span>`

  const firstHtml = `<span class="trophy-badge trophy-first">${entry.task}</span>`

  const players = Array.isArray(entry.players) ? entry.players : []
  const playerHtml = players.length
    ? players.map(p => renderPlayerPill(p)).join("")
    : `<span class="ach-note">Unknown</span>`

  return `
    <tr>
      <td class="ach-first-day-cell">${dayHtml}</td>
      <td class="ach-first-name-cell">${firstHtml}</td>
      <td class="ach-first-player-cell">${playerHtml}</td>
    </tr>
  `
}

function renderFirstLeagueSection(code, rows) {
  const leagueName = LEAGUE_NAMES[code] || code
  const leagueIcon = LEAGUE_ICONS[code] || ""

  const sortedRows = [...rows].sort((a, b) => {
    const ad = Number.isFinite(Number(a.day)) ? Number(a.day) : Number.MAX_SAFE_INTEGER
    const bd = Number.isFinite(Number(b.day)) ? Number(b.day) : Number.MAX_SAFE_INTEGER
    if (ad !== bd) return ad - bd

    const at = String(a.task || "").toLowerCase()
    const bt = String(b.task || "").toLowerCase()
    if (at < bt) return -1
    if (at > bt) return 1
    return 0
  })

  return `
    <div class="ach-page-subsection">
      <h3 class="ach-page-subtitle ach-page-league-header">
        ${leagueIcon ? `<img class="league-icon" src="${leagueIcon}" alt="${leagueName} icon">` : ""}
        <span>${leagueName}</span>
      </h3>

      <div class="tablewrap ach-first-tablewrap">
        <table class="ach-first-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>First</th>
              <th>Player</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRows.map(renderFirstTableRow).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function renderFirsts(data) {
  const wrap = document.getElementById("firstsByLeague")
  const firsts = data.firsts || {}
  const order = ["TL", "TBL", "SRL", "TBLR", "REL"]

  wrap.innerHTML = order
    .filter(code => Array.isArray(firsts[code]) && firsts[code].length)
    .map(code => renderFirstLeagueSection(code, firsts[code]))
    .join("")
}

async function loadAchievements() {
  const res = await fetch("/data/achievements.json")
  if (!res.ok) throw new Error("Unable to load achievements.")
  return res.json()
}

async function init() {
  const data = await loadAchievements()
  renderPerfectLists(data)
  renderFirsts(data)
}

init().catch(err => {
  console.error(err)
})
