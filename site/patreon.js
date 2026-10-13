/* =========================================================
   Patreon page — League Archive
   Shows a mock profile, hiscores row, name pill and dropdown, dyed in whichever
   dye is picked. Uses the real dye styles from theme.css, so it always matches the site.
   Uses: common.js
   ========================================================= */

const DYES = [
  { tier: "", name: "Default", colour: "#e7c070" },
  { tier: "barrows", name: "Barrows", colour: "#8fb58d" },
  { tier: "shadow", name: "Shadow", colour: "#c77ad0" },
  { tier: "ice", name: "Ice", colour: "#4ec3f2" },
  { tier: "third_age", name: "Third Age", colour: "#dcd8dc" },
  { tier: "blood", name: "Blood", colour: "#e0343a" },
  { tier: "blossom", name: "Blossom", colour: "#ffa1c7" },
  { tier: "gold", name: "Gold", colour: "#f2d27a" },
]

const LEAGUES = [["tl", "Twisted"], ["tbl", "Trailblazer"], ["srl", "Shattered Relics"], ["tblr", "Trailblazer Reloaded"], ["rel", "Raging Echoes"], ["dpl", "Demonic Pacts"]]

const root = document.documentElement
const mock = document.getElementById("dyeMock")  // inside #profile, so it takes the profile dye styles
const picker = document.getElementById("dyePicker")

// gold names move like the frame, so their text sits in its own span (patrons.js does the same on real pages)
const txt = (s, tier) => tier === "gold" ? `<span class="gold-txt">${s}</span>` : s
const nameLink = (tier, cls = "") => tier
  ? `<a href="#" class="${cls} patron dye-${tier}"><img class="patron-icon" src="/icons/patrons/${tier}.png" alt="">${txt("Your Name", tier)}</a>`
  : `<a href="#" class="${cls}">Your Name</a>`

function render(tier) {
  const row = tier ? `class="patron-row dye-${tier}"` : ""
  mock.innerHTML = `
    <div class="totals">
      <div class="total-card"><div class="total-label">OSRS Total</div><div class="total-value">312,480</div><div class="total-rank">Rank 54</div></div>
      <div class="total-card"><div class="total-label">RS3 Total</div><div class="total-value">96,215</div><div class="total-rank">Rank 312</div></div>
      <div class="total-card"><div class="total-label">Combined Total</div><div class="total-value">408,695</div><div class="total-rank">Rank 47</div></div>
    </div>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Achievements</h2></div>
      <div class="ach-grid">
        <div class="ach-badge ach-osrs"><div class="ach-emblem"><div class="ach-face">${EMBLEMS.perfect}</div></div>
          <div class="ach-text"><div class="ach-eyebrow">Perfect Dragon</div><div class="ach-title">Old School</div></div>
          <div class="ach-meta"><span class="ach-chip">Every OSRS league</span></div></div>
        <div class="ach-badge ach-first"><div class="ach-emblem"><div class="ach-face">${EMBLEMS.first}</div></div>
          <div class="ach-text"><div class="ach-eyebrow">League First</div><div class="ach-title">First to 99 Slayer</div></div>
          <div class="ach-meta"><span class="ach-chip">Demonic Pacts</span></div></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Old School Leagues</h2>
        <div class="select" id="mockSelect"></div>
      </div>
      <div class="table-wrap">
        <table class="hs-table">
          <thead><tr><th>League</th><th>Rank</th><th>Points</th><th>Trophy</th></tr></thead>
          <tbody>
            <tr><td>Raging Echoes</td><td>41</td><td>71,920</td><td><span class="trophy-badge trophy-top100">Top 100</span></td></tr>
            <tr><td>Trailblazer Reloaded</td><td>588</td><td>57,310</td><td><span class="trophy-badge trophy-truedragon">True Dragon</span></td></tr>
            <tr><td>Demonic Pacts</td><td>1,204</td><td>66,050</td><td><span class="trophy-badge trophy-dragon">Dragon</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>`
  document.getElementById("dyeElsewhere").innerHTML = `
    <section class="section dye-elsewhere">
      <div class="section-head"><h2 class="section-title">Hiscores and Achievements</h2></div>
      <p class="note">How your name looks on the hiscores and in the achievements lists.</p>
      <div class="table-wrap">
        <table class="hs-table hs-board">
          <tbody>
            <tr><td class="col-rank">46</td><td class="col-name"><a href="#">Another Player</a></td><td class="col-strong">409,120</td></tr>
            <tr ${row}><td class="col-rank">${txt("47", tier)}</td><td class="col-name">${nameLink(tier)}</td><td class="col-strong">${txt("408,695", tier)}</td></tr>
            <tr><td class="col-rank">48</td><td class="col-name"><a href="#">Someone Else</a></td><td class="col-strong">407,880</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pill-list dye-pills">${nameLink(tier, "player-pill")}<a href="#" class="player-pill">Another Player</a></div>
    </section>`

  document.querySelectorAll('main a[href="#"]').forEach(a => a.addEventListener("click", e => e.preventDefault()))

  // the same dropdown as the profile, so its menu can be seen in each dye
  drawMenuSelect(document.getElementById("mockSelect"), {
    label: "Select league",
    value: "dpl",
    groups: [{ title: "OSRS", options: LEAGUES.map(([c, l]) => ({ value: c, label: l, icon: `/icons/${c}.png`, disabled: c === "srl" })) }],
    onChange: () => {},
  })
}

function pick(tier) {
  root.className = root.className.replace(/\b(dyed|dye-\S+)\b/g, "").trim()
  if (tier) root.classList.add("dyed", `dye-${tier}`)
  document.querySelectorAll(".brand-logo img").forEach(img => { img.src = tier ? `/img/patrons/${tier}.webp` : "/img/logo.webp" })
  document.querySelectorAll("img.avatar").forEach(img => { img.src = tier ? `/img/patrons/${tier}.webp` : "/img/logo_200.webp" })
  picker.querySelectorAll(".dye-pick").forEach(b => b.setAttribute("aria-pressed", b.dataset.tier === tier))
  render(tier)
  history.replaceState(null, "", tier ? `#${tier}` : location.pathname)
}

// the picker buttons are the real name pills of each dye
picker.innerHTML = DYES.map(d => d.tier
  ? `<a href="#${d.tier}" class="player-pill patron dye-${d.tier} dye-pick" data-tier="${d.tier}" style="--c:${d.colour}" role="button" aria-pressed="false"><img class="patron-icon" src="/icons/patrons/${d.tier}.png" alt="">${txt(d.name, d.tier)}</a>`
  : `<a href="#" class="player-pill dye-pick" data-tier="" style="--c:${d.colour}" role="button" aria-pressed="false"><img class="patron-icon" src="/img/logo.webp" alt="">${d.name}</a>`).join("")
picker.addEventListener("click", e => {
  const b = e.target.closest(".dye-pick")
  if (!b) return
  e.preventDefault()
  pick(b.dataset.tier)
})

const start = location.hash.slice(1)
pick(DYES.some(d => d.tier === start) ? start : "")
