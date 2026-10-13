/* =========================================================
   Player profile — League Archive
   Uses: common.js
   Reads: data/leagues.json, data/details/<bucket>.json,
          data/hiscores/index.json, data/index/<bucket>.json
   ========================================================= */

let META = LEAGUE_META

const LEAGUE_POINTS_TOP = 2000   // how many players each league's League Points hiscores holds

/* ---------------- helpers ---------------- */

/* League name with its icon. With a link, it opens that league's League Points hiscores;
   if the player is in that list, the page jumps to their row and highlights it. */
function leagueItem(code, player) {
  const rank = player?.leagues?.[code]?.[1]
  let href = ""
  if (player && player.leagues?.[code]) {
    href = `/hiscores.html?league=${encodeURIComponent(code)}&cat=league_points`
    if (rank && rank <= LEAGUE_POINTS_TOP) href += `&find=${encodeURIComponent(player.name)}`
  }
  const name = esc(leagueName(code))
  return `
    <span class="item">
      <img class="item-icon" src="${esc(leagueIcon(code))}" alt="" onerror="this.remove()">
      ${href ? `<a href="${href}">${name}</a>` : `<span>${name}</span>`}
    </span>`
}

/* Icon for a skill, boss or activity: the league's own game folder first, then the other
   game's (an icon saved in one folder serves both). The space is kept if there's no icon,
   so names stay lined up. */
function listIcon(code, slug) {
  const game = isRS3(code) ? "rs3" : "osrs"
  const other = game === "osrs" ? "rs3" : "osrs"
  return `<span class="item-icon-slot">${iconImg([`/icons/${game}/${slug}.png`, `/icons/${other}/${slug}.png`])}</span>`
}

/* ---------------- sections ---------------- */

/* "Also known as": the player's linked accounts and old names, as plain labels (they have no page of their own).
   Only the first few are shown; a small text button reveals the rest. */
const ALIAS_LIMIT = 4
function renderAliases(p, showAll = false) {
  const el = document.getElementById("aliases")
  const names = Array.isArray(p.aliases) ? p.aliases : []
  el.classList.toggle("hidden", !names.length)
  if (!names.length) { el.innerHTML = ""; return }
  // one extra name is shown rather than hidden behind a "+1 more" button
  const over = names.length > ALIAS_LIMIT + 1
  const shown = over && !showAll ? names.slice(0, ALIAS_LIMIT) : names
  el.innerHTML = `<span class="aka-label">Also known as</span>`
    + shown.map(n => `<span class="player-pill">${esc(n)}</span>`).join("")
    + (over ? `<button type="button" class="aka-more">${showAll ? "Show less" : `+${names.length - ALIAS_LIMIT} more`}</button>` : "")
  if (over) el.querySelector(".aka-more").onclick = () => renderAliases(p, !showAll)
}

function renderTotals(p) {
  const card = (label, value, rank) => `
    <div class="total-card">
      <div class="total-label">${label}</div>
      <div class="total-value">${fmt(value) || 0}</div>
      <div class="total-rank">${rank ? `Rank ${fmt(rank)}` : "Unranked"}</div>
    </div>`
  document.getElementById("totals").innerHTML =
    card("OSRS Total", p.osrs_total, p.osrs_rank) +
    card("RS3 Total", p.rs3_total, p.rs3_rank) +
    card("Combined Total", p.combined_total, p.combined_rank)
}

/* ---------------- skill silhouettes for Top 25 emblems ----------------
   Simple original shapes on a 48x48 grid; they take the badge colour. */
