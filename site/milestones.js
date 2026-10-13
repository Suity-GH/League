/* =========================================================
   Milestones — League Archive
   Uses: common.js
   Reads: data/leagues.json, data/stats.json, data/milestones.json,
          data/tasks.json (optional: the Tasks tab only shows if it exists)
   ========================================================= */

const TROPHIES = ["Cap", "Top 100", "True Dragon", "Dragon", "Rune", "Adamant", "Mithril", "Steel", "Iron", "Bronze"]
const TROPHIES_WITH_POINTS = ["Cap", "Top 100", "True Dragon", "Dragon"]
const RELIC_TIERS = ["T8", "T7", "T6", "T5", "T4", "T3", "T2", "T1"]

const S = {
  meta: { order: [], osrs: [], rs3: [], leagues: {} },
  stats: null, milestones: null, tasks: null,
  tab: "trophies",
  taskSort: { col: "task", dir: "asc" },
}

/* ---------------- helpers ---------------- */

function pct(v, total) {
  if (!v || !total) return ""
  const p = (v / total) * 100
  const digits = p >= 10 ? 1 : p >= 1 ? 2 : 3
  return p.toFixed(digits).replace(/\.?0+$/, "") + "%"
}

function leagueCell(code) {
  return `
    <span class="item">
      <img class="item-icon" src="${esc(leagueIcon(code))}" alt="" onerror="this.remove()">
      <span>${esc(leagueName(code))}</span>
    </span>`
}

/* A number with smaller lines beneath it */
function cell(main, ...subs) {
  if (main === "" || main === null || main === undefined) return `<td></td>`
  return `<td><span class="ms-value">${main}</span>${subs.filter(Boolean).map(s => `<span class="ms-sub">${s}</span>`).join("")}</td>`
}

