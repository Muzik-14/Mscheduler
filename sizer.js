<script>
let scenarioId = 0;

function factorial(n) {
    if (n === 0) return 1;
    if (n > 170) return Infinity; 
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
    return Math.max(0, 1 - ec * exp);
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
            <input id="title-${id}" value="(Scenario ${id})" onchange="calculate(${id})">
            <button class="btn-del" onclick="removeScenario(${id})">×</button>
        </div>
        <div class="data-cell"><input id="monthly-${id}" type="number" value="10000" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="aht-${id}" type="number" value="300" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="hoop-${id}" type="number" value="168" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="sl-${id}" type="number" value="80" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="slSec-${id}" type="number" value="20" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="concurrency-${id}" type="number" value="1" oninput="calculate(${id})"></div>
        <div class="data-cell"><div class="result-cell bold-res" id="weekly-${id}">-</div></div>
        <div class="data-cell"><div class="result-cell bold-res" id="hours-${id}">-</div></div>
        <div class="data-cell">
            <input id="cap-${id}" type="number" value="85" class="cap-box" title="Occ Cap %" oninput="calculate(${id})">
            <div class="result-cell bold-res" id="occ-${id}">-</div>
        </div>
        <div class="data-cell"><div class="result-cell bold-res" id="fte-${id}">-</div></div>
        <div class="data-cell"><input id="break-${id}" type="number" value="6.25" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="coaching-${id}" type="number" value="7.75" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="outbound-${id}" type="number" value="0" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="absent-${id}" type="number" value="12" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="leave-${id}" type="number" value="0" oninput="calculate(${id})"></div>
        <div class="data-cell"><input id="scf-${id}" type="number" value="1.05" oninput="calculate(${id})"></div>
        <div class="data-cell"><div class="result-cell bold-res" id="hc-${id}">-</div></div>
    `;

    container.appendChild(col);
    calculate(id);
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
    let occCap = (+document.getElementById(`cap-${id}`).value || 100) / 100;

    let brk = (+document.getElementById(`break-${id}`).value || 0) / 100;
    let coaching = (+document.getElementById(`coaching-${id}`).value || 0) / 100;
    let outbound = (+document.getElementById(`outbound-${id}`).value || 0) / 100;
    let absent = (+document.getElementById(`absent-${id}`).value || 0) / 100;
    let leave = (+document.getElementById(`leave-${id}`).value || 0) / 100;
    let scf = +document.getElementById(`scf-${id}`).value || 1;

    let weekly = monthly / (52 / 12);
    let traffic = (weekly / hoop * aht) / 3600 / concurrency;

    if (traffic <= 0) {
        updateUI(id, weekly, 0, 0, 0, 0);
        return;
    }

    let agents = Math.ceil(traffic) + 1;
    while (serviceLevel(agents, traffic, aht, slSec) < slTarget && agents < 1000) {
        agents++;
    }

    let slHigh = serviceLevel(agents, traffic, aht, slSec);
    let slLow = serviceLevel(agents - 1, traffic, aht, slSec);
    
    let fractionalAgents;
    if (Math.abs(slHigh - slLow) < 0.0001) {
        fractionalAgents = agents;
    } else {
        fractionalAgents = (agents - 1) + (slTarget - slLow) / (slHigh - slLow);
    }

    // MATCH EXCEL LOGIC: 
    // Your Excel uses a Minimum Coverage Floor (135 hours / 168 HOOP = ~0.803)
    // This ensures you have people available even when call volume is near zero.
    let minCoverage = 0.8036; 
    fractionalAgents = Math.max(fractionalAgents, minCoverage);

    // Apply Occupancy Cap
    if ((traffic / fractionalAgents) > occCap) {
        fractionalAgents = traffic / occCap;
    }

    let hours = fractionalAgents * hoop;
    let finalOccupancy = traffic / fractionalAgents;
    let fte = hours / 40;

    let totalShrink = 1 - ((1 - leave) * (1 - absent) * (1 - (brk + coaching + outbound)));
    let headcount = (fte / Math.max(0.01, (1 - totalShrink))) * scf;

    updateUI(id, weekly, hours, finalOccupancy, fte, headcount);
}

function updateUI(id, weekly, hours, occ, fte, hc) {
    document.getElementById(`weekly-${id}`).innerText = Math.round(Math.max(0, weekly)).toLocaleString();
    document.getElementById(`hours-${id}`).innerText = Math.round(Math.max(0, hours)).toLocaleString();
    document.getElementById(`occ-${id}`).innerText = (Math.max(0, occ) * 100).toFixed(2) + "%";
    document.getElementById(`fte-${id}`).innerText = Math.max(0, fte).toFixed(2);
    document.getElementById(`hc-${id}`).innerText = Math.ceil(Math.max(0, hc));
}

function downloadExcel() {
    let csvContent = "data:text/csv;charset=utf-8,";
    const labels = Array.from(document.querySelectorAll('.label-cell')).map(el => el.innerText);
    const scenarioCols = document.querySelectorAll('.scenario-col');
    let rows = [];
    
    let headerRow = ["Metric"];
    scenarioCols.forEach(col => {
        const id = col.id.replace('sc-', '');
        headerRow.push(document.getElementById(`title-${id}`).value);
    });
    rows.push(headerRow.join(","));

    labels.forEach((label, index) => {
        let row = [label];
        scenarioCols.forEach(col => {
            const id = col.id.replace('sc-', '');
            const cell = col.querySelectorAll('.data-cell')[index];
            const input = cell.querySelector('input:not(.cap-box)');
            const result = cell.querySelector('.result-cell');
            let val = input ? input.value : (result ? result.innerText : "");
            row.push(`"${val.replace(/,/g, '')}"`);
        });
        rows.push(row.join(","));
    });

    csvContent += rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "WFM_Sizing_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

addScenario();
</script>