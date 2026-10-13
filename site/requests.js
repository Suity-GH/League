/* =========================================================
   Requests page — League Archive
   A form for name changes, alt links, link corrections and Perfect Dragon proof.
   Answers are posted to a Google Form, so they land as rows in its linked Google Sheet.
   Uses: common.js
   Reads: data/leagues.json, data/index/<bucket>.json
   ========================================================= */

/* ---------------- your Google Form ----------------
   FORM_ID: the long id in the form's public link, .../forms/d/e/<FORM_ID>/viewform
   ENTRY:   the "entry.123456" number of each question (see the setup notes). */
const FORM_ID = "1FAIpQLSe3CkzkqM9Pu9yDTFbY8H60-kYS3KLf71ZIBArI-Oppviw4xg"
const ENTRY = {
  type: "552441504",        // Request type
  name: "1344055340",        // Player name
  other: "1146672786",       // Other name(s)
  leagues: "561719300",     // Leagues
  discord: "803609925",     // Discord name
  screenshot: "954896043",  // Screenshot link
  note: "342758290",        // Note
}

const TYPES = [
  { id: "name", label: "Name change",
    intro: "Your old name will be shown on your profile under \"Also known as\", and searching for it will find you.",
    name: "Current name", other: "Previous name", otherHint: "More than one? Separate them with commas." },
  { id: "alt", label: "Link an alt",
    intro: "Your accounts are shown as one player, keeping the best result from each league.",
    name: "Main account", other: "Alt account", otherHint: "More than one? Separate them with commas." },
  { id: "fix", label: "Correct a link",
    intro: "Report a name that is linked to the wrong player, or ask for accounts to be unlinked.",
    name: "Player name", other: "Name that should not be linked" },
  { id: "dragon", label: "Perfect Dragon proof",
    intro: "If a league shows you without a Dragon trophy you earned, pick the league and send proof.",
    name: "Player name", leagues: true },
]

const $ = id => document.getElementById(id)
let type = TYPES[0], leagues = { order: [], leagues: {} }

const field = (id, label, o = {}) => `
  <label class="req-field">
    <span class="req-label">${esc(label)}${o.optional ? ` <em>optional</em>` : ""}</span>
    ${o.area ? `<textarea id="${id}" rows="3" maxlength="500"></textarea>`
             : `<input id="${id}" type="${o.type || "text"}" maxlength="${o.max || 12}" autocomplete="off" placeholder="${esc(o.placeholder || "")}">`}
    ${o.hint ? `<span class="req-hint">${esc(o.hint)}</span>` : ""}
    <span class="req-warn" data-for="${id}"></span>
  </label>`

function render() {
  drawMenuSelect($("types"), {
    label: "Request type",
    groups: [{ options: TYPES.map(t => ({ value: t.id, label: t.label })) }],
    value: type.id,
    onChange: v => { type = TYPES.find(t => t.id === v); render() },
  })
  $("intro").textContent = type.intro
  $("fields").innerHTML =
    field("name", type.name)
    + (type.other ? field("other", type.other, { hint: type.otherHint, max: 80 }) : "")
    + (type.leagues ? `<div class="req-field"><span class="req-label">League</span>
        <div class="req-leagues">${leagues.order.map(c => `<label><input type="checkbox" value="${esc(c)}"><span>${esc(leagues.leagues[c]?.name || c)}</span></label>`).join("")}</div>
        <span class="req-warn" data-for="leagues"></span></div>` : "")
    + field("discord", "Discord name", { optional: true, max: 40, hint: "Only used if there is a question about your request." })
    + field("screenshot", "Screenshot link", { optional: true, type: "url", max: 300, placeholder: "https://" })
    + field("note", "Note", { optional: true, area: true })
  $("status").textContent = ""
  // a typo is the easiest mistake to make, so say when the name isn't on the site
  $("name").addEventListener("blur", checkName)
}

const warn = (id, text) => {
  const el = document.querySelector(`.req-warn[data-for="${id}"]`)
  if (el) el.textContent = text || ""
  return !text
}

async function checkName() {
  const v = $("name").value.trim()
  if (!v) return
  const rows = await getJSON(`/data/index/${bucketFor(v)}.json`)
  if (!rows) return   // no file for these letters: nothing to say
  const found = rows.some(r => alnum(r[6] || r[1]) === alnum(v) || alnum(r[2]) === alnum(v))
  if ($("name").value.trim() === v) warn("name", found ? "" : "No player with this name is on the site. Check the spelling; you can still send it.")
}

async function submit(e) {
  e.preventDefault()
  const val = id => $(id)?.value.trim() || ""
  const picked = [...document.querySelectorAll(".req-leagues input:checked")].map(i => i.value)
  let ok = warn("name", val("name") ? "" : "Enter a name.")
  if (type.other) ok = warn("other", val("other") ? "" : "Enter a name.") && ok
  if (type.leagues) ok = warn("leagues", picked.length ? "" : "Pick at least one league.") && ok
  ok = warn("screenshot", !val("screenshot") || /^https?:\/\/\S+\.\S+/.test(val("screenshot")) ? "" : "This should be a link starting with https://") && ok
  if (!ok) return
  if (document.querySelector(".req-trap").value) return   // a bot filled the hidden box
  if (!FORM_ID) { $("status").textContent = "The form has not been connected yet."; return }

  const answers = { type: type.label, name: val("name"), other: val("other"), leagues: picked.join(", "),
                    discord: val("discord"), screenshot: val("screenshot"), note: val("note") }
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(answers)) if (v && ENTRY[k]) body.append(`entry.${ENTRY[k]}`, v)

  const btn = document.querySelector(".req-submit")
  btn.disabled = true
  $("status").textContent = "Sending..."
  try {
    // Google does not let the page read its reply, so only a network failure can be detected here
    await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, { method: "POST", mode: "no-cors", body })
    $("form").classList.add("hidden")
    $("done").classList.remove("hidden")
  } catch {
    $("status").textContent = "Could not send. Check your connection and try again."
  }
  btn.disabled = false
}

$("form").addEventListener("submit", submit)
// a warning goes away as soon as its answer is changed
$("fields").addEventListener("input", e => warn(e.target.type === "checkbox" ? "leagues" : e.target.id, ""))
$("again").addEventListener("click", () => {
  $("done").classList.add("hidden")
  $("form").classList.remove("hidden")
  render()
})

getJSON("/data/leagues.json").then(d => { if (d) leagues = d }).finally(render)
