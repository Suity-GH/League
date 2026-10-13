/* =========================================================
   Shared by every page — League Archive
   Load it first:  <script src="/common.js"></script>
   - Builds the top bar (logo + page links) inside <nav class="topnav"></nav>
   - Small helpers used by every page script: esc, fmt, norm, alnum, labelFromSlug, bucketFor, getJSON,
     empty, iconImg
   - League names/icons (setLeagueMeta, leagueName, leagueIcon, leagueHead), achievement emblems,
     trophy badges and the dropdown with icons (drawMenuSelect)
   ========================================================= */

/* ---------------- top bar ----------------
   To add a page to the top bar, add it here. */
const NAV_LINKS = [
  { href: "/hiscores.html", label: "Hiscores" },
  { href: "/milestones.html", label: "Milestones" },
  { href: "/achievements.html", label: "Achievements" },
  { href: "/requests.html", label: "Requests" },
  { href: "/patreon.html", label: "Patreon" },
]

;(() => {
  const nav = document.querySelector(".topnav")
  if (!nav) return
  const page = p => p.replace(/\.html$/, "")   // works whether or not the address shows .html
  nav.innerHTML = `
    <a class="brand" href="/">
      <span class="brand-logo"><img src="/img/logo.webp" alt="" onerror="this.remove()"></span>
      <span class="brand-title">LEAGUE ARCHIVE</span>
    </a>
    <div class="topnav-links">
      ${NAV_LINKS.map(l => `<a href="${l.href}"${page(location.pathname) === page(l.href) ? ' class="is-active"' : ""}>${l.label}</a>`).join("")}
    </div>`
})()

/* ---------------- helpers ---------------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]))
}

/* 12345 -> "12,345"; blank for anything that isn't a number */
function fmt(n) {
  const x = Number(n)
  return n === null || n === undefined || n === "" || !Number.isFinite(x) ? "" : x.toLocaleString("en-GB")
}

/* Player names: capitals and underscores don't matter */
const norm = s => String(s || "").toLowerCase().replace(/_/g, " ").trim()
const alnum = s => norm(s).replace(/[^a-z0-9]/g, "")

/* "clue_scrolls_all" -> "Clue Scrolls All" */
const labelFromSlug = slug => String(slug).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

/* Which data/index (or data/details) file a name is in: its first two letters */
function bucketFor(s) {
  const a = alnum(s)
  return !a ? "__" : a.length === 1 ? a + "_" : a.slice(0, 2)
}

/* A data file, or null if it's missing. Each file is only fetched once per page. */
const JSON_CACHE = new Map()
function getJSON(url) {
  if (!JSON_CACHE.has(url)) {
    JSON_CACHE.set(url, fetch(url).then(r => r.ok ? r.json() : null).catch(() => null))
  }
  return JSON_CACHE.get(url)
}

/* A note in place of a table that has nothing to show */
const empty = text => `<p class="note">${text}</p>`

/* An <img> that tries each address in turn. If none loads it is removed,
   or replaced by fallbackText when one is given. */
function iconImg(sources, { cls = "", alt = "", fallbackText = "" } = {}) {
  const [first, ...rest] = [].concat(sources)
  return `<img${cls ? ` class="${esc(cls)}"` : ""} src="${esc(first)}" alt="${esc(alt)}" data-next="${esc(rest.join("|"))}"` +
    `${fallbackText ? ` data-fallback="${esc(fallbackText)}"` : ""} onerror="nextIcon(this)">`
}
function nextIcon(img) {
  const rest = (img.dataset.next || "").split("|").filter(Boolean)
  if (rest.length) {
    img.dataset.next = rest.slice(1).join("|")
    img.src = rest[0]
  } else if (img.dataset.fallback) {
    img.replaceWith(document.createTextNode(img.dataset.fallback))
  } else {
    img.remove()
  }
}

/* ---------------- leagues ----------------
   data/leagues.json: {order, osrs, rs3, leagues: {CODE: {name, icon}}}.
   Each page passes it to setLeagueMeta once it has loaded. */
let LEAGUE_META = { order: [], osrs: [], rs3: [], leagues: {} }
function setLeagueMeta(meta) {
  if (meta) LEAGUE_META = meta
  return LEAGUE_META
}
const leagueName = code => LEAGUE_META.leagues?.[code]?.name || code
const leagueIcon = code => LEAGUE_META.leagues?.[code]?.icon || `/icons/${String(code).toLowerCase()}.png`
const isRS3 = code => (LEAGUE_META.rs3 || []).includes(code)

