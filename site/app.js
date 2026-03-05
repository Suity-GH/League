const DATA_URL = "../data/players.json"

let players = {}

const searchBox = document.getElementById("q")
const resultBox = document.getElementById("result")
const statusBox = document.getElementById("status")

function norm(s){
    return s.toLowerCase().replaceAll("_"," ").trim()
}

function comma(n){
    if(n === null || n === undefined) return "-"
    return Number(n).toLocaleString()
}

async function loadData(){

    statusBox.classList.remove("hidden")
    statusBox.innerText = "Loading player data..."

    try{

        const r = await fetch(DATA_URL)
        players = await r.json()

        statusBox.classList.add("hidden")

    }catch(e){

        statusBox.classList.remove("hidden")
        statusBox.innerText = "Failed to load players.json"

    }
}

function renderPlayer(p){

    let leaguesHTML = ""

    for(const [league,data] of Object.entries(p.leagues)){

        leaguesHTML += `
        <tr>
            <td>${league}</td>
            <td class="points">${comma(data.points)}</td>
            <td>${data.trophy}</td>
        </tr>
        `
    }

    resultBox.innerHTML = `

    <div class="resultTop">

        <div>
            <h2 class="rsn">${p.rsn}</h2>
        </div>

    </div>

    <div class="totals">

        <div class="stat">
            <div class="k">OSRS Total</div>
            <div class="v">${comma(p.osrs_total)}</div>
            <div class="r">Rank ${p.ranks.osrs}</div>
        </div>

        <div class="stat">
            <div class="k">RS3 Total</div>
            <div class="v">${comma(p.rs3_total)}</div>
            <div class="r">Rank ${p.ranks.rs3}</div>
        </div>

        <div class="stat">
            <div class="k">Combined</div>
            <div class="v">${comma(p.combined_total)}</div>
            <div class="r">Rank ${p.ranks.combined}</div>
        </div>

    </div>

    <table class="table">

        <thead>
            <tr>
                <th>League</th>
                <th style="text-align:right;">Points</th>
                <th>Trophy</th>
            </tr>
        </thead>

        <tbody>
            ${leaguesHTML}
        </tbody>

    </table>
    `

    resultBox.classList.remove("hidden")
}

searchBox.addEventListener("input", e=>{

    const q = norm(e.target.value)

    if(!q){
        resultBox.classList.add("hidden")
        resultBox.innerHTML = ""
        return
    }

    const player = players[q]

    if(!player){
        resultBox.classList.add("hidden")
        resultBox.innerHTML = ""
        return
    }

    renderPlayer(player)

})

loadData()
