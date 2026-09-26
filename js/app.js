// ---------------------------
// Load golfers
// ---------------------------
async function loadGolfers() {
  const res = await fetch("data/golfers.json");
  const golfers = await res.json();

  const container = document.getElementById("golfersList");

  golfers.forEach(g => {
    const card = document.createElement("div");
    card.className = "col-md-4";

    card.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${g.name}</h5>
          <p class="card-text">Handicap: ${g.handicap}</p>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}


// ---------------------------
// Load leaderboard
// ---------------------------
async function loadLeaderboard() {
  const res = await fetch("data/scores.json");
  const scores = await res.json();

  const table = document.getElementById("leaderboardTable");

  scores
    .sort((a, b) => b.points - a.points)
    .forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.name}</td>
        <td>${s.points}</td>
      `;
      table.appendChild(row);
    });
}


// ---------------------------
// Load courses list
// ---------------------------
async function loadCourses() {
  const res = await fetch("data/courses.json");
  const courses = await res.json();

  const container = document.getElementById("coursesList");

  courses.forEach(c => {
    const card = document.createElement("div");
    card.className = "col-md-4";

    card.innerHTML = `
      <a href="courses/${c.id}.html" class="text-decoration-none text-dark">
        <div class="card shadow-sm">
          ${c.image ? `<img src="${c.image}" class="card-img-top" alt="${c.name}">` : ""}
          <div class="card-body">
            <h5 class="card-title">${c.name}</h5>
            <p class="card-text">
              Location: ${c.location}<br>
              Par: ${c.par}<br>
              Holes: ${c.holes}
            </p>
            <button class="btn btn-primary">View Course</button>
          </div>
        </div>
      </a>
    `;
    container.appendChild(card);
  });
}


// ---------------------------
// Load days list
// ---------------------------
async function loadDays() {
  const res = await fetch("data/days.json");
  const days = await res.json();

  const container = document.getElementById("daysList");

  days.forEach(d => {
    const card = document.createElement("div");
    card.className = "col-md-4";

    card.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Day ${d.day}</h5>
          <p class="card-text">
            <strong>Date:</strong> ${d.date}<br>
            <strong>Course:</strong> ${d.course}<br>
            <strong>Par:</strong> ${d.par}<br>
            <strong>Status:</strong> ${d.status}<br>
            <strong>Winner:</strong> ${d.winner} (${d.points} pts)
          </p>
          <a href="scorecard.html?day=${d.day}" class="btn btn-primary">Scorecard</a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}


// ---------------------------
// Load single course page
// ---------------------------
async function loadCourse(courseId) {
  const res = await fetch(`../data/courses/${courseId}.json`);
  const course = await res.json();

  document.getElementById("courseName").innerText = course.name;

  const table = document.getElementById("courseTable");

  course.holes.forEach(h => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${h.hole}</td>
      <td>${h.par}</td>
      <td>${h.si}</td>
    `;
    table.appendChild(row);
  });
}


// ---------------------------
// NEW scorecard (single table, multi-player)
// ---------------------------

let activeTab = "gross";
let currentCourse = null;
let currentGolfers = null;