function table(head, rows, extraClass = "") {
  return `
    <div class="table-wrap">
      <table class="hs-table ms-table ${extraClass}">
        <thead><tr>${head}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function section(title, body, controls = "") {
  return `
    <section class="section ms-section">
      <div class="section-head"><h2 class="section-title">${title}</h2>${controls}</div>
      ${body}
    </section>`
}

/* Explanation at the top of a tab, above its tables */
const intro = text => `<p class="note ach-intro tab-intro">${text}</p>`

/* ---------------- trophies ---------------- */

function trophyTable(codes) {
  const leagues = codes.filter(c => S.stats?.leagues?.[c])
  if (!leagues.length) return ""
  const head = `<th>League</th><th>Players</th>` +
    TROPHIES.map(t => `<th><span class="trophy-badge ${trophyClass(t)}">${t}</span></th>`).join("")
  const rows = leagues.map(code => {
    const lg = S.stats.leagues[code]
    return `<tr><td>${leagueCell(code)}</td>${cell(fmt(lg.players))}` + TROPHIES.map(t => {
      const count = lg.trophies?.[t]
      const points = lg.trophy_points?.[t]
      if (TROPHIES_WITH_POINTS.includes(t)) {
        if (!count && !points) return `<td></td>`
        return cell(fmt(count || 0), points ? `${fmt(points)} pts` : "", count ? pct(count, lg.players) : "")
      }
      return count ? cell(fmt(count), pct(count, lg.players)) : `<td></td>`
    }).join("") + `</tr>`
  }).join("")
  return table(head, rows, "ms-wide")
}

function renderTrophies() {
  if (!S.stats) return empty("Trophy numbers aren't available yet.")
  const osrs = trophyTable(S.meta.osrs), rs3 = trophyTable(S.meta.rs3)
  return (osrs ? section("Old School Leagues", osrs) : "") + (rs3 ? section("RuneScape 3 Leagues", rs3) : "")
}

/* ---------------- relics ---------------- */

function relicTable(codes) {
  const leagues = codes.filter(c => Object.keys(S.stats?.leagues?.[c]?.relics || {}).length)
  if (!leagues.length) return ""
  const tiers = RELIC_TIERS.filter(t => leagues.some(c => S.stats.leagues[c].relics[t]))
  const head = `<th>League</th><th>Players</th>` + tiers.map(t => `<th>${t}</th>`).join("")
  const rows = leagues.map(code => {
    const lg = S.stats.leagues[code]
    return `<tr><td>${leagueCell(code)}</td>${cell(fmt(lg.players))}` +
      tiers.map(t => lg.relics[t] ? cell(fmt(lg.relics[t]), pct(lg.relics[t], lg.players)) : `<td></td>`).join("") + `</tr>`
  }).join("")
  return table(head, rows)
}

function renderRelics() {
  const osrs = relicTable(S.meta.osrs), rs3 = relicTable(S.meta.rs3)
  if (!osrs && !rs3) return empty("Relic tier numbers aren't available yet.")
  return (osrs ? section("Old School Leagues", osrs) : "") + (rs3 ? section("RuneScape 3 Leagues", rs3) : "")
}

/* ---------------- skills ---------------- */

/* "5,944", "5,944+" (at least) or "5,944 – 6,034" (somewhere between) */
function milestoneCount(entry, key) {
  const lo = entry?.[key]
  if (lo === undefined || lo === null) return ""
  const upperKey = `${key}_upper`
  if (!(upperKey in entry)) return fmt(lo)
  const hi = entry[upperKey]
  if (hi === null) return `${fmt(lo)}+`
  return hi === lo ? fmt(lo) : `${fmt(lo)} –<wbr> ${fmt(hi)}`
}

function skillTable(codes) {
  const leagues = codes.filter(c => S.milestones?.[c])
  if (!leagues.length) return ""
  // the 99 column only appears where skills go past 99 (RS3)
  const with99 = leagues.some(c => Object.values(S.milestones[c]).some(e => "count_99" in e))
  const cols = [
    ...(with99 ? [{ label: "Level 99", key: e => ("count_99" in e || e.max_level !== 99 ? "count_99" : "count_max_level") }] : []),
    { label: "Max level", key: () => "count_max_level", level: true },
    { label: with99 ? "Max XP" : "200m XP", key: e => ("count_200m" in e ? "count_200m" : "count_max_xp") },
  ]
  const slugs = []
  leagues.forEach(c => Object.keys(S.milestones[c]).forEach(s => { if (!slugs.includes(s)) slugs.push(s) }))

  const head = `
    <tr>
      <th rowspan="2">Skill</th>
      ${leagues.map(c => `<th colspan="${cols.length}" class="ms-group">${leagueHead(c)}</th>`).join("")}
    </tr>
    <tr class="ms-subhead">
      ${leagues.map(() => cols.map((col, i) => `<th class="${i === 0 ? "ms-group" : ""}">${col.label}</th>`).join("")).join("")}
    </tr>`

  // icons come from the table's own game folder, then the other game's
  const game = leagues.every(isRS3) ? "rs3" : "osrs"
  const other = game === "osrs" ? "rs3" : "osrs"
  const icon = slug => `<span class="item-icon-slot">${iconImg([`/icons/${game}/${slug}.png`, `/icons/${other}/${slug}.png`])}</span>`
  const rows = slugs.map(slug => `<tr><td><span class="item">${icon(slug)}<span>${esc(labelFromSlug(slug))}</span></span></td>` +
    leagues.map(code => {
      const e = S.milestones[code][slug]
      const players = S.stats?.leagues?.[code]?.players
      return cols.map((col, i) => {
        const group = i === 0 ? ' class="ms-group"' : ""
        const key = e ? col.key(e) : null
        // with a 99 column, a skill that stops at 99 leaves Max level blank (it's the same number)
        const sameAs99 = with99 && col.level && e?.max_level === 99
        const count = e && !sameAs99 ? milestoneCount(e, key) : ""
        if (count === "") return `<td${group}></td>`
        // the level is only spelled out when it isn't plain 99 (120s, total levels)
        const level = col.level && e.max_level && e.max_level !== 99 ? `Level ${fmt(e.max_level)}` : ""
        return cell(count, level, pct(e[key], players)).replace("<td>", `<td${group}>`)
      }).join("")
    }).join("") + `</tr>`).join("")

  return `
    <div class="table-wrap">
      <table class="hs-table ms-table ms-skills">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function renderSkills() {
  const osrs = skillTable(S.meta.osrs), rs3 = skillTable(S.meta.rs3)
  if (!osrs && !rs3) return empty("Skill milestones aren't available yet.")
  return (osrs ? section("Old School Leagues", osrs) : "") + (rs3 ? section("RuneScape 3 Leagues", rs3) : "")
}

/* ---------------- tasks ---------------- */

function pctNumber(v) {
  if (v === null || v === undefined || v === "") return -1
  const s = String(v).trim()
  const n = parseFloat(s.replace(/[<%]/g, ""))
  return Number.isFinite(n) ? (s.startsWith("<") ? n / 2 : n) : -1
}

/* A task's region icon. RS3 leagues use their own icons from /icons/regions/rs3/, falling back to the shared ones. */
function regionIcon(region, codes) {
  const file = `${String(region || "global").toLowerCase()}.png`
  const rs3 = codes.length && codes.every(isRS3)
  return iconImg(rs3 ? [`/icons/regions/rs3/${file}`, `/icons/regions/${file}`] : [`/icons/regions/${file}`], { cls: "item-icon" })
}

function taskTable(rows, codes) {
  const leagues = codes.filter(c => rows.some(r => r[c] !== undefined && r[c] !== null && r[c] !== ""))
  if (!rows.length || !leagues.length) return ""
  const { col, dir } = S.taskSort
  const sign = dir === "asc" ? 1 : -1
  const sorted = rows.slice().sort((a, b) => {
    if (col === "task" || col === "region") {
      return sign * String(a[col] || "").localeCompare(String(b[col] || ""))
    }
    return sign * (pctNumber(a[col]) - pctNumber(b[col])) || String(a.task || "").localeCompare(String(b.task || ""))
  })
  const arrow = c => col === c ? (dir === "asc" ? " ▲" : " ▼") : ""
  const head = `<th data-sort="task">Task${arrow("task")}</th><th data-sort="region">Region${arrow("region")}</th>` +
    leagues.map(c => `<th data-sort="${esc(c)}">${leagueHead(c)}${arrow(c)}</th>`).join("")
  const body = sorted.map(r => `
    <tr>
      <td><span class="item">${r.icon ? `<img class="item-icon" src="${esc(r.icon)}" alt="" onerror="this.remove()">` : ""}<span>${esc(r.task || "")}</span></span></td>
      <td><span class="item">${regionIcon(r.region, codes)}<span>${esc(r.region || "")}</span></span></td>
      ${leagues.map(c => `<td>${esc(r[c] ?? "")}</td>`).join("")}
    </tr>`).join("")
  return table(head, body, "ms-tasks")
}

function renderTasks() {
  const osrs = taskTable(S.tasks?.osrs || [], S.meta.osrs), rs3 = taskTable(S.tasks?.rs3 || [], S.meta.rs3)
  if (!osrs && !rs3) return empty("Task completion numbers aren't available yet.")
  return intro("Task completion rates uses WikiSync which only became available during and after Shattered Relics league.") +
    (osrs ? section("Old School Leagues", osrs) : "") + (rs3 ? section("RuneScape 3 Leagues", rs3) : "")
}

/* ---------------- page ---------------- */

const RENDER = { trophies: renderTrophies, relics: renderRelics, skills: renderSkills, tasks: renderTasks }

function render() {
  document.querySelectorAll("#tabs .tab").forEach(b => b.classList.toggle("is-active", b.dataset.tab === S.tab))
  const box = document.getElementById("content")
  box.innerHTML = RENDER[S.tab]()

  box.querySelectorAll("th[data-sort]").forEach(th => th.onclick = () => {
    const col = th.dataset.sort
    if (S.taskSort.col === col) S.taskSort.dir = S.taskSort.dir === "asc" ? "desc" : "asc"
    else S.taskSort = { col, dir: col === "task" || col === "region" ? "asc" : "desc" }
    render()
  })
}

function setTab(tab) {
  S.tab = RENDER[tab] ? tab : "trophies"
  history.replaceState(null, "", `#${S.tab}`)
  render()
}

async function boot() {
  const [meta, stats, milestones, tasks] = await Promise.all([
    getJSON("/data/leagues.json"), getJSON("/data/stats.json"),
    getJSON("/data/milestones.json"), getJSON("/data/tasks.json"),
  ])
  if (meta) S.meta = setLeagueMeta(meta)
  else if (stats) S.meta = setLeagueMeta({ order: Object.keys(stats.leagues), osrs: Object.keys(stats.leagues), rs3: [], leagues: {} })
  S.stats = stats
  S.milestones = milestones
  S.tasks = tasks

  const tasksTab = document.querySelector('#tabs [data-tab="tasks"]')
  tasksTab.classList.toggle("hidden", !tasks)
  document.querySelectorAll("#tabs .tab").forEach(b => b.onclick = () => setTab(b.dataset.tab))

  const wanted = location.hash.slice(1)
  setTab(wanted === "tasks" && !tasks ? "trophies" : wanted)
}

boot().catch(err => {
  console.error(err)
  document.getElementById("content").innerHTML = empty("The milestones could not be loaded.")
})
