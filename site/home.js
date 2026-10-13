/* =========================================================
   Home page — League Archive
   Uses: common.js
   Reads: data/leagues.json, data/achievements.json,
          data/leaderboards.json + data/players_top.json
   ========================================================= */

const TOP_SHOWN = 10

const month = d => d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : ""

async function boot() {
  const [meta, ach, boards, top] = await Promise.all([
    getJSON("/data/leagues.json"), getJSON("/data/achievements.json"),
    getJSON("/data/leaderboards.json"), getJSON("/data/players_top.json"),
  ])
  const leagues = meta?.leagues || {}
  const order = meta?.order || Object.keys(leagues)

  // headline numbers
  const accounts = order.reduce((n, c) => n + (leagues[c]?.players || 0), 0)
  const c = ach?.counts || {}
  const perfects = (c.perfect_osrs || 0) + (c.perfect_rs3 || 0)
  const stat = (value, label) => `<div class="home-stat"><b>${value}</b><span>${label}</span></div>`
  document.getElementById("homeStats").innerHTML =
    stat(order.length, "Leagues") +
    stat(fmt(accounts), "League account names") +
    stat(fmt(perfects), "Perfect Dragons") +
    stat(fmt(c.perfect_combined || 0), "All-Dragon accounts")

  // combined top players
  const tab = boards?.tabs?.combined
  document.getElementById("homeTop").innerHTML = (tab?.top || []).slice(0, TOP_SHOWN).map((id, i) => {
    const p = top?.[id]
    if (!p) return ""
    return `<tr><td class="col-rank">${i + 1}</td>
      <td class="col-name"><a href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(p.key)}">${esc(p.name)}</a></td>
      <td class="col-strong">${fmt(p[tab.total])}</td></tr>`
  }).join("")

  // every league, newest first
  document.getElementById("homeLeagues").innerHTML = order.slice().reverse().map(code => {
    const l = leagues[code] || {}
    return `
      <a class="home-league" href="/hiscores.html?league=${encodeURIComponent(code)}&cat=league_points">
        <img src="${esc(l.icon || `/icons/${code.toLowerCase()}.png`)}" alt="" onerror="this.remove()">
        <span class="home-league-text">
          <b>${esc(l.name || code)}</b>
          <small>${l.game === "rs3" ? "RuneScape 3" : "Old School"}</small>
          ${l.start_date ? `<small>${month(l.start_date)}</small>` : ""}
        </span>
        ${l.players ? `<span class="home-league-count">${fmt(l.players)}<small>players</small></span>` : ""}
      </a>`
  }).join("")
}

boot()
