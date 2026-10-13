/* =========================================================
   Player search in the top bar — League Archive
   Included on every page, after common.js. It adds its own box to the top bar:
     <script src="/nav-search.js"></script>
   Type a name to see matching players (any player on the site); pick one to open their profile.
   Uses: common.js
   Reads: data/index/<bucket>.json
   ========================================================= */

(() => {
  const nav = document.querySelector(".topnav")
  if (!nav) return

  const href = r => `/player.html?id=${encodeURIComponent(r[0])}&key=${encodeURIComponent(r[2])}`

  const el = document.createElement("div")
  el.className = "search nav-search"
  el.innerHTML = `
    <input type="text" placeholder="Search players..." autocomplete="off" aria-label="Search players">
    <button type="button" class="search-clear" aria-label="Clear search" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <button type="button" class="search-go" aria-label="Search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>
    </button>
    <div class="search-results" role="listbox"></div>`
  // sits between the logo and the page links
  nav.insertBefore(el, nav.querySelector(".topnav-links"))

  const input = el.querySelector("input")
  const box = el.querySelector(".search-results")
  const clear = el.querySelector(".search-clear")
  let results = [], focus = -1, timer

  const close = () => { box.classList.remove("is-open"); focus = -1 }

  function render() {
    if (!alnum(input.value)) { box.innerHTML = ""; close(); return }
    box.classList.add("is-open")
    box.innerHTML = results.length ? results.map((r, i) => `
      <a class="search-result ${i === focus ? "is-focus" : ""}" href="${href(r)}">
        <div class="name">${esc(r[1])}${r[6] ? ` <span class="search-alias">(${esc(r[6])})</span>` : ""}</div>
        <div class="meta"><span>OSRS ${fmt(r[3]) || 0}</span><span>RS3 ${fmt(r[4]) || 0}</span><span>Combined ${fmt(r[5]) || 0}</span></div>
      </a>`).join("") : `<div class="search-result empty">No players found</div>`
  }

  // exact name first, then names starting with it, then names containing it
  const score = (r, q) => {
    // a row filed under a linked account's name (r[6]) is matched on that name
    const names = r[6] ? [alnum(r[6])] : [alnum(r[1]), alnum(r[2])]
    if (names.some(n => n === q)) return 3
    if (names.some(n => n.startsWith(q))) return 2
    if (names.some(n => n.includes(q))) return 1
    return 0
  }

  const rowsFor = async bucket => (await getJSON(`/data/index/${bucket}.json`)) || []

  async function run() {
    const q = alnum(input.value)
    if (!q) { results = []; render(); return }
    const rows = await rowsFor(bucketFor(q))
    if (alnum(input.value) !== q) return     // the text changed while loading
    results = rows.map(r => ({ r, s: score(r, q) })).filter(x => x.s)
      .sort((a, b) => b.s - a.s || (b.r[5] || 0) - (a.r[5] || 0))
      .slice(0, 12).map(x => x.r)
    focus = -1
    render()
  }

  input.addEventListener("input", () => {
    clear.hidden = !input.value
    clearTimeout(timer)
    timer = setTimeout(run, 120)
  })
  // the X empties the box and closes the results
  clear.addEventListener("click", () => {
    input.value = ""
    clear.hidden = true
    results = []
    render()
    input.focus()
  })
  input.addEventListener("focus", () => { if (results.length) render() })
  input.addEventListener("keydown", e => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && results.length) {
      e.preventDefault()
      focus = (focus + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length
      render()
    } else if (e.key === "Enter" && results.length) {
      location.href = href(results[Math.max(focus, 0)])
    } else if (e.key === "Escape") {
      close()
      input.blur()
    }
  })
  el.querySelector(".search-go").addEventListener("click", () => {
    if (results[0]) location.href = href(results[0])
    else input.focus()
  })
  document.addEventListener("click", e => { if (!el.contains(e.target)) close() })
})()