async function loadDynamicScorecard(dayNumber) {
  const daysRes = await fetch("data/days.json");
  const days = await daysRes.json();

  const day = days.find(d => d.day == dayNumber);
  if (!day) {
    document.getElementById("scorecardTitle").innerText = "Day not found";
    return;
  }

  document.getElementById("scorecardTitle").innerText = `Scorecard – Day ${day.day}`;

  const courseRes = await fetch(`data/courses/${day.courseId}.json`);
  const course = await courseRes.json();

  const golfersRes = await fetch("data/golfers.json");
  const golfers = await golfersRes.json();
  
  currentCourse = course;
  currentGolfers = golfers;

  const container = document.getElementById("scorecards");
  

  // Add tabs
  let tabs = `
    <div class="mb-3">
      <button class="btn btn-primary me-2" id="tab-gross">Gross</button>
      <button class="btn btn-secondary me-2" id="tab-par">Net</button>
      <button class="btn btn-secondary" id="tab-points">Points</button>
    </div>
  `;

  // Build table header
  let table = `
    <table class="table table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Hole</th>
          <th>Par</th>
          <th>SI</th>
  `;

  golfers.forEach(g => {
    table += `<th>${g.name}</th>`;
  });

  table += `
        </tr>
      </thead>
      <tbody>
  `;

  // Build rows
  course.holes.forEach(h => {
    table += `
      <tr>
        <td>${h.hole}</td>
        <td>${h.par}</td>
        <td>${h.si}</td>
    `;

    golfers.forEach(g => {
      table += `
        <td>
          <input type="number"
                 class="form-control gross"
                 data-player="${g.name}"
                 data-hole="${h.hole}">

          <span class="net d-none"
                 data-player="${g.name}"
                 data-hole="${h.hole}"></span>

          <span class="points d-none"
                 data-player="${g.name}"
                 data-hole="${h.hole}"></span>
        </td>
      `;
    });

    table += `</tr>`;
  });

// OUT / IN / TOTAL rows
  table += `
      </tbody>
      <tfoot>
        <tr class="table-secondary">
          <th>OUT</th>
          <th></th>
          <th></th>
    `;

    golfers.forEach(g => {
      table += `<th id="out-${g.name}">0</th>`;
    });

      table += `
        </tr>
        <tr class="table-secondary">
          <th>IN</th>
          <th></th>
          <th></th>
     `;

    golfers.forEach(g => {
      table += `<th id="in-${g.name}">0</th>`;
    });

    table += `
        </tr>
        <tr class="table-dark">
          <th>TOTAL</th>
          <th></th>
          <th></th>
    `;

    golfers.forEach(g => {
      table += `<th id="total-${g.name}">0</th>`;
    });

    table += `
        </tr>
      </tfoot>
    </table>
  `;


  container.innerHTML = tabs + table;

  // Add listeners
  document.querySelectorAll(".gross").forEach(input => {
    input.addEventListener("input", () => calculateScores(course, golfers));
  });
  // TAB SWITCHING
  document.getElementById("tab-gross").addEventListener("click", () => {
    showGross();
    setActiveTab("gross");
  });

  document.getElementById("tab-par").addEventListener("click", () => {
    showPar();
    setActiveTab("par");
  });

  document.getElementById("tab-points").addEventListener("click", () => {
    showPoints();
    setActiveTab("points");
  });
}


async function loadDaySetup(dayNumber) {
  const daysRes = await fetch("data/days.json");
  const days = await daysRes.json();

  const day = days.find(d => d.day == dayNumber);
  if (!day) return;

  const golfersRes = await fetch("data/golfers.json");
  const golfers = await golfersRes.json();

  // Load saved handicaps from localStorage if available
  const saved = JSON.parse(localStorage.getItem(`handicaps-day-${dayNumber}`)) || day.handicaps;

  const container = document.getElementById("setupList");

  golfers.forEach(g => {
    const hcap = saved.find(s => s.name === g.name)?.handicap || g.handicap;

    const row = document.createElement("div");
    row.className = "d-flex align-items-center mb-3";

    row.innerHTML = `
      <div class="me-3" style="width:120px;"><strong>${g.name}</strong></div>
      <input type="number" class="form-control me-2"
             style="width:80px;"
             value="${hcap}"
             data-player="${g.name}">
      <button class="btn btn-secondary btn-sm me-1" onclick="adjust('${g.name}', -1)">-</button>
      <button class="btn btn-secondary btn-sm" onclick="adjust('${g.name}', 1)">+</button>
    `;

    container.appendChild(row);
  });

  // Save button
  document.getElementById("saveBtn").addEventListener("click", () => {
    const updated = golfers.map(g => {
      const input = document.querySelector(`input[data-player="${g.name}"]`);
      return { name: g.name, handicap: parseInt(input.value) };
    });

    localStorage.setItem(`handicaps-day-${dayNumber}`, JSON.stringify(updated));
    alert("Handicaps saved for Day " + dayNumber);
  });
}

function adjust(name, delta) {
  const input = document.querySelector(`input[data-player="${name}"]`);
  input.value = parseInt(input.value) + delta;
}


