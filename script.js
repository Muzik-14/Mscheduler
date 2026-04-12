const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const times = [];

for (let h = 0; h < 24; h++) {
  times.push(`${String(h).padStart(2,"0")}:00`);
  times.push(`${String(h).padStart(2,"0")}:30`);
}

const grid = document.getElementById("grid");
const agentList = document.getElementById("agentList");

let agents = [];
let agentCounter = 0;
let copiedSchedule = null;

// BUILD GRID
function buildGrid() {
  let header = "<tr><th>Time</th>";
  days.forEach(d => header += `<th>${d}</th>`);
  header += "</tr>";

  grid.innerHTML = header;

  times.forEach(time => {
    let row = `<tr><td>${time}</td>`;
    days.forEach(day => {
      row += `<td id="${day}-${time}">0</td>`;
    });
    row += "</tr>";
    grid.innerHTML += row;
  });
}

buildGrid();

// HELPERS
function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isWithinRange(t, start, end) {
  if (start === null || end === null) return false;
  if (end > start) return t >= start && t < end;
  return t >= start || t < end;
}

function isWithinSlot(slot, val) {
  return val >= slot && val < slot + 30;
}

// ADD AGENT
function addAgent() {
  const id = agentCounter++;

  let html = `<div class="agent" id="agent-${id}">
    <button class="remove-btn" onclick="removeAgent(${id})">➖</button>
    <h4>Agent ${id + 1}</h4>
  `;

  days.forEach(day => {
    html += `
      <b>${day}</b>
      <button class="copy-btn" onclick="copyDay(${id}, '${day}')">📋</button>
      <button class="paste-btn" onclick="pasteDay(${id}, '${day}')">📥</button><br>

      Shift: <input type="time" id="s-${id}-${day}-start">
             <input type="time" id="s-${id}-${day}-end"><br>

      Lunch: <input type="time" id="l-${id}-${day}-start">
             <input type="time" id="l-${id}-${day}-end"><br>

      Break1: <input type="time" id="b1-${id}-${day}">
      Break2: <input type="time" id="b2-${id}-${day}">
      <hr>
    `;
  });

  html += `</div>`;
  agentList.insertAdjacentHTML("beforeend", html);

  agents.push(id);

  // ONLY bind events for this agent (fix reset issue)
  document.querySelectorAll(`#agent-${id} input`).forEach(i => {
    i.addEventListener("change", calculate);
  });
}

// REMOVE AGENT
function removeAgent(id) {
  document.getElementById(`agent-${id}`).remove();
  agents = agents.filter(a => a !== id);
  calculate();
}

// COPY
function copyDay(id, day) {
  copiedSchedule = {
    shiftStart: document.getElementById(`s-${id}-${day}-start`).value,
    shiftEnd: document.getElementById(`s-${id}-${day}-end`).value,
    lunchStart: document.getElementById(`l-${id}-${day}-start`).value,
    lunchEnd: document.getElementById(`l-${id}-${day}-end`).value,
    b1: document.getElementById(`b1-${id}-${day}`).value,
    b2: document.getElementById(`b2-${id}-${day}`).value
  };
}

// PASTE
function pasteDay(id, day) {
  if (!copiedSchedule) return;

  document.getElementById(`s-${id}-${day}-start`).value = copiedSchedule.shiftStart;
  document.getElementById(`s-${id}-${day}-end`).value = copiedSchedule.shiftEnd;
  document.getElementById(`l-${id}-${day}-start`).value = copiedSchedule.lunchStart;
  document.getElementById(`l-${id}-${day}-end`).value = copiedSchedule.lunchEnd;
  document.getElementById(`b1-${id}-${day}`).value = copiedSchedule.b1;
  document.getElementById(`b2-${id}-${day}`).value = copiedSchedule.b2;

  calculate();
}

// CALCULATE
function calculate() {

  // RESET GRID
  days.forEach(day => {
    times.forEach(time => {
      document.getElementById(`${day}-${time}`).innerText = 0;
    });
  });

  agents.forEach(id => {

    days.forEach((day, dIndex) => {

      const nextDay = days[(dIndex + 1) % 7];

      const sStart = toMin(document.getElementById(`s-${id}-${day}-start`)?.value);
      const sEnd   = toMin(document.getElementById(`s-${id}-${day}-end`)?.value);

      const lStart = toMin(document.getElementById(`l-${id}-${day}-start`)?.value);
      const lEnd   = toMin(document.getElementById(`l-${id}-${day}-end`)?.value);

      const b1 = toMin(document.getElementById(`b1-${id}-${day}`)?.value);
      const b2 = toMin(document.getElementById(`b2-${id}-${day}`)?.value);

      times.forEach(time => {

        const t = toMin(time);

        let todayVal = 0;
        let nextVal = 0;

        if (isWithinRange(t, sStart, sEnd)) {
          if (sEnd > sStart || t >= sStart) todayVal += 1;
          else nextVal += 1;
        }

        if (isWithinRange(t, lStart, lEnd)) {
          if (sEnd > sStart || t >= sStart) todayVal -= 1;
          else nextVal -= 1;
        }

        if (b1 !== null && isWithinSlot(t, b1)) {
          if (sEnd > sStart || t >= sStart) todayVal -= 0.5;
          else nextVal -= 0.5;
        }

        if (b2 !== null && isWithinSlot(t, b2)) {
          if (sEnd > sStart || t >= sStart) todayVal -= 0.5;
          else nextVal -= 0.5;
        }

        if (todayVal !== 0) {
          const cell = document.getElementById(`${day}-${time}`);
          cell.innerText = parseFloat(cell.innerText) + todayVal;
        }

        if (nextVal !== 0) {
          const cell = document.getElementById(`${nextDay}-${time}`);
          cell.innerText = parseFloat(cell.innerText) + nextVal;
        }

      });

    });

  });
}

// EXPORT (WITH AGENT DATA)
function exportCSV() {
  let csv = "STAFFING GRID\n";
  csv += "Time," + days.join(",") + "\n";

  times.forEach(time => {
    let row = [time];
    days.forEach(day => {
      row.push(document.getElementById(`${day}-${time}`).innerText);
    });
    csv += row.join(",") + "\n";
  });

  csv += "\n\nAGENT SCHEDULES\n";

  agents.forEach(id => {
    csv += `Agent ${id+1}\n`;
    csv += "Day,Shift Start,Shift End,Lunch Start,Lunch End,Break1,Break2\n";

    days.forEach(day => {
      csv += [
        day,
        document.getElementById(`s-${id}-${day}-start`).value,
        document.getElementById(`s-${id}-${day}-end`).value,
        document.getElementById(`l-${id}-${day}-start`).value,
        document.getElementById(`l-${id}-${day}-end`).value,
        document.getElementById(`b1-${id}-${day}`).value,
        document.getElementById(`b2-${id}-${day}`).value
      ].join(",") + "\n";
    });

    csv += "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "wfm_schedule.csv";
  link.click();
}