/* app.js - Leaderboard + global search (bucketed index) */

let LEADERBOARDS = null; // leaderboards.json
let PLAYERS_TOP = null;  // players_top.json (map id -> player record)

// cache index buckets in memory: bucket -> rows
const INDEX_CACHE = new Map();

// -------------- helpers --------------

function norm(s) {
  return (s || "").toLowerCase().replace(/_/g, " ").trim();
}

// bucket logic MUST match python:
// - remove non-alnum
// - take first 2 chars
// - 1 char -> x_
// - empty -> "__"
function bucketFor(query) {
  const s = norm(query).replace(/[^a-z0-9]/g, "");
  if (s.length === 0) return "__";
  if (s.length === 1) return s[0] + "_";
  return s.slice(0, 2);
}

function fmt(n) {
  if (n === null || n === undefined) return "";
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toLocaleString();
}

function getActiveTab() {
  const h = (location.hash || "").replace("#", "");
  if (h === "rs3" || h === "combined" || h === "osrs") return h;
  return "osrs";
}

function setActiveTab(tab) {
  location.hash = `#${tab}`;
}

// -------------- load data --------------

async function loadCoreData() {
  // Adjust these paths if your site data is elsewhere.
  // From your build script: site/data/...
  const [lb, pt] = await Promise.all([
    fetch("/site/data/leaderboards.json").then(r => r.json()),
    fetch("/site/data/players_top.json").then(r => r.json()),
  ]);

  LEADERBOARDS = lb;
  PLAYERS_TOP = pt;
}

// -------------- leaderboard rendering --------------

function renderLeaderboard(tabName) {
  if (!LEADERBOARDS || !PLAYERS_TOP) return;

  const tab = LEADERBOARDS.tabs[tabName];
  const ids = tab.top;
  const leagues = tab.leagues;

  const tbody = document.getElementById("leaderboardBody");
  const thead = document.getElementById("leaderboardHead");

  if (!tbody || !thead) return;

  // Build header
  thead.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Player</th>
      <th>Total</th>
      ${leagues.map(c => `<th>${c}</th>`).join("")}
    </tr>
  `;

  // Build rows
  const rowsHtml = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = PLAYERS_TOP[id];
    if (!p) continue; // in case of mismatch

    const totalKey = tab.total; // "osrs_total" | "rs3_total" | "combined_total"
    const total = p[totalKey] ?? 0;

    // leagues stored as { "TL": [points, rank], ... }
    const cols = leagues.map(code => {
      const arr = p.leagues?.[code];
      const pts = arr ? arr[0] : null;
      return `<td>${pts === null || pts === undefined ? "" : fmt(pts)}</td>`;
    }).join("");

    // link to player page; include key so player page can compute bucket without searching
    rowsHtml.push(`
      <tr>
        <td>${i + 1}</td>
        <td><a href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(p.key)}">${p.name}</a></td>
        <td>${fmt(total)}</td>
        ${cols}
      </tr>
    `);
  }

  tbody.innerHTML = rowsHtml.join("");
}

function syncTabUI(tabName) {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  });
}

// -------------- global search --------------

async function loadIndexBucket(bucket) {
  if (INDEX_CACHE.has(bucket)) return INDEX_CACHE.get(bucket);

  const res = await fetch(`/site/data/index/${bucket}.json`, { cache: "force-cache" });
  if (!res.ok) {
    INDEX_CACHE.set(bucket, []);
    return [];
  }
  const data = await res.json();
  INDEX_CACHE.set(bucket, data);
  return data;
}

// row format:
// [id, name, key, osrs_total, rs3_total, combined_total]
function scoreRow(row, q) {
  const name = (row[1] || "").toLowerCase();
  const key = (row[2] || "").toLowerCase();

  if (key === q || name === q) return 1000;
  if (key.startsWith(q) || name.startsWith(q)) return 800;

  // word-start bonus
  const words = key.split(" ");
  if (words.some(w => w.startsWith(q))) return 650;

  if (key.includes(q) || name.includes(q)) return 400;

  return -Infinity;
}

function renderSearchResults(results, q) {
  const box = document.getElementById("searchResults");
  if (!box) return;

  if (!q) {
    box.innerHTML = "";
    return;
  }

  if (!results.length) {
    box.innerHTML = `<div class="result empty">No matches</div>`;
    return;
  }

  box.innerHTML = results.map(row => {
    const id = row[0];
    const name = row[1];
    const key = row[2];
    const osrs = row[3];
    const rs3 = row[4];
    const combined = row[5];

    return `
      <a class="result" href="/player.html?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}">
        <div class="name">${name}</div>
        <div class="meta">
          <span>OSRS: ${fmt(osrs)}</span>
          <span>RS3: ${fmt(rs3)}</span>
          <span>Total: ${fmt(combined)}</span>
        </div>
      </a>
    `;
  }).join("");
}

function debounce(fn, ms = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const onSearchInput = debounce(async () => {
  const input = document.getElementById("search");
  const clearBtn = document.getElementById("clear");
  if (!input) return;

  const qRaw = input.value;
  const q = norm(qRaw);

  if (clearBtn) clearBtn.style.visibility = q ? "visible" : "hidden";

  if (!q) {
    renderSearchResults([], "");
    return;
  }

  // Use bucket from query, then filter within that bucket
  const b = bucketFor(q);
  const bucketRows = await loadIndexBucket(b);

  const qAlnum = q.replace(/[^a-z0-9]/g, "");
  if (!qAlnum) {
    renderSearchResults([], q);
    return;
  }

  const scored = [];
  for (const row of bucketRows) {
    const s = scoreRow(row, q);
    if (s > -Infinity) {
      scored.push({ row, s, total: row[5] || 0 }); // combined_total as secondary sort
    }
  }

  scored.sort((a, b) => (b.s - a.s) || (b.total - a.total) || String(a.row[2]).localeCompare(String(b.row[2])));
  const top = scored.slice(0, 20).map(x => x.row);

  renderSearchResults(top, q);
}, 120);

function wireSearchUI() {
  const input = document.getElementById("search");
  const clearBtn = document.getElementById("clear");

  if (input) input.addEventListener("input", onSearchInput);

  if (clearBtn) {
    clearBtn.style.visibility = "hidden";
    clearBtn.addEventListener("click", () => {
      if (!input) return;
      input.value = "";
      clearBtn.style.visibility = "hidden";
      renderSearchResults([], "");
      input.focus();
    });
  }
}

// -------------- tabs wiring --------------

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (!tab) return;
      setActiveTab(tab);
    });
  });

  window.addEventListener("hashchange", () => {
    const tab = getActiveTab();
    syncTabUI(tab);
    renderLeaderboard(tab);
  });
}

// -------------- boot --------------

(async function boot() {
  await loadCoreData();

  wireTabs();
  wireSearchUI();

  const tab = getActiveTab();
  syncTabUI(tab);
  renderLeaderboard(tab);
})();