// ---------------------------
// Scoring logic
// ---------------------------
function calculateScores(course, golfers) {

  // Per-hole scoring
  golfers.forEach(golfer => {
      const dayHandicaps = JSON.parse(localStorage.getItem(`handicaps-day-${dayNumber}`));
      const handicap = dayHandicaps?.find(h => h.name === golfer.name)?.handicap || golfer.handicap;



    course.holes.forEach(h => {
      const grossInput = document.querySelector(
        `.gross[data-player="${golfer.name}"][data-hole="${h.hole}"]`
      );
      const netCell = document.querySelector(
        `.net[data-player="${golfer.name}"][data-hole="${h.hole}"]`
      );
      const pointsCell = document.querySelector(
        `.points[data-player="${golfer.name}"][data-hole="${h.hole}"]`
      );

      const gross = parseInt(grossInput.value);
      if (!gross) {
        netCell.innerText = "";
        pointsCell.innerText = "";
        return;
      }

      const shots = handicapShots(handicap, h.si);
      const net = gross - shots;
      netCell.innerText = net;

      const points = stablefordPoints(net, h.par);
      pointsCell.innerText = points;
    });
  });

// ⭐ TOTALS FOR GROSS / NET / POINTS
golfers.forEach(golfer => {

  let grossOut = 0, grossIn = 0;
  let netOut = 0, netIn = 0;
  let pointsOut = 0, pointsIn = 0;

  course.holes.forEach(h => {

    const grossInput = document.querySelector(
      `.gross[data-player="${golfer.name}"][data-hole="${h.hole}"]`
    );
    const netCell = document.querySelector(
      `.net[data-player="${golfer.name}"][data-hole="${h.hole}"]`
    );
    const pointsCell = document.querySelector(
      `.points[data-player="${golfer.name}"][data-hole="${h.hole}"]`
    );

    const gross = parseInt(grossInput.value);
    const net = parseInt(netCell.innerText);
    const points = parseInt(pointsCell.innerText);

    const isOut = h.hole <= 9;

    if (!isNaN(gross)) {
      if (isOut) grossOut += gross;
      else grossIn += gross;
    }

    if (!isNaN(net)) {
      if (isOut) netOut += net;
      else netIn += net;
    }

    if (!isNaN(points)) {
      if (isOut) pointsOut += points;
      else pointsIn += points;
    }
  });

  // Update OUT / IN / TOTAL rows
  document.getElementById(`out-${golfer.name}`).innerText =
    activeTab === "gross" ? grossOut :
    activeTab === "par" ? netOut :
    pointsOut;

  document.getElementById(`in-${golfer.name}`).innerText =
    activeTab === "gross" ? grossIn :
    activeTab === "par" ? netIn :
    pointsIn;

  document.getElementById(`total-${golfer.name}`).innerText =
    activeTab === "gross" ? grossOut + grossIn :
    activeTab === "par" ? netOut + netIn :
    pointsOut + pointsIn;
  });
}


// ---------------------------
// Helpers
// ---------------------------
function handicapShots(handicap, si) {
  return handicap >= si ? 1 : 0;
}

function stablefordPoints(net, par) {
  const diff = net - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

function saveScores() {
  alert("Scores saved (local only for now)");
}
function showGross() {
  document.querySelectorAll(".gross").forEach(el => el.classList.remove("d-none"));
  document.querySelectorAll(".net").forEach(el => el.classList.add("d-none"));
  document.querySelectorAll(".points").forEach(el => el.classList.add("d-none"));
}

function showPar() {
  document.querySelectorAll(".gross").forEach(el => el.classList.add("d-none"));
  document.querySelectorAll(".net").forEach(el => el.classList.remove("d-none"));
  document.querySelectorAll(".points").forEach(el => el.classList.add("d-none"));
}

function showPoints() {
  document.querySelectorAll(".gross").forEach(el => el.classList.add("d-none"));
  document.querySelectorAll(".net").forEach(el => el.classList.add("d-none"));
  document.querySelectorAll(".points").forEach(el => el.classList.remove("d-none"));
}
function setActiveTab(tab) {
  activeTab = tab;
  
  document.getElementById("tab-gross").classList.remove("btn-primary");
  document.getElementById("tab-par").classList.remove("btn-primary");
  document.getElementById("tab-points").classList.remove("btn-primary");

  document.getElementById("tab-gross").classList.add("btn-secondary");
  document.getElementById("tab-par").classList.add("btn-secondary");
  document.getElementById("tab-points").classList.add("btn-secondary");

  document.getElementById(`tab-${tab}`).classList.remove("btn-secondary");
  document.getElementById(`tab-${tab}`).classList.add("btn-primary");

// ⭐ NEW: refresh totals when switching tabs  
    calculateScores(currentCourse, currentGolfers);
}