/* League as a column heading: icon + code, full name on hover */
const leagueHead = code => `
  <span class="ms-head" title="${esc(leagueName(code))}">
    ${iconImg(leagueIcon(code), { cls: "item-icon" })}
    <span>${esc(code)}</span>
  </span>`

/* ---------------- achievement emblems ---------------- */

const EMBLEMS = {
  // cut gem: perfect dragons
  perfect: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 10h20l8 10-18 20L6 20z" fill="currentColor"/>
      <path d="M6 20h36M14 10l6 10 4 20M34 10l-6 10-4 20M20 20l4-10 4 10" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>`,
  // five-point star inside a small laurel: league firsts
  first: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 9l4.3 9.1 9.9 1.2-7.3 6.8 1.9 9.8L24 31.1l-8.8 4.8 1.9-9.8-7.3-6.8 9.9-1.2z" fill="currentColor"/>
      <path d="M10 30c1 6 5 10 11 12M38 30c-1 6-5 10-11 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    </svg>`,
}

/* ---------------- trophies ---------------- */

const TROPHY_CLASS = {
  "cap": "trophy-cap", "top 100": "trophy-top100", "true dragon": "trophy-truedragon", "dragon": "trophy-dragon",
  "rune": "trophy-rune", "adamant": "trophy-adamant", "mithril": "trophy-mithril", "steel": "trophy-steel",
  "iron": "trophy-iron", "bronze": "trophy-bronze",
}
const trophyClass = trophy => TROPHY_CLASS[norm(trophy)] || ""
const trophyBadge = trophy => trophy ? `<span class="trophy-badge ${trophyClass(trophy)}">${esc(trophy)}</span>` : ""

/* ---------------- dropdown with icons ----------------
   A normal <select> can't show icons, group headings or greyed-out options, so this one is built by hand.
   drawMenuSelect(el, {label, value, onChange, groups: [{title, options: [{value, label, icon, disabled}]}]}) */
function drawMenuSelect(el, { label, groups, value, onChange }) {
  const all = groups.flatMap(g => g.options)
  let current = all.find(o => o.value === value) || all.find(o => !o.disabled) || all[0]
  const icon = o => o.icon ? `<img class="select-icon" src="${esc(o.icon)}" alt="" onerror="this.remove()">` : ""

  el.classList.add("menu-select")
  el.innerHTML = `
    <button type="button" class="select-button" aria-haspopup="listbox" aria-expanded="false">
      <span class="select-text">
        <span class="select-label">${esc(label)}</span>
        <span class="select-value"></span>
      </span>
      <span class="select-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </span>
    </button>
    <div class="select-menu hidden" role="listbox">
      ${groups.map(g => `
        ${g.title ? `<div class="select-group">${esc(g.title)}</div>` : ""}
        ${g.options.map(o => `
          <button type="button" class="select-option" role="option" data-value="${esc(o.value)}" ${o.disabled ? "disabled" : ""}>
            ${icon(o)}<span>${esc(o.label)}</span>
          </button>`).join("")}`).join("")}
    </div>`

  const button = el.querySelector(".select-button")
  const menu = el.querySelector(".select-menu")
  const paint = () => {
    el.querySelector(".select-value").innerHTML = current ? `${icon(current)}<span>${esc(current.label)}</span>` : ""
    menu.querySelectorAll(".select-option").forEach(b =>
      b.setAttribute("aria-selected", String(b.dataset.value === current?.value)))
  }
  const toggle = open => {
    menu.classList.toggle("hidden", !open)
    button.setAttribute("aria-expanded", String(open))
  }

  button.onclick = () => toggle(menu.classList.contains("hidden"))
  menu.onclick = e => {
    const b = e.target.closest(".select-option")
    if (!b || b.disabled) return
    current = all.find(o => o.value === b.dataset.value)
    paint()
    toggle(false)
    button.focus()
    onChange(current.value)
  }
  el.onkeydown = e => { if (e.key === "Escape") { toggle(false); button.focus() } }
  el._close = () => toggle(false)
  paint()
}

/* One listener for the whole page: a click outside an open dropdown closes it */
document.addEventListener("click", e => {
  document.querySelectorAll(".menu-select").forEach(el => { if (!el.contains(e.target)) el._close?.() })
})
