let scenarioId = 0;

function factorial(n) {
    if (n === 0) return 1;
    let f = 1;
    for (let i = 1; i <= n; i++) f *= i;
    return f;
}

function erlangC(agents, traffic) {
    if (agents <= traffic) return 1;
    let sum = 0;
    for (let i = 0; i < agents; i++) {
        sum += Math.pow(traffic, i) / factorial(i);
    }
    let top = (Math.pow(traffic, agents) / factorial(agents)) * (agents / (agents - traffic));
    return top / (sum + top);
}

function serviceLevel(agents, traffic, aht, targetTime) {
    if (agents <= traffic) return 0;
    let ec = erlangC(agents, traffic);
    let exp = Math.exp(-(agents - traffic) * (targetTime / aht));
    return 1 - ec * exp;
}

function addScenario() {
    scenarioId++;
    let id = scenarioId;
    let container = document.getElementById("container");
    let col = document.createElement("div");
    col.className = "scenario-col";
    col.id = `sc-${id}`;

    col.innerHTML = `
        <div class="scenario-header">
            <button class="btn-del" onclick="removeScenario(${id})">−</button>
            <input id="title-${id}" value="(Scenario ${id})" onchange="calculate(${id})">
        </div>
        <div class="data-cell"><input id="monthly-${id}" type="number" value="10000" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="aht-${id}" type="number" value="300" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="hoop-${id}" type="number" value="168" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="sl-${id}" type="number" value="80" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="slSec-${id}" type="number" value="20" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="concurrency-${id}" type="number" value="1" oninput="calculate(${id})"></div>
        
        <div class="data-cell"><div class="result-cell" id="weekly-${id}">-</div></div>
        <div class="data-cell"><div class="result-cell" id="hours-${id}">-</div></div>
        <div class="data-cell"><div class="result-cell" id="occ-${id}">-</div></div>
        <div class="data-cell"><div class="result-cell" id="fte-${id}">-</div></div>

        <div class="data-cell"><input id="break-${id}" type="number" value="6.25" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="coaching-${id}" type="number" value="7.75" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="outbound-${id}" type="number" value="0" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="absent-${id}" type="number" value="12" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="leave-${id}" type="number" value="0" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="scf-${id}" type="number" value="1.05" oninput="calculate(${id})"></div>
        
        <div class="data-cell"><div class="result-cell" id="hc-${id}">-</div></div>
    `;

    container.appendChild(col);
    calculate(id); // Run initial calc
}

function removeScenario(id) {
    document.getElementById(`sc-${id}`)?.remove();
}

function calculate(id) {
    let monthly = +document.getElementById(`monthly-${id}`).value || 0;
    let aht = +document.getElementById(`aht-${id}`).value || 0;
    let hoop = +document.getElementById(`hoop-${id}`).value || 1;
    let slTarget = (+document.getElementById(`sl-${id}`).value || 0) / 100;
    let slSec = +document.getElementById(`slSec-${id}`).value || 20;
    let concurrency = +document.getElementById(`concurrency-${id}`).value || 1;

    let brk = (+document.getElementById(`break-${id}`).value || 0) / 100;
    let coaching = (+document.getElementById(`coaching-${id}`).value || 0) / 100;
    let outbound = (+document.getElementById(`outbound-${id}`).value || 0) / 100;
    let absent = (+document.getElementById(`absent-${id}`).value || 0) / 100;
    let leave = (+document.getElementById(`leave-${id}`).value || 0) / 100;
    let scf = +document.getElementById(`scf-${id}`).value || 1;

    let weekly = monthly / (52 / 12);
    let traffic = (weekly / hoop * aht) / 3600 / concurrency;

    let agents = Math.ceil(traffic) + 1;
    while (serviceLevel(agents, traffic, aht, slSec) < slTarget && agents < 1000) {
        agents++;
    }

    let slHigh = serviceLevel(agents, traffic, aht, slSec);
    let slLow = serviceLevel(agents - 1, traffic, aht, slSec);
    let fractionalAgents = (slHigh === slLow) ? agents : (agents - 1) + (slTarget - slLow) / (slHigh - slLow);

    let hours = fractionalAgents * hoop;
    let occupancy = ((weekly / hoop) * (aht / concurrency) / 3600) / (hours / hoop);
    let fte = (weekly * aht / 3600) / occupancy / 40;

    let totalShrink = 1 - ((1 - leave) * (1 - absent) * (1 - (brk + coaching + outbound)));
    let headcount = (fte / (1 - totalShrink)) * scf;

    // Display
    document.getElementById(`weekly-${id}`).innerText = Math.round(weekly);
    document.getElementById(`hours-${id}`).innerText = Math.round(hours);
    document.getElementById(`occ-${id}`).innerText = (occupancy * 100).toFixed(2) + "%";
    document.getElementById(`fte-${id}`).innerText = fte.toFixed(2);
    document.getElementById(`hc-${id}`).innerText = Math.ceil(headcount);
}

// Initialize with one scenario
addScenario();