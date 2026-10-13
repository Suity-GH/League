/* =========================================================
   Hiscores — League Archive
   Uses: common.js
   Reads: data/leagues.json, data/hiscores/index.json,
          data/hiscores/<CODE>/<list>.json   (one league's list)
          data/leaderboards.json + data/players_top.json   (All leagues)
   Address: hiscores.html?league=DPL&cat=attack&page=2
   ========================================================= */

const PAGE_SIZE = 25
const ALL = "ALL"
const TOTALS = [
  { slug: "osrs", label: "OSRS" },
  { slug: "rs3", label: "RS3" },
  { slug: "combined", label: "Combined" },
]
const LP = "league_points"
// League Points icon, used for every league in both games (and for the All Leagues totals)
const LP_ICONS = ["/icons/osrs/lp.svg", "/icons/osrs/lp.png"]

/* Sidebar order for skills (both games); anything else sorts after these, A-Z */
const SKILL_ORDER = [
  "overall", "attack", "defence", "strength", "hitpoints", "ranged", "prayer", "magic", "cooking",
  "woodcutting", "fletching", "fishing", "firemaking", "crafting", "smithing", "mining", "herblore",
  "agility", "thieving", "slayer", "farming", "runecraft", "hunter", "construction", "summoning",
  "dungeoneering", "divination", "invention", "archaeology", "necromancy", "sailing",
]

const S = {
  meta: { order: [], osrs: [], rs3: [], leagues: {} },
  index: {},              // {CODE: [{slug, label, type, count}]}
  skills: [], activities: [],   // the fixed sidebar lists: [{slug, label}]
  league: ALL,
  cat: LP,                // the list last chosen for a single league
  total: "osrs",          // the board last chosen for All leagues
  page: 1,
  find: "",
  rows: [], columns: [], type: "",
}

/* ---------------- helpers ---------------- */

const boardName = code => code === ALL ? "All Leagues" : leagueName(code)
const gameOf = code => isRS3(code) ? "rs3" : "osrs"

function playerLink(id, name) {
  if (!id) return esc(name)
  return `<a href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(norm(name))}">${esc(name)}</a>`
}

/* Does the selected league have this list? */
function has(slug, league = S.league) {
  if (league === ALL) return TOTALS.some(t => t.slug === slug)
  return (S.index[league] || []).some(c => c.slug === slug)
}

function labelFor(slug) {
  const total = TOTALS.find(t => t.slug === slug)
  if (total) return `${total.label} Total`
  if (slug === LP) return "League Points"
  return [...S.skills, ...S.activities].find(c => c.slug === slug)?.label || labelFromSlug(slug)
}

/* The list actually on screen */
const current = () => S.league === ALL ? S.total : S.cat

/* ---------------- league dropdown ---------------- */

function drawLeagueSelect() {
  const item = c => ({ value: c, label: leagueName(c), icon: leagueIcon(c), disabled: !has(LP, c) })
  const known = [...(S.meta.osrs || []), ...(S.meta.rs3 || [])]
  drawMenuSelect(document.getElementById("leagueSelect"), {
    label: "Select league",
    value: S.league,
    groups: [
      { title: "", options: [{ value: ALL, label: "All Leagues" }] },
      { title: "OSRS", options: (S.meta.osrs || []).map(item) },
      { title: "RS3", options: (S.meta.rs3 || []).map(item) },
      { title: "Other", options: Object.keys(S.index).filter(c => !known.includes(c)).map(item) },
    ].filter(g => g.options.length),
    onChange: setLeague,
  })
}

/* ---------------- sidebar ---------------- */

function sideGroups() {
  const first = S.league === ALL
    ? { title: "Totals", items: TOTALS.map(t => ({ slug: t.slug, label: t.label })) }
    : { title: "League", items: [{ slug: LP, label: "League Points" }] }
  return [
    first,
    { title: "Skills", items: S.skills },
    { title: "Bosses & Activities", items: S.activities },
  ].filter(g => g.items.length)
}

/* Where a list's icon can be: the selected league's game first, then the other game's folder
   (so an icon saved in one folder serves both games). League Points and the All Leagues
   totals share the League Points icon. */
function iconSources(slug) {
  if (slug === LP || TOTALS.some(t => t.slug === slug)) return LP_ICONS
  const game = S.league === ALL ? "osrs" : gameOf(S.league)
  const other = game === "osrs" ? "rs3" : "osrs"
  return [`/icons/${game}/${slug}.png`, `/icons/${other}/${slug}.png`]
}

/* The icon for a list, used in the sidebar and beside the title */
const sideIcon = slug => iconImg(iconSources(slug))

function drawSidebar() {
  const cur = current()
  document.getElementById("sidebar").innerHTML = sideGroups().map(g => `
    <h3 class="hs-side-title">${esc(g.title)}</h3>
    ${g.items.map(c => `
      <button type="button" class="hs-side-item ${c.slug === cur ? "is-active" : ""}" data-cat="${esc(c.slug)}"
        ${has(c.slug) ? "" : "disabled"}><span class="hs-side-icon">${sideIcon(c.slug)}</span><span>${esc(c.label)}</span></button>`).join("")}`).join("")
  document.querySelectorAll("#sidebar [data-cat]").forEach(b => b.onclick = () => setCat(b.dataset.cat))

  // phones: the same lists as a dropdown instead of a sidebar
  const el = document.getElementById("listSelect")
  el.innerHTML = `
    <div class="select-text">
      <span class="select-label">Select list</span>
      <span class="select-value">${esc(labelFor(cur))}</span>
    </div>
    <span class="select-chevron">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </span>
    <select aria-label="Select list">
      ${sideGroups().map(g => `
        <optgroup label="${esc(g.title)}">
          ${g.items.map(c => `<option value="${esc(c.slug)}" ${c.slug === cur ? "selected" : ""} ${has(c.slug) ? "" : "disabled"}>${esc(c.label)}</option>`).join("")}
        </optgroup>`).join("")}
    </select>`
  el.querySelector("select").onchange = e => setCat(e.target.value)
}

/* ---------------- title ---------------- */

function drawTitle() {
  const cur = current()
  document.getElementById("title").innerHTML = `
    <div class="hs-title-league">
      ${S.league === ALL ? "" : `<img src="${esc(leagueIcon(S.league))}" alt="" onerror="this.remove()">`}
      <span>${esc(boardName(S.league))}</span>
    </div>
    <h2 class="hs-title-list">
      ${sideIcon(cur)}
      <span>${esc(labelFor(cur))}</span>
    </h2>`
  document.title = `${labelFor(cur)} · ${boardName(S.league)} | League Archive`
}

/* ---------------- loading a list ---------------- */

/* Every list ends up as rows of plain objects, so the table and the search treat them alike */
async function loadRows() {
  if (S.league === ALL) {
    const [boards, top] = await Promise.all([getJSON("/data/leaderboards.json"), getJSON("/data/players_top.json")])
    const tab = boards?.tabs?.[S.total]
    S.type = "total"
    S.columns = tab?.leagues || []
    S.rows = (tab?.top || []).map((id, i) => {
      const p = top?.[id]
      return p && { rank: p[`${S.total}_rank`] ?? i + 1, id, name: p.name, total: p[tab.total], leagues: p.leagues || {} }
    }).filter(Boolean)
    return
  }
  const data = await getJSON(`/data/hiscores/${S.league}/${S.cat}.json`)
  S.type = data?.type || ""
  const cols = data?.columns || []
  S.rows = (data?.rows || []).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])))
  S.columns = cols
}

/* ---------------- table ---------------- */