const S = (d, w = 3.4) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
const F = d => `<path d="${d}" fill="currentColor"/>`
const SKILL_GLYPHS = {
  overall: F("M7 40h8V24H7zM20 40h8V10h-8zM33 40h8V18h-8z"),
  attack: F("M33 5l10 0 0 10L21 37l-5-5zM12 28l8 8-3 3-3-2-6 6-3-3 6-6-2-3z"),
  strength: F("M4 18h6v12H4zM11 13h6v22h-6zM17 21h14v6H17zM31 13h6v22h-6zM38 18h6v12h-6z"),
  defence: F("M24 5l15 5v12c0 10-6 17-15 21C15 39 9 32 9 22V10z"),
  hitpoints: F("M24 41C12 32 6 25 6 17c0-5 4-9 9-9 4 0 7 2 9 5 2-3 5-5 9-5 5 0 9 4 9 9 0 8-6 15-18 24z"),
  ranged: S("M12 6c16 4 22 16 22 18s-6 14-22 18M12 6v36M8 24h32") + F("M44 24l-9-5v10z"),
  prayer: F("M24 3l4.5 14.500L43 22l-14.5 4.500L24 45l-4.5-18.500L5 22l14.5-4.500z"),
  magic: F("M24 4l10 26H14zM5 36c0-3 9-6 19-6s19 3 19 6-9 7-19 7S5 39 5 36z"),
  cooking: F("M8 20h32v8c0 8-7 14-16 14S8 36 8 28zM4 16h40v4H4z") + S("M17 11c-2-3 2-4 0-7M25 11c-2-3 2-4 0-7M33 11c-2-3 2-4 0-7", 2.4),
  woodcutting: F("M24 4l12 14h-6l9 11h-7l8 9H8l8-9H9l9-11h-6zM21 38h6v7h-6z"),
  fletching: S("M8 40L38 10", 3) + F("M44 4l-3 13-10-10zM6 34l8 8-8 2zM12 28l8 8-4 1-5-5z"),
  fishing: F("M4 24c7-10 18-12 28-6l10-8v28l-10-8C22 36 11 34 4 24z") + `<circle cx="13" cy="22" r="2" fill="#0e2338"/>`,
  firemaking: F("M24 4c3 9 13 13 13 25a13 13 0 0 1-26 0c0-7 4-10 6-13 0 5 2 8 5 8-3-7-2-13 2-20z"),
  crafting: F("M14 9h20l9 11-19 22L5 20z"),
  smithing: F("M4 14h30c0 5 4 8 10 8v4H31c-2 0-3 2-3 4v4h8v6H12v-6h8v-4c0-2-1-4-4-5C9 23 5 19 4 14z"),
  mining: S("M6 20C16 8 32 8 42 20", 4.5) + S("M24 13L10 42", 4),
  herblore: F("M19 4h10v4h-2v9l11 18c2 4-1 8-5 8H15c-4 0-7-4-5-8l11-18V8h-2z"),
  agility: F("M30 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM18 16l10-2 5 6 7 2-1 4-9-2-3-3-3 7 7 5-2 11h-5l1-8-9-5-3 7-9 2-1-4 6-2 4-10-5 2-3 6-4-2 4-9z"),
  thieving: F("M4 18c6-4 12-4 20 0 8-4 14-4 20 0-1 10-5 16-11 16-4 0-6-3-9-3s-5 3-9 3C9 34 5 28 4 18z") + `<ellipse cx="15" cy="23" rx="4" ry="3" fill="#0e2338"/><ellipse cx="33" cy="23" rx="4" ry="3" fill="#0e2338"/>`,
  slayer: F("M24 4c10 0 17 7 17 16 0 6-3 10-7 13v9H14v-9c-4-3-7-7-7-13C7 11 14 4 24 4z") + `<circle cx="17" cy="21" r="4.5" fill="#0e2338"/><circle cx="31" cy="21" r="4.5" fill="#0e2338"/><path d="M24 26l-3 6h6z" fill="#0e2338"/>`,
  farming: F("M22 44V26C12 27 6 22 5 12c10-1 16 3 18 11 2-11 9-17 20-17 0 12-6 19-17 20v18z"),
  runecraft: F("M24 4l16 8v24l-16 8-16-8V12z") + `<path d="M18 16l12 8-12 8M30 16v16" fill="none" stroke="#0e2338" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  hunter: F("M24 22c6 0 12 7 12 13 0 4-3 6-6 6-2 0-4-1-6-1s-4 1-6 1c-3 0-6-2-6-6 0-6 6-13 12-13z") + `<ellipse cx="9" cy="20" rx="4" ry="5.5" fill="currentColor"/><ellipse cx="19" cy="11" rx="4" ry="5.5" fill="currentColor"/><ellipse cx="29" cy="11" rx="4" ry="5.5" fill="currentColor"/><ellipse cx="39" cy="20" rx="4" ry="5.5" fill="currentColor"/>`,
  construction: F("M24 5l20 17h-6v20H28V30h-8v12H10V22H4z"),
  summoning: F("M8 6l10 10h12L40 6l1 16-7 12-10 9-10-9-7-12z") + `<path d="M16 23l5 3M32 23l-5 3" stroke="#0e2338" stroke-width="2.6" stroke-linecap="round"/>`,
  dungeoneering: F("M10 44V20C10 11 16 5 24 5s14 6 14 15v24zM20 44V24c0-3 2-5 4-5s4 2 4 5v20z").replace('fill="currentColor"', 'fill="currentColor" fill-rule="evenodd"'),
  divination: `<circle cx="24" cy="26" r="11" fill="currentColor"/>` + F("M24 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM40 6l1.2 3.600L45 11l-3.8 1.400L40 16l-1.2-3.600L35 11l3.8-1.400zM8 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"),
  invention: F("M21 4h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2zM24 17a7 7 0 1 0 0 14 7 7 0 0 0 0-14z").replace('fill="currentColor"', 'fill="currentColor" fill-rule="evenodd"'),
  archaeology: F("M24 3l10 13c2 3 0 8-4 8h-3v13h5v7H16v-7h5V24h-3c-4 0-6-5-4-8z"),
  necromancy: F("M24 4c9 0 15 7 15 16v24l-5-4-5 4-5-4-5 4-5-4-5 4V20C9 11 15 4 24 4z") + `<circle cx="18" cy="20" r="3.4" fill="#0e2338"/><circle cx="30" cy="20" r="3.4" fill="#0e2338"/>`,
  sailing: S("M24 12v30M12 30c0 8 6 12 12 12s12-4 12-12M8 30h8M32 30h8M16 20h16", 3.6) + `<circle cx="24" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="3.2"/>`,
}
SKILL_GLYPHS.constitution = SKILL_GLYPHS.hitpoints
SKILL_GLYPHS.runecrafting = SKILL_GLYPHS.runecraft
/* Fallbacks: clue scrolls get a scroll, bosses and other activities get crossed swords */
const CLUE_GLYPH = F("M10 8h24c3 0 5 2 5 5v22c3 0 5 2 5 4s-2 4-5 4H15c-3 0-5-2-5-5zM4 12c0-3 2-4 4-4v10H4z")
const BOSS_GLYPH = F("M6 6l8 1 22 22 3-3 3 3-4 4 5 5-4 4-5-5-4 4-3-3 3-3L8 14zM42 6l-8 1-9 9 7 7 9-9zM13 27l7 7-2 2 3 3-3 3-4-4-5 5-4-4 5-5-4-4 3-3 3 3z")

function glyphFor(slug) {
  if (SKILL_GLYPHS[slug]) return SKILL_GLYPHS[slug]
  return slug.startsWith("clue") ? CLUE_GLYPH : BOSS_GLYPH
}

/* Rank number at the top (text, so it can be any rank) with the skill's silhouette beneath it */
function rankEmblem(n, slug) {
  const digits = String(n).length
  const size = digits >= 3 ? 12 : digits === 2 ? 14.5 : 16
  return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <text x="24" y="16.5" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="800"
        font-size="${size}" fill="currentColor" stroke="#0b1c2e" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round">${n}</text>
      <g transform="translate(11.5 19.5) scale(.52)">${glyphFor(slug)}</g>
    </svg>`
}

