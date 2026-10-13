/* =========================================================
   Achievements — League Archive
   Uses: common.js
   Reads: data/leagues.json, data/achievements.json
   One tab for Perfect Dragons, then one tab per "type" on the
   FIRSTS tab of the sheet (League First, Region Winner, ...).
   ========================================================= */

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQohouWkPjFzdFxk7Yl1DJrxthy-dztnkFuT_HIqveImqWGsqlM1bbiKrK5wMxPTXoxIKPDQLYm3V_L/pubhtml"

const PERFECT_INTRO = `A player is only counted if they have achieved every Dragon trophy in a category on the same account.
  The theoretical maximum includes players that are currently unverified due to name changes or account bans.
  Combined Dragons are more difficult to verify, because RS3 leagues let players transfer their Dragon trophies
  to another account. To qualify for the Perfect Combined Dragon badge an account must have every Dragon trophy.`

const S = { meta: { order: [], osrs: [], rs3: [], leagues: {} }, data: null, tabs: [], tab: "perfect", league: null, regionLeague: null, regions: [] }

/* ---------------- helpers ---------------- */

const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
const titleCase = s => String(s).replace(/\b\w/g, c => c.toUpperCase())
/* Rush -> Rushes, Trophy -> Trophies, First -> Firsts */
function plural(word) {
  if (/(s|sh|ch|x|z)$/i.test(word)) return word + "es"
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies"
  return word + "s"
}

function playerPill(p) {
  if (!p?.id) return `<span class="player-pill">${esc(p?.name || "Unknown")}</span>`
  return `<a class="player-pill" href="/player.html?id=${encodeURIComponent(p.id)}&key=${encodeURIComponent(p.key)}">${esc(p.name)}</a>`
}