function drawTable() {
  const box = document.getElementById("content")
  const note = document.getElementById("hsNote")
  if (!S.rows.length) {
    box.innerHTML = ""
    note.textContent = "There is nothing in this list yet."
    note.classList.remove("hidden")
    document.getElementById("pager").innerHTML = ""
    return
  }

  const q = norm(S.find)
  const matches = q ? S.rows.map((r, i) => norm(r.name).includes(q) ? i : -1).filter(i => i >= 0) : []
  const exact = q ? S.rows.findIndex(r => norm(r.name) === q) : -1
  note.classList.toggle("hidden", !q)
  if (q) {
    note.textContent = matches.length
      ? `${fmt(matches.length)} player${matches.length === 1 ? "" : "s"} matching "${S.find}" in this list.`
      : `No player matching "${S.find}" in this list.`
  }

  const pages = Math.ceil(S.rows.length / PAGE_SIZE)
  S.page = Math.min(Math.max(1, S.page), pages)
  const start = (S.page - 1) * PAGE_SIZE
  const rows = S.rows.slice(start, start + PAGE_SIZE)
  const hit = i => q && (exact >= 0 ? start + i === exact : matches.includes(start + i))

  let head, body
  if (S.type === "total") {
    head = `<th class="col-rank">Rank</th><th class="col-name">Player</th><th>Total</th>` +
      S.columns.map(c => `<th>${leagueHead(c)}</th>`).join("")
    body = rows.map((r, i) => `
      <tr class="${hit(i) ? "is-hit" : ""}">
        <td class="col-rank">${fmt(r.rank)}</td>
        <td class="col-name">${playerLink(r.id, r.name)}</td>
        <td class="col-strong">${fmt(r.total)}</td>
        ${S.columns.map(c => `<td>${r.leagues[c]?.[0] != null ? fmt(r.leagues[c][0]) : `<span class="muted">—</span>`}</td>`).join("")}
      </tr>`).join("")
  } else {
    const cols = S.type === "points" ? [["points", "Points"], ["trophy", "Trophy"]]
      : S.type === "skill" ? [["level", "Level"], ["xp", "XP"]]
      : [["score", "Score"]]
    head = `<th class="col-rank">Rank</th><th class="col-name">Player</th>` + cols.map(c => `<th>${c[1]}</th>`).join("")
    body = rows.map((r, i) => `
      <tr class="${hit(i) ? "is-hit" : ""}">
        <td class="col-rank">${fmt(r.rank)}</td>
        <td class="col-name">${playerLink(r.id, r.name)}</td>
        ${cols.map(([key]) => `<td>${key === "trophy" ? trophyBadge(r.trophy) : fmt(r[key])}</td>`).join("")}
      </tr>`).join("")
  }

  box.innerHTML = `
    <div class="table-wrap">
      <table class="hs-table hs-board ${S.type === "total" ? "hs-board-wide" : ""}">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`
  drawPager(pages)
}

function drawPager(pages) {
  const el = document.getElementById("pager")
  if (pages <= 1) { el.innerHTML = ""; return }
  const show = new Set([1, pages, S.page - 1, S.page, S.page + 1].filter(n => n >= 1 && n <= pages))
  if (S.page <= 3) [2, 3, 4].forEach(n => n <= pages && show.add(n))
  if (S.page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach(n => n >= 1 && show.add(n))
  const list = [...show].sort((a, b) => a - b)
  let html = `<button type="button" class="pager-btn" data-page="${S.page - 1}" ${S.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>`
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) html += `<span class="pager-gap">…</span>`
    html += `<button type="button" class="pager-btn ${n === S.page ? "is-active" : ""}" data-page="${n}">${n}</button>`
  })
  html += `<button type="button" class="pager-btn" data-page="${S.page + 1}" ${S.page === pages ? "disabled" : ""} aria-label="Next page">›</button>`
  el.innerHTML = html
  el.querySelectorAll("[data-page]").forEach(b => b.onclick = () => {
    S.page = Number(b.dataset.page)
    drawTable()
    saveAddress()
    document.getElementById("title").scrollIntoView({ block: "nearest" })
  })
}

/* ---------------- changing things ---------------- */

