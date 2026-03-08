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

function norm(s) {
  return (s || "").toLowerCase().replace(/_/g, " ").trim()
}

function fmt(n) {
  if (n === null || n === undefined) return ""
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return x.toLocaleString()
}

function bucketForKey(key) {
  const s = norm(key).replace(/[^a-z0-9]/g, "")

  if (s.length === 0) return "__"
  if (s.length === 1) return s[0] + "_"

  return s.slice(0, 2)
}

function getParams() {
  const url = new URL(window.location.href)
  return {
    id: url.searchParams.get("id") || "",
    key: url.searchParams.get("key") || ""
  }
}

function trophyClass(trophy) {
  const t = norm(trophy)

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

function renderSummary(player) {
  const box = document.getElementById("profileSummary")
  if (!box) return

  box.innerHTML = `
    <div class="statcard">
      <div class="statlabel">OSRS Total</div>
      <div class="statvalue">${fmt(player.osrs_total)}</div>
      ${player.osrs_rank ? `<div class="statrank">Rank ${fmt(player.osrs_rank)}</div>` : ""}
    </div>

    <div class="statcard">
      <div class="statlabel">RS3 Total</div>
      <div class="statvalue">${fmt(player.rs3_total)}</div>
      ${player.rs3_rank ? `<div class="statrank">Rank ${fmt(player.rs3_rank)}</div>` : ""}
    </div>

    <div class="statcard">
      <div class="statlabel">Combined Total</div>
      <div class="statvalue">${fmt(player.combined_total)}</div>
      ${player.combined_rank ? `<div class="statrank">Rank ${fmt(player.combined_rank)}</div>` : ""}
    </div>
  `
}

function buildLeagueRows(player, leagueOrder) {
  return leagueOrder.map(code => {
    const row = (player.leagues && player.leagues[code]) ? player.leagues[code] : [null, null, null]
    const points = row[0]
    const rank = row[1]
    const trophy = row[2]
    const leagueName = LEAGUE_NAMES[code]
    const leagueIcon = LEAGUE_ICONS[code]

    return `
      <tr>
        <td>
          <div class="league-name-cell">
            ${leagueIcon ? `<img class="league-icon" src="${leagueIcon}" alt="${leagueName} icon">` : ""}
            <span>${leagueName}</span>
          </div>
        </td>
        <td>${points == null ? "" : fmt(points)}</td>
        <td>${rank == null ? "" : fmt(rank)}</td>
        <td>${trophy ? `<span class="trophy-badge ${trophyClass(trophy)}">${trophy}</span>` : ""}</td>
      </tr>
    `
  }).join("")
}

function renderLeagues(player) {
  const osrsBody = document.getElementById("osrsLeagueBody")
  const rs3Body = document.getElementById("rs3LeagueBody")

  if (!osrsBody || !rs3Body) return

  const osrsOrder = ["TL", "TBL", "SRL", "TBLR", "REL"]
  const rs3Order = ["CATA"]

  osrsBody.innerHTML = buildLeagueRows(player, osrsOrder)
  rs3Body.innerHTML = buildLeagueRows(player, rs3Order)
}

function showError(message) {
  const err = document.getElementById("profileError")
  if (err) err.style.display = "block"

  const subtitle = document.getElementById("playerSubtitle")
  if (subtitle) subtitle.textContent = message || "Unable to load player data."
}

/* =========================================
   Search
========================================= */

const INDEX_CACHE = new Map()

function bucketFor(query) {
  const s = norm(query).replace(/[^a-z0-9]/g, "")

  if (s.length === 0) return "__"
  if (s.length === 1) return s[0] + "_"

  return s.slice(0, 2)
}

async function loadIndexBucket(bucket) {
  if (INDEX_CACHE.has(bucket)) return INDEX_CACHE.get(bucket)

  const res = await fetch(`/data/index/${bucket}.json`)

  if (!res.ok) {
    INDEX_CACHE.set(bucket, [])
    return []
  }

  const data = await res.json()
  INDEX_CACHE.set(bucket, data)
  return data
}

/*
row format:
[id, name, key, osrs_total, rs3_total, combined_total]
*/
function scoreRow(row, qAlnum) {
  const nameAlnum = String(row[1] || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const keyAlnum = String(row[2] || "").toLowerCase().replace(/[^a-z0-9]/g, "")

  if (!qAlnum) return -Infinity

  if (keyAlnum === qAlnum || nameAlnum === qAlnum) return 1000
  if (keyAlnum.startsWith(qAlnum) || nameAlnum.startsWith(qAlnum)) return 800
  if (keyAlnum.includes(qAlnum) || nameAlnum.includes(qAlnum)) return 400

  return -Infinity
}

function renderSearchResults(results, q) {
  const box = document.getElementById("searchResults")
  if (!box) return

  if (!q) {
    box.innerHTML = ""
    return
  }

  if (!results.length) {
    box.innerHTML = `<div class="result empty">No matches</div>`
    return
  }

  box.innerHTML = results.map(row => {
    const id = row[0]
    const name = row[1]
    const key = row[2]
    const osrs = row[3]
    const rs3 = row[4]
    const combined = row[5]

    return `
      <a class="result" href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}">
        <div class="name">${name}</div>
        <div class="meta">
          <span>OSRS: ${fmt(osrs)}</span>
          <span>RS3: ${fmt(rs3)}</span>
          <span>Total: ${fmt(combined)}</span>
        </div>
      </a>
    `
  }).join("")
}

function debounce(fn, ms = 120) {
  let t

  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

const onSearchInput = debounce(async () => {
  const input = document.getElementById("search")
  const clearBtn = document.getElementById("clear")

  if (!input) return

  const raw = input.value
  const q = norm(raw)
  const qAlnum = q.replace(/[^a-z0-9]/g, "")

  if (clearBtn) {
    clearBtn.style.visibility = q ? "visible" : "hidden"
  }

  if (!qAlnum) {
    renderSearchResults([], "")
    return
  }

  const bucket = bucketFor(q)
  const bucketRows = await loadIndexBucket(bucket)

  const scored = []

  for (const row of bucketRows) {
    const s = scoreRow(row, qAlnum)
    if (s > -Infinity) {
      scored.push({ row, s, total: row[5] || 0 })
    }
  }

  scored.sort((a, b) =>
    (b.s - a.s) ||
    (b.total - a.total) ||
    String(a.row[2]).localeCompare(String(b.row[2]))
  )

  const top = scored.slice(0, 20).map(x => x.row)
  renderSearchResults(top, q)
}, 120)

function wireSearchUI() {
  const input = document.getElementById("search")
  const clearBtn = document.getElementById("clear")

  if (input) {
    input.addEventListener("input", onSearchInput)
  }

  if (clearBtn) {
    clearBtn.style.visibility = "hidden"

    clearBtn.addEventListener("click", () => {
      if (!input) return

      input.value = ""
      clearBtn.style.visibility = "hidden"
      renderSearchResults([], "")
      input.focus()
    })
  }
}

async function loadPlayer() {
  const params = getParams()
  const id = params.id
  const key = params.key

  if (!id || !key) {
    showError("Missing player id or key.")
    return
  }

  const bucket = bucketForKey(key)
  const res = await fetch(`/data/details/${bucket}.json`)

  if (!res.ok) {
    showError("Unable to load player data.")
    return
  }

  const data = await res.json()
  const player = data[id]

  if (!player) {
    showError("Player not found.")
    return
  }

  document.title = `${player.name} - Player Profile`

  const nameEl = document.getElementById("playerName")
  const subtitleEl = document.getElementById("playerSubtitle")

  if (nameEl) nameEl.textContent = player.name
  if (subtitleEl) subtitleEl.textContent = `Profile for ${player.name}`

  renderSummary(player)
  renderLeagues(player)
}

async function boot() {
  wireSearchUI()
  await loadPlayer()
}

boot().catch(err => {
  console.error(err)
  showError("Unable to load player data.")
})