/* Icons for particular achievement types from the FIRSTS tab.
   The badge uses the first entry whose word appears in the row's "type" (any capitals). */
const TYPE_ICONS = [
  // Africa with a location pin: region combo winners
  ["region", `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M11 10c3-2 7-3 10-2l4-1 4 1 4 0 2 4 3 6 3 3 2 0-2 4-4 4-1 5 0 4-3 5-4 2-3-1-2-5-1-6-2-5 0-4-4 1-5 0-4-3-2-4 1-4z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
      <ellipse cx="41" cy="36" rx="1.8" ry="3.6" transform="rotate(18 41 36)" fill="currentColor"/>
      <g transform="translate(15 6) scale(.42)">
        <path d="M24 4c8 0 14 6 14 14 0 10-14 26-14 26S10 28 10 18c0-8 6-14 14-14z" fill="#0e2338"/>
        <circle cx="24" cy="18" r="6" fill="currentColor"/>
      </g>
    </svg>`],
]

function typeIcon(type) {
  const t = norm(type)
  return TYPE_ICONS.find(([word]) => t.includes(word))?.[1]
}

/* Placing (e.g. 1-25 for a speedrun) as text inside the laurel */
function numberEmblem(n) {
  const digits = String(n).length
  const size = digits >= 3 ? 15 : digits === 2 ? 20 : 25
  return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 22c0 9 5 16 12 19M39 22c0 9-5 16-12 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
      <text x="24" y="${22 + size * 0.36}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="800"
        font-size="${size}" fill="currentColor">${esc(n)}</text>
    </svg>`
}

function achievementBadge({ kind, icon, variant, tone, eyebrow, title, meta }) {
  return `
    <div class="ach-badge ach-${variant}" ${tone ? `style="--tone:${tone}"` : ""}>
      <div class="ach-emblem"><div class="ach-face">${icon || EMBLEMS[kind]}</div></div>
      <div class="ach-text">
        <div class="ach-eyebrow">${eyebrow}</div>
        <div class="ach-title">${title}</div>
      </div>
      <div class="ach-meta">${meta}</div>
    </div>`
}

/* Badge colour per skill (bright enough to read on the dark cards).
   Bosses and activities aren't listed, so they keep the default green. */
const SKILL_COLOURS = {
  overall: "#f1d08a",
  attack: "#e0483a",
  strength: "#3fbf7a",
  defence: "#7fa8e8",
  hitpoints: "#f06a7a",
  constitution: "#f06a7a",
  ranged: "#7cc94a",
  prayer: "#f4efc4",
  magic: "#4f8dff",
  cooking: "#a56be0",
  woodcutting: "#b9894f",
  fletching: "#2fb8a8",
  fishing: "#6fc3f2",
  firemaking: "#ff8a2a",
  crafting: "#c79a5b",
  smithing: "#a9b3bd",
  mining: "#8fb0c4",
  herblore: "#35c44f",
  agility: "#5a7de0",
  thieving: "#b25fc9",
  slayer: "#d4505a",
  farming: "#58b83c",
  runecraft: "#e6c34a",
  runecrafting: "#e6c34a",
  hunter: "#c9a36a",
  construction: "#d9c7a0",
  summoning: "#3fc7c0",
  dungeoneering: "#b0763e",
  divination: "#c77be0",
  invention: "#f0c230",
  archaeology: "#d98a3a",
  necromancy: "#9a6cf0",
  sailing: "#3fa8d8",
}

/* A top-N finish in any skill, boss or activity earns a badge */
const TOP_FINISH_RANK = 25
const TOP_FINISH_SHOWN = 6   // more than this are tucked behind a "show all" button

function topFinishBadges(p, hsIndex) {
  const order = META.order || []
  const out = []
  for (const [code, entries] of Object.entries(p.hiscores || {})) {
    const cats = hsIndex?.[code] || []
    for (const entry of entries) {
      const [slug, rank] = entry
      if (!(rank >= 1 && rank <= TOP_FINISH_RANK)) continue
      const cat = cats.find(c => c.slug === slug)
      out.push({ code, slug, rank, label: cat?.label || labelFromSlug(slug) })
    }
  }
  // best rank first, then newest league first
  out.sort((a, b) => a.rank - b.rank || order.indexOf(b.code) - order.indexOf(a.code) || a.label.localeCompare(b.label))

  return out.map(t => achievementBadge({
    icon: rankEmblem(t.rank, t.slug),
    variant: SKILL_COLOURS[t.slug] ? "top ach-skill" : "top",
    tone: SKILL_COLOURS[t.slug],
    eyebrow: "Front Page",
    title: `<a href="/hiscores.html?league=${encodeURIComponent(t.code)}&cat=${encodeURIComponent(t.slug)}&find=${encodeURIComponent(p.name)}">${esc(t.label)}</a>`,
    meta: `
      <span class="ach-chip">
        <img src="${esc(leagueIcon(t.code))}" alt="" onerror="this.remove()">
        ${esc(leagueName(t.code))}
      </span>
      <span class="ach-chip ${t.rank <= 3 ? `ach-podium-${t.rank}` : ""}">Rank ${fmt(t.rank)}</span>`,
  }))
}

function renderAchievements(p, hsIndex) {
  const badges = []

  const perfect = (variant, title, scope) => badges.push(achievementBadge({
    kind: "perfect",
    variant,
    eyebrow: "Perfect Dragon",
    title,
    meta: `<span class="ach-chip">${scope}</span>`,
  }))

  if (p.perfect_combined) perfect("combined", "Combined", "Every league")
  if (p.perfect_osrs) perfect("osrs", "Old School", "Every OSRS league")
  if (p.perfect_rs3) perfect("rs3", "RuneScape 3", "Every RS3 league")

  const firsts = Array.isArray(p.firsts) ? p.firsts : []
  const order = META.order || []
  firsts
    .slice()
    .sort((a, b) => order.indexOf(a.league) - order.indexOf(b.league) || (a.number ?? 0) - (b.number ?? 0) || (a.day ?? 1e9) - (b.day ?? 1e9))
    .forEach(f => badges.push(achievementBadge({
      kind: "first",
      icon: f.number ? numberEmblem(f.number) : typeIcon(f.type),
      variant: "first",
      eyebrow: esc(f.type || "League First"),
      // numbered rows (e.g. Dragon Rush) are titled by their placing, not by the task text
      title: f.number ? `Rank ${fmt(f.number)}` : esc(f.task),
      meta: `
        <span class="ach-chip">
          <img src="${esc(leagueIcon(f.league))}" alt="" onerror="this.remove()">
          ${esc(leagueName(f.league))}
        </span>
        ${f.day ? `<span class="ach-chip">Day ${fmt(f.day)}</span>` : ""}`,
    })))

  const tops = topFinishBadges(p, hsIndex)
  const list = document.getElementById("achievementsList")
  const more = document.getElementById("achievementsMore")

  document.getElementById("achievementsSection").classList.toggle("hidden", !badges.length && !tops.length)

  const draw = showAll => {
    const shown = showAll ? tops : tops.slice(0, TOP_FINISH_SHOWN)
    list.innerHTML = badges.join("") + shown.join("")
    const hiddenCount = tops.length - TOP_FINISH_SHOWN
    more.classList.toggle("hidden", hiddenCount <= 0)
    more.textContent = showAll ? "Show fewer" : `Show all ${tops.length} front page finishes`
    more.onclick = () => draw(!showAll)
  }
  draw(false)
}

function leagueRows(p, codes) {
  return codes.map(code => {
    const e = p.leagues?.[code]
    return `
      <tr>
        <td>${leagueItem(code, p)}</td>
        <td>${e && e[1] != null ? fmt(e[1]) : "—"}</td>
        <td>${e && e[0] != null ? fmt(e[0]) : "—"}</td>
        <td>${e ? trophyBadge(e[2]) : ""}</td>
      </tr>`
  }).join("")
}

function renderLeagues(p) {
  document.getElementById("osrsBody").innerHTML = leagueRows(p, META.osrs || [])
  const rs3 = META.rs3 || []
  document.getElementById("rs3Section").classList.toggle("hidden", !rs3.length)
  document.getElementById("rs3Body").innerHTML = leagueRows(p, rs3)
}

function renderHiscores(p, hsIndex) {
  const placements = p.hiscores || {}
  const order = META.order || []
  const codes = [
    ...order.filter(c => placements[c]?.length),
    ...Object.keys(placements).filter(c => !order.includes(c) && placements[c]?.length),
  ]

  const selectBox = document.getElementById("hiscoreLeague")
  const note = document.getElementById("hiscoresNote")
  const tables = document.getElementById("hiscoreTables")

  if (!codes.length) {
    selectBox.classList.add("hidden")
    note.textContent = "No top 250 finishes in any skill or boss."
    tables.innerHTML = ""
    return
  }

  function show(code) {
    const cats = hsIndex?.[code] || []
    const pos = slug => {
      const i = cats.findIndex(c => c.slug === slug)
      return i === -1 ? 1e6 : i
    }
    const label = slug => cats.find(c => c.slug === slug)?.label || labelFromSlug(slug)
    const link = slug => `/hiscores.html?league=${encodeURIComponent(code)}&cat=${encodeURIComponent(slug)}&find=${encodeURIComponent(p.name)}`
    const entries = placements[code].slice().sort((a, b) => pos(a[0]) - pos(b[0]) || a[1] - b[1])

    const skills = entries.filter(e => e.length >= 4)
    const activities = entries.filter(e => e.length === 3)
    const rankOnly = entries.filter(e => e.length === 2)  // data built before values were added

    const table = (title, head, rows) => rows.length ? `
      <h3 class="sub-title">${title}</h3>
      <div class="table-wrap">
        <table class="hs-table">
          <thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>` : ""

    tables.innerHTML =
      table("Skills", ["Skill", "Rank", "Level", "XP"], skills.map(([slug, rank, level, xp]) => `
        <tr>
          <td><span class="item">${listIcon(code, slug)}<a href="${link(slug)}">${esc(label(slug))}</a></span></td>
          <td>${fmt(rank)}</td><td>${fmt(level)}</td><td>${fmt(xp)}</td>
        </tr>`)) +
      table("Activities", ["Activity", "Rank", "Score"], activities.map(([slug, rank, score]) => `
        <tr>
          <td><span class="item">${listIcon(code, slug)}<a href="${link(slug)}">${esc(label(slug))}</a></span></td>
          <td>${fmt(rank)}</td><td>${fmt(score)}</td>
        </tr>`)) +
      table("Placements", ["Category", "Rank"], rankOnly.map(([slug, rank]) => `
        <tr>
          <td><span class="item">${listIcon(code, slug)}<a href="${link(slug)}">${esc(label(slug))}</a></span></td>
          <td>${fmt(rank)}</td>
        </tr>`))

    note.classList.add("hidden")
  }

  const initial = codes[codes.length - 1]  // most recent league
  const known = [...(META.osrs || []), ...(META.rs3 || [])]
  const item = c => ({ value: c, label: leagueName(c), icon: leagueIcon(c), disabled: !placements[c]?.length })
  drawMenuSelect(selectBox, {
    label: "Select league",
    value: initial,
    groups: [
      { title: "OSRS", options: (META.osrs || []).map(item) },
      { title: "RS3", options: (META.rs3 || []).map(item) },
      { title: "Other", options: codes.filter(c => !known.includes(c)).map(item) },
    ].filter(g => g.options.length),
    onChange: show,
  })
  show(initial)
}

/* ---------------- boot ---------------- */

function showError(message) {
  document.getElementById("profile").classList.add("hidden")
  const err = document.getElementById("profileError")
  err.textContent = message
  err.classList.remove("hidden")
}

async function boot() {
  META = setLeagueMeta(await getJSON("/data/leagues.json"))

  const params = new URL(location.href).searchParams
  const id = params.get("id")
  const key = params.get("key")
  if (!id || !key) {
    document.getElementById("playerName").textContent = "Find a player"
    return showError("Search for a player in the bar at the top.")
  }

  const [bucket, hsIndex] = await Promise.all([
    getJSON(`/data/details/${bucketFor(key)}.json`),
    getJSON("/data/hiscores/index.json"),
  ])
  const p = bucket?.[id]
  if (!p) {
    document.getElementById("playerName").textContent = "Player not found"
    return showError("This player profile could not be loaded.")
  }

  document.title = `${p.name} | League Archive`
  document.getElementById("playerName").textContent = p.name

  renderAliases(p)
  renderTotals(p)
  renderAchievements(p, hsIndex)
  renderLeagues(p)
  renderHiscores(p, hsIndex)
}

boot().catch(err => {
  console.error(err)
  showError("This player profile could not be loaded.")
})