function saveAddress() {
  const p = new URLSearchParams()
  if (S.league !== ALL) p.set("league", S.league)
  p.set("cat", current())
  if (S.page > 1) p.set("page", S.page)
  history.replaceState(null, "", `${location.pathname}?${p}`)
}

async function refresh() {
  drawLeagueSelect()
  drawSidebar()
  drawTitle()
  await loadRows()
  drawTable()
  saveAddress()
}

function clearFind() {
  S.find = ""
  document.querySelector("#hsSearch input").value = ""
  document.querySelector("#hsSearch .search-clear").hidden = true
}

/* Keep the list you were on if the new league has it; otherwise go to League Points */
function setLeague(code) {
  S.league = code
  if (code !== ALL && !has(S.cat)) S.cat = LP
  S.page = 1
  clearFind()
  refresh()
}

function setCat(slug) {
  if (!has(slug)) return
  if (S.league === ALL) S.total = slug
  else S.cat = slug
  S.page = 1
  clearFind()
  refresh()
}

function wireFind() {
  const input = document.querySelector("#hsSearch input")
  const clear = document.querySelector("#hsSearch .search-clear")
  const go = () => {
    clear.hidden = !input.value
    S.find = input.value.trim()
    const q = norm(S.find)
    if (q) {
      const exact = S.rows.findIndex(r => norm(r.name) === q)
      const first = exact >= 0 ? exact : S.rows.findIndex(r => norm(r.name).includes(q))
      if (first >= 0) S.page = Math.floor(first / PAGE_SIZE) + 1
    }
    drawTable()
    saveAddress()
  }
  let timer
  input.addEventListener("input", () => { clear.hidden = !input.value; clearTimeout(timer); timer = setTimeout(go, 200) })
  // the X empties the box and removes the highlight
  clear.onclick = () => { clearTimeout(timer); clearFind(); drawTable(); saveAddress(); input.focus() }
  input.addEventListener("keydown", e => { if (e.key === "Enter") { clearTimeout(timer); go() } })
  document.querySelector("#hsSearch .search-go").onclick = go
}

/* ---------------- start ---------------- */

/* The fixed sidebar lists: every skill and activity any league has */
function buildMasterLists() {
  const skills = new Map(), acts = new Map()
  for (const cats of Object.values(S.index)) {
    for (const c of cats) {
      if (c.type === "skill") skills.set(c.slug, c.label)
      else if (c.type !== "points") acts.set(c.slug, c.label)
    }
  }
  const pos = s => { const i = SKILL_ORDER.indexOf(s); return i === -1 ? 1e6 : i }
  S.skills = [...skills].map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => pos(a.slug) - pos(b.slug) || a.label.localeCompare(b.label))
  const clue = s => s.startsWith("clue") ? 0 : 1
  S.activities = [...acts].map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => clue(a.slug) - clue(b.slug) || a.label.localeCompare(b.label))
}

async function boot() {
  const [meta, index] = await Promise.all([getJSON("/data/leagues.json"), getJSON("/data/hiscores/index.json")])
  S.meta = setLeagueMeta(meta)
  S.index = index || {}
  buildMasterLists()

  const q = new URL(location.href).searchParams
  const league = q.get("league")
  const cat = String(q.get("cat") || "").toLowerCase()
  if (league && S.index[league]) {
    S.league = league
    S.cat = has(cat, league) ? cat : LP
  } else if (TOTALS.some(t => t.slug === cat)) {
    S.total = cat
  }
  S.page = Math.max(1, parseInt(q.get("page"), 10) || 1)

  wireFind()
  await refresh()

  // a link can ask for a player to be found (profile pages do this): jump to their row
  const find = (q.get("find") || "").trim()
  if (find) {
    const input = document.querySelector("#hsSearch input")
    input.value = find
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
  }
}

boot().catch(err => {
  console.error(err)
  const note = document.getElementById("hsNote")
  note.textContent = "The hiscores could not be loaded."
  note.classList.remove("hidden")
})