function section(title, body, icon = "") {
  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">${icon ? `<img class="section-icon" src="${esc(icon)}" alt="" onerror="this.remove()">` : ""}${title}</h2>
      </div>
      ${body}
    </section>`
}

/* ---------------- perfect dragons ---------------- */

function perfectCard(variant, title, count, max) {
  count = count || 0
  const share = max ? Math.min(100, (count / max) * 100) : 0
  const more = max ? Math.max(0, max - count) : 0
  return `
    <div class="ach-badge ach-stat ach-${variant}">
      <div class="ach-emblem"><div class="ach-face">${EMBLEMS.perfect}</div></div>
      <div class="ach-text">
        <div class="ach-eyebrow">Perfect Dragon</div>
        <div class="ach-title">${title}</div>
      </div>
      <div class="ach-stat-body">
        <div class="ach-stat-num">${fmt(count)}${max ? `<small>of ${fmt(max)} possible</small>` : ""}</div>
        ${max ? `
          <div class="ach-stat-bar"><i style="width:${Math.max(2, share)}%"></i></div>
          <div class="ach-stat-note">${share.toFixed(1)}% verified (up to ${fmt(more)} more possible)</div>` : ""}
      </div>
    </div>`
}

function playerList(players) {
  return players?.length
    ? `<div class="pill-list">${players.map(playerPill).join("")}</div>`
    : empty("None listed.")
}

function renderPerfect() {
  const d = S.data
  const counts = d.counts || {}, max = d.theoretical_max || {}
  return `<div class="perfect-tab">
    <section class="section">
      <p class="note ach-intro">${PERFECT_INTRO}</p>
      <a class="gold-button" href="${SHEET_URL}" target="_blank" rel="noopener noreferrer">View full Google Sheet analysis</a>
    </section>
    <section class="section">
      <div class="ach-grid">
        ${perfectCard("combined", "Combined", counts.perfect_combined, max.perfect_combined)}
        ${perfectCard("osrs", "Old School", counts.perfect_osrs, max.perfect_osrs)}
        ${perfectCard("rs3", "RuneScape 3", counts.perfect_rs3, max.perfect_rs3)}
      </div>
    </section>` +
    section("Perfect Combined Dragons", playerList(d.perfects?.combined)) +
    section("Perfect Old School Dragons", playerList(d.perfects?.osrs)) +
    section("Perfect RuneScape 3 Dragons", empty(esc(d.perfects?.rs3_note ||
      "There are too many RS3 Dragons to list. Players will be listed once more RS3 leagues have taken place."))) + `</div>`
}

/* ---------------- firsts, by type ---------------- */

/* Every row of the FIRSTS tab, grouped as {type: {league: [rows]}} */
function groupFirsts() {
  const out = new Map()
  for (const [code, rows] of Object.entries(S.data.firsts || {})) {
    for (const row of rows || []) {
      const type = titleCase(String(row.type || "League First").trim())
      const key = type.toLowerCase()
      if (!out.has(key)) out.set(key, { label: type, leagues: {} })
      ;(out.get(key).leagues[code] ||= []).push(row)
    }
  }
  return out
}

function firstsTable(rows) {
  const hasNumber = rows.some(r => r.number != null)
  const hasDay = rows.some(r => r.day != null)
  const sorted = rows.slice().sort((a, b) =>
    (a.number ?? 1e9) - (b.number ?? 1e9) || (a.day ?? 1e9) - (b.day ?? 1e9) ||
    String(a.task || "").localeCompare(String(b.task || "")))

  // a ranked list where every row is the same achievement (Dragon Rush): name it once above the table
  const tasks = new Set(rows.map(r => String(r.task || "").trim().toLowerCase()))
  const oneTask = hasNumber && tasks.size === 1 && rows[0].task

  const head =
    (hasNumber ? `<th class="col-narrow">#</th>` : "") +
    (hasDay ? `<th class="col-narrow">Day</th>` : "") +
    (oneTask ? "" : `<th>Achievement</th>`) + `<th>Player</th>`

  const body = sorted.map(r => `
    <tr>
      ${hasNumber ? `<td class="col-narrow">${r.number != null ? `<span class="rank-pill ${r.number <= 3 ? `ach-podium-${r.number}` : ""}">${fmt(r.number)}</span>` : ""}</td>` : ""}
      ${hasDay ? `<td class="col-narrow">${r.day != null ? `<span class="day-pill">Day ${fmt(r.day)}</span>` : ""}</td>` : ""}
      ${oneTask ? "" : `<td class="col-task">${esc(r.task || "")}</td>`}
      <td class="col-players"><div class="pill-list">${(r.players || []).map(playerPill).join("") || `<span class="muted">Unknown</span>`}</div></td>
    </tr>`).join("")

  return `
    ${oneTask ? `<p class="note ach-caption">Ranked by who reached it first: <b>${esc(rows[0].task)}</b></p>` : ""}
    <div class="table-wrap">
      <table class="hs-table ach-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`
}

function leagueCodes(group) {
  const order = S.meta.order || []
  return Object.keys(group.leagues).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    return (ia === -1 ? 1e6 : ia) - (ib === -1 ? 1e6 : ib)
  })
}

/* Other types: one framed table per league */
function renderType(group) {
  return leagueCodes(group).map(code =>
    section(esc(leagueName(code)), firstsTable(group.leagues[code]), leagueIcon(code))).join("")
}

/* League Firsts: league picker on the left, the chosen league day by day on the right */
function renderTimeline(group) {
  const ranked = Object.values(group.leagues).some(rows => rows.some(r => r.number != null))
  const codes = leagueCodes(group).reverse()   // newest league first
  if (!codes.includes(S.league)) S.league = codes[0]
  const rows = group.leagues[S.league] || []

  const picker = codes.map(code => `
    <button type="button" class="league-pick ${code === S.league ? "is-active" : ""}" data-league="${esc(code)}">
      <img class="item-icon" src="${esc(leagueIcon(code))}" alt="" onerror="this.remove()">
      <span>${esc(leagueName(code))}</span>
      <small>${group.leagues[code].length}</small>
    </button>`).join("")

  const byDay = new Map()
  rows.slice()
    .sort((a, b) => (a.day ?? 1e9) - (b.day ?? 1e9) || (a.number ?? 1e9) - (b.number ?? 1e9) ||
      String(a.task || "").localeCompare(String(b.task || "")))
    .forEach(r => {
      const key = r.day ?? "none"
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(r)
    })

  // ranked lists (Dragon Rush): each line is the placing and the player; the achievement is
  // named once above when every row shares it
  const tasks = new Set(rows.map(r => String(r.task || "").trim().toLowerCase()))
  const oneTask = ranked && tasks.size === 1 && rows[0]?.task
  const rankPill = r => r.number != null
    ? `<span class="rank-pill ${r.number <= 3 ? `ach-podium-${r.number}` : ""}">${fmt(r.number)}</span>` : ""
  const line = r => ranked ? `
        <div class="tl-item tl-ranked">
          ${rankPill(r)}
          <div class="pill-list">${(r.players || []).map(playerPill).join("") || `<span class="muted">Unknown</span>`}</div>
          ${oneTask ? "" : `<span class="tl-task">${esc(r.task || "")}</span>`}
        </div>` : `
        <div class="tl-item">
          <span class="tl-task">${esc(r.task || "")}</span>
          <div class="pill-list">${(r.players || []).map(playerPill).join("") || `<span class="muted">Unknown</span>`}</div>
        </div>`

  const days = [...byDay.entries()].map(([day, items]) => `
    <div class="tl-day">
      <div class="tl-label">${day === "none" ? "No date" : `Day ${fmt(day)}`}</div>
      ${items.map(line).join("")}
    </div>`).join("")

  return `
    <div class="split">
      <div class="league-picks">${picker}</div>
      <div>
        <div class="section-head"><h2 class="section-title">
          <img class="section-icon" src="${esc(leagueIcon(S.league))}" alt="" onerror="this.remove()">${esc(leagueName(S.league))}
        </h2></div>
        <div class="tl">${days}</div>
      </div>
    </div>`
}

/* ---------------- region winners ---------------- */

/* First letter of the combo code -> region. Add a line if a league has other regions. */
const REGIONS = {
  A: "Asgarnia", D: "Desert", F: "Fremennik", K: "Kandarin", M: "Morytania",
  T: "Tirannwn", W: "Wilderness", Z: "Zeah", V: "Varlamore", N: "Anachronia",
}
const regionName = l => REGIONS[l] || l

/* The region's icon. RS3 leagues use their own icons from /icons/regions/rs3/, falling back to the
   shared /icons/regions/ ones; if neither exists it shows the letter in a circle. */
function regionIcon(letter) {
  const name = regionName(letter)
  const file = `${name.toLowerCase()}.png`
  const rs3 = isRS3(S.regionLeague)
  const sources = rs3 ? [`/icons/regions/rs3/${file}`, `/icons/regions/${file}`] : [`/icons/regions/${file}`]
  return `<span class="region-icon${rs3 ? " region-icon-rs3" : ""}" title="${esc(name)}">${iconImg(sources, { alt: name, fallbackText: letter })}</span>`
}
const regionIcons = code => `<span class="region-icons">${[...code].map(regionIcon).join("")}</span>`

const comboCode = task => [...String(task || "").toUpperCase().replace(/[^A-Z]/g, "")].sort().join("")

/* Every possible combo for the league (so missing ones show as "Not found yet"), strongest first */
function regionCombos(rows) {
  const found = new Map()
  for (const r of rows) {
    const code = comboCode(r.task)
    if (code) found.set(code, r.players?.[0] || null)
  }
  const size = Math.max(...[...found.keys()].map(c => c.length))
  const letters = [...new Set([...found.keys()].join(""))].sort()
  const all = []
  const walk = (start, picked) => {
    if (picked.length === size) return all.push(picked.join(""))
    for (let i = start; i < letters.length; i++) walk(i + 1, [...picked, letters[i]])
  }
  walk(0, [])
  const combos = all.map(code => ({ code, player: found.get(code) || null }))
  combos.sort((a, b) => (a.player?.rank ?? 1e12) - (b.player?.rank ?? 1e12) ||
    (!a.player) - (!b.player) || a.code.localeCompare(b.code))
  combos.forEach((c, i) => { c.pos = c.player ? i + 1 : null })
  return { combos, letters, size }
}

function renderRegions(group) {
  const codes = leagueCodes(group).reverse()
  if (!codes.includes(S.regionLeague)) { S.regionLeague = codes[0]; S.regions = [] }
  const { combos, letters, size } = regionCombos(group.leagues[S.regionLeague])
  const sel = S.regions.filter(l => letters.includes(l))
  const matches = c => sel.every(l => c.code.includes(l))
  const count = combos.filter(matches).length
  const exact = sel.length === size ? combos.find(c => c.code === [...sel].sort().join("")) : null

  // same league dropdown as the player profile; leagues with no region winners are greyed out
  const leagueSwitch = `
    <div class="section-head region-head">
      <h2 class="section-title">
        <img class="section-icon" src="${esc(leagueIcon(S.regionLeague))}" alt="" onerror="this.remove()">${esc(leagueName(S.regionLeague))}
      </h2>
      <div class="select" id="regionLeague"></div>
    </div>`
  S.regionCodes = codes

  const filter = `
    <div class="region-bar">
      ${letters.map(l => `
        <button type="button" class="region-pick ${sel.includes(l) ? "is-active" : ""}" data-region="${esc(l)}"
          ${!sel.includes(l) && sel.length >= size ? "disabled" : ""}>
          ${regionIcon(l)}<span>${esc(regionName(l))}</span>
        </button>`).join("")}
      <button type="button" class="region-reset" data-region-reset ${sel.length ? "" : "disabled"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.700M3 4v5h5"/></svg>
        Reset
      </button>
      <span class="region-count">${sel.length ? `${count} of ${combos.length} combos` : `${combos.length} combos`}</span>
    </div>`

  const banner = exact ? `
    <div class="region-banner">
      ${regionIcons(exact.code)}
      <div class="region-banner-text">
        <div class="combo-code">${esc(exact.code)} · ${[...exact.code].map(regionName).map(esc).join(", ")}</div>
        <div class="region-banner-name">${exact.player ? playerPill(exact.player).replace("player-pill", "region-banner-link") : "Not found yet"}</div>
      </div>
      <div class="region-banner-rank">
        <b>${exact.player?.rank != null ? fmt(exact.player.rank) : "—"}</b>
        <span>${exact.player ? `overall rank${exact.pos ? ` · #${exact.pos} of ${combos.length} combos` : ""}` : "no winner yet"}</span>
      </div>
    </div>` : ""

  const row = c => `
    <tr class="${sel.length && !matches(c) ? "is-dim" : ""} ${exact === c ? "is-hit" : ""}">
      <td class="col-pos">${c.pos ?? "–"}</td>
      <td class="col-combo">${regionIcons(c.code)}<span class="combo-code">${esc(c.code)}</span></td>
      <td>${c.player ? playerPill(c.player) : `<span class="muted">Not found yet</span>`}</td>
      <td class="col-rank">${c.player?.rank != null ? fmt(c.player.rank) : "—"}</td>
    </tr>`
  const table = rows => rows.length ? `
    <div class="table-wrap">
      <table class="hs-table ach-table region-table">
        <thead><tr><th class="col-pos">#</th><th>Combo</th><th>Player</th><th class="col-rank">Rank</th></tr></thead>
        <tbody>${rows.map(row).join("")}</tbody>
      </table>
    </div>` : ""
  const half = Math.ceil(combos.length / 2)

  return leagueSwitch + filter + banner +
    `<div class="region-cols">${table(combos.slice(0, half))}${table(combos.slice(half))}</div>`
}

