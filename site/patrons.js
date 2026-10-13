/* =========================================================
   Patrons — League Archive
   Included on every page, after common.js:  <script src="/patrons.js"></script>
   - Wherever a patron's name links to their profile, it gets their patron icon and dye colour.
   - A patron's own profile is dyed: colours, banner, top-bar logo and the logo above the name.
   Reads: data/patrons.json   {player key: tier}
   Files per tier: /icons/patrons/<tier>.png (small icon), /img/patrons/<tier>.webp (logo)
   ========================================================= */

(async () => {
  const patrons = (await getJSON("/data/patrons.json")) || {}
  const anyPatrons = Object.keys(patrons).length > 0
  const preview = !!document.getElementById("dyePicker")   // the Patreon page dyes itself with no patrons needed
  if (!anyPatrons && !preview) return
  const tierOf = url => patrons[(new URL(url, location.href).searchParams.get("key") || "").toLowerCase()]

  // the profile being viewed
  // (the live host drops ".html" from the address, so match /player with or without it)
  const own = /\/player(\.html)?$/.test(location.pathname) && tierOf(location.href)
  if (own) {
    document.documentElement.classList.add("dyed", `dye-${own}`)
    document.querySelectorAll(".brand-logo img, img.avatar").forEach(img => { img.src = `/img/patrons/${own}.webp` })
  }

  // gold: plain text is wrapped in its own span so it can take the moving gold, like the name
  const wrapText = parent => [...parent.childNodes].forEach(n => {
    if (n.nodeType === 3 && n.textContent.trim()) {
      const s = document.createElement("span"); s.className = "gold-txt"; n.replaceWith(s); s.append(n)
    }
  })

  // names anywhere on the page, including ones drawn later
  const mark = () => anyPatrons && document.querySelectorAll('a[href*="/player.html"]:not([data-patron])').forEach(a => {
    const tier = tierOf(a.href)
    a.dataset.patron = tier || ""
    if (!tier) return
    const el = a.querySelector(".name") || a   // search results keep the name in their own line
    el.classList.add("patron", `dye-${tier}`)
    const row = a.closest("tr")
    row?.classList.add("patron-row", `dye-${tier}`)   // in a table, the whole row can take the dye
    if (row && tier === "gold") row.querySelectorAll("td").forEach(wrapText)
    if (tier === "gold" && el.classList.contains("player-pill")) wrapText(el)
    el.insertAdjacentHTML("afterbegin", `<img class="patron-icon" src="/icons/patrons/${tier}.png" alt="" onerror="this.remove()">`)
  })
  // blossom: petals drifting down inside the profile's total boxes and the player's rows
  const R = (a, b) => a + Math.random() * (b - a)
  const petals = (host, box, n, size, time, sway) => {
    const layer = document.createElement("div")
    layer.className = "petal-fall"
    for (let k = 0; k < n; k++) {
      const t = R(...time)
      layer.insertAdjacentHTML("beforeend", `<i style="--x:${R(-3, 97)}%;--t:${t}s;--d:-${R(0, t)}s;--w:${R(...sway)}px;--s:${R(...size)}px;--o:${R(.6, .95)};--ax:${R(-1, 1).toFixed(2)},${R(.3, 1).toFixed(2)},${R(-.4, .4).toFixed(2)}"><b><img src="/img/patrons/blossom_petal${1 + k % 4}.png" alt=""></b></i>`)
    }
    layer.style.setProperty("--fall", (box.offsetHeight + 40) + "px")
    layer.style.setProperty("--rw", box.offsetWidth + "px")
    layer.style.setProperty("--rh", box.offsetHeight + "px")
    host.prepend(layer)
  }
  const blossom = () => {
    if (document.documentElement.classList.contains("dye-blossom"))   // their profile (or the Patreon page preview)
      document.querySelectorAll(".total-card:not(.has-petals)").forEach(c => { c.classList.add("has-petals"); petals(c, c, 6, [10, 18], [6, 10], [10, 24]) })
    document.querySelectorAll("tr.patron-row.dye-blossom:not([data-petals])").forEach(r => {
      if (!r.offsetWidth) return
      r.dataset.petals = "1"
      petals(r.cells[0], r, Math.round(r.offsetWidth / 120), [7, 12], [5, 8], [8, 18])
    })
  }

  mark()
  blossom()
  // pages draw names after loading (and again on every tab, page or search): check once per screen update,
  // however many changes happened in it (including the ones made here)
  let queued = false
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; mark(); blossom() })
  }).observe(document.body, { childList: true, subtree: true })
})()