/* ---------------- page ---------------- */

function render() {
  document.getElementById("tabs").innerHTML = S.tabs.map(t =>
    `<button type="button" class="tab ${t.id === S.tab ? "is-active" : ""}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join("")
  document.querySelectorAll("#tabs .tab").forEach(b => b.onclick = () => setTab(b.dataset.tab))
  const tab = S.tabs.find(t => t.id === S.tab)
  const box = document.getElementById("content")
  box.innerHTML = tab.render()

  box.querySelectorAll("[data-league]").forEach(b => b.onclick = () => { S.league = b.dataset.league; render() })
  box.querySelectorAll("[data-region]").forEach(b => b.onclick = () => {
    const l = b.dataset.region
    S.regions = S.regions.includes(l) ? S.regions.filter(x => x !== l) : [...S.regions, l]
    render()
  })
  const picker = box.querySelector("#regionLeague")
  if (picker) {
    const has = S.regionCodes || []
    const known = [...(S.meta.osrs || []), ...(S.meta.rs3 || [])]
    const item = c => ({ value: c, label: leagueName(c), icon: leagueIcon(c), disabled: !has.includes(c) })
    drawMenuSelect(picker, {
      label: "Select league",
      value: S.regionLeague,
      groups: [
        { title: "OSRS", options: (S.meta.osrs || []).map(item) },
        { title: "RS3", options: (S.meta.rs3 || []).map(item) },
        { title: "Other", options: has.filter(c => !known.includes(c)).map(item) },
      ].filter(g => g.options.length),
      onChange: code => { S.regionLeague = code; S.regions = []; render() },
    })
  }
  const reset = box.querySelector("[data-region-reset]")
  if (reset) reset.onclick = () => { S.regions = []; render() }
}

function setTab(id) {
  S.tab = S.tabs.some(t => t.id === id) ? id : S.tabs[0].id
  history.replaceState(null, "", `#${S.tab}`)
  render()
}

async function boot() {
  const [meta, data] = await Promise.all([getJSON("/data/leagues.json"), getJSON("/data/achievements.json")])
  if (!data) throw new Error("achievements.json could not be loaded")
  S.meta = setLeagueMeta(meta)
  S.data = data

  S.tabs = [{ id: "perfect", label: "Perfect Dragons", render: renderPerfect }]
  const groups = groupFirsts()
  // Rank 1 of any numbered type (e.g. Dragon Rush) is also a league first, so it joins the
  // League Firsts timeline. Nothing is added to the sheet, so the player still gets one badge.
  for (const [key, group] of groups) {
    if (key === "league first") continue
    for (const [code, rows] of Object.entries(group.leagues)) {
      for (const row of rows.filter(r => Number(r.number) === 1)) {
        if (!groups.has("league first")) groups.set("league first", { label: "League First", leagues: {} })
        const list = (groups.get("league first").leagues[code] ||= [])
        const same = list.some(r => String(r.task || "").toLowerCase() === String(row.task || "").toLowerCase())
        if (!same) list.push({ ...row, number: null, from: group.label })
      }
    }
  }

  // League Firsts first, then the other types in A-Z order
  const keys = [...groups.keys()].sort((a, b) => (a !== "league first") - (b !== "league first") || a.localeCompare(b))
  for (const key of keys) {
    const group = groups.get(key)
    const numbered = Object.values(group.leagues).some(rows => rows.some(r => r.number != null))
    const draw = key.includes("region") ? renderRegions : key === "league first" || numbered ? renderTimeline : renderType
    S.tabs.push({ id: slugify(key), label: plural(group.label), render: () => draw(group) })
  }
  setTab(location.hash.slice(1))
}

boot().catch(err => {
  console.error(err)
  document.getElementById("content").innerHTML = empty("The achievements could not be loaded.")
})
