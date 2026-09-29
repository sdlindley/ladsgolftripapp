
// Build hole inputs

function buildHoleInputs() {
  const container = document.getElementById("holesContainer");

  for (let i = 1; i <= 18; i++) {
    const row = document.createElement("div");
    row.className = "row mb-2";

    row.innerHTML = `
      <div class="col-2"><strong>${i}</strong></div>
      <div class="col-2"><input type="number" class="form-control" id="par-${i}" placeholder="Par"></div>
      <div class="col-2"><input type="number" class="form-control" id="si-${i}" placeholder="SI"></div>
    `;

    container.appendChild(row);
  }
}


// Save course to local storage

function saveCourse() {
  const name = document.getElementById("courseName").value.trim();
  const location = document.getElementById("courseLocation").value.trim();

  if (!name) {
    alert("Course name required");
    return;
  }

  const holes = [];

  for (let i = 1; i <= 18; i++) {
    const par = parseInt(document.getElementById(`par-${i}`).value);
    const si = parseInt(document.getElementById(`si-${i}`).value);

    if (!par || !si) {
      alert(`Par and SI required for hole ${i}`);
      return;
    }

    holes.push({ hole: i, par, si });
  }

  let courses = JSON.parse(localStorage.getItem("courses")) || [];

  const newCourse = {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    location,
    holes
  };

  courses.push(newCourse);
  localStorage.setItem("courses", JSON.stringify(courses));

  window.location.href = "courses.html";
}

// Load courses on courses page

function loadCoursesPage() {
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const container = document.getElementById("coursesList");

  container.innerHTML = "";

  courses.forEach(c => {
    const div = document.createElement("div");
    div.className = "card p-3 mb-3";

    div.innerHTML = `
      <h4>${c.name}</h4>
      <p>${c.location || ""}</p>
      <a href="course.html?id=${c.id}" class="btn btn-secondary">View</a>
    `;

    container.appendChild(div);
  });
}


// ---------------------------
// NEW scorecard (single table, multi-player)
// ---------------------------

let activeTab = "gross";
let currentCourse = null;
let currentGolfers = null;
let currentDayId = null;

async function loadDynamicScorecard(dayNumber) {

  currentDayId = dayNumber;

  // ---------------------------
  // Load day from localStorage
  // ---------------------------
  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id == dayNumber);

  if (!day) {
    document.getElementById("scorecardTitle").innerText = "Day not found";
    return;
  }

  // ---------------------------
  // Update header (clean version)
  // ---------------------------
  const title = document.getElementById("scorecardTitle");
  title.innerHTML = `
    Scorecard<br>
    <small>${day.date} – ${day.courseName}</small>
  `;

  // ---------------------------
  // Load course
  // ---------------------------
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === day.courseId);

  if (!course) {
    alert("Course not found in localStorage");
    return;
  }

  // ---------------------------
  // Load golfers (IDs → objects)
  // ---------------------------
  const allGolfers = JSON.parse(localStorage.getItem("golfers")) || [];

  const golfers = day.golfers.map(id => {
    const g = allGolfers.find(x => x.id === id);
    return {
      id: g.id,
      name: g.name,
      handicap: g.handicap
    };
  });

  currentCourse = course;
  currentGolfers = golfers;

  // ---------------------------
  // Load saved scores (gross, net, points)
  // ---------------------------
  const savedScores =
    JSON.parse(localStorage.getItem(`scores-day-${dayNumber}`)) || {};

  // ---------------------------
  // Build scorecard UI
  // ---------------------------
  const container = document.getElementById("scorecards");

  // Tabs
  let tabs = `
    <div class="mb-3">
      <button class="btn btn-primary me-2" id="tab-gross">Gross</button>
      <button class="btn btn-secondary me-2" id="tab-par">Net</button>
      <button class="btn btn-secondary" id="tab-points">Points</button>
    </div>
  `;

  // Table header
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

  // Table rows (holes)
  course.holes.forEach(h => {
    table += `
      <tr>
        <td>${h.hole}</td>
        <td>${h.par}</td>
        <td>${h.si}</td>
    `;

    golfers.forEach(g => {

      const saved = savedScores[g.name]?.[h.hole] || {};

      table += `
        <td>
          <input type="number"
                 class="form-control gross"
                 data-player="${g.name}"
                 data-hole="${h.hole}"
                 value="${saved.gross ?? ''}">

          <span class="net d-none"
                 data-player="${g.name}"
                 data-hole="${h.hole}">${saved.net ?? ''}</span>

          <span class="points d-none"
                 data-player="${g.name}"
                 data-hole="${h.hole}">${saved.points ?? ''}</span>
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
          <th>OUT</th><th></th><th></th>
  `;

  golfers.forEach(g => {
    table += `<th id="out-${g.name}">0</th>`;
  });

  table += `
        </tr>
        <tr class="table-secondary">
          <th>IN</th><th></th><th></th>
  `;

  golfers.forEach(g => {
    table += `<th id="in-${g.name}">0</th>`;
  });

  table += `
        </tr>
        <tr class="table-dark">
          <th>TOTAL</th><th></th><th></th>
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

  // ---------------------------
  // Add listeners
  // ---------------------------
  document.querySelectorAll(".gross").forEach(input => {
    input.addEventListener("input", () => calculateScores(course, golfers));
  });

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

  // Initial calculation
  calculateScores(course, golfers);
}


async function loadDaySetup(dayNumber) {
  // Load days from localStorage
  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id == dayNumber);

  if (!day) {
    alert("Day not found");
    return;
  }

// Update header
const title = document.getElementById("setupTitle");
title.innerHTML = `
  Setup Handicaps<br>
  <small>${day.date} – ${day.courseName}</small>
`;


  // ⭐ Convert golfer IDs into full golfer objects
  const allGolfers = JSON.parse(localStorage.getItem("golfers")) || [];

  const snapshotGolfers = day.golfers.map(id => {
    const g = allGolfers.find(x => x.id === id);
    return {
      id: g.id,
      name: g.name,
      handicap: g.handicap
    };
  });

  // Load saved handicaps (if any)
  let saved = JSON.parse(localStorage.getItem(`handicaps-day-${dayNumber}`));

  // If none saved yet, use the snapshot
  if (!saved) {
    saved = snapshotGolfers;
  }

  const container = document.getElementById("setupList");
  container.innerHTML = "";

  saved.forEach((g, index) => {
    const row = document.createElement("div");
    row.className = "d-flex align-items-center mb-3";

    row.innerHTML = `
      <div class="me-3" style="width:120px;"><strong>${g.name}</strong></div>
      <input type="number" class="form-control me-2"
             style="width:80px;"
             value="${g.handicap}"
             data-player="${g.name}">
      <button class="btn btn-secondary btn-sm me-1" onclick="adjust('${g.name}', -1)">-</button>
      <button class="btn btn-secondary btn-sm" onclick="adjust('${g.name}', 1)">+</button>
    `;

    container.appendChild(row);
  });

  // Save button
  document.getElementById("saveBtn").addEventListener("click", () => {
    const updated = saved.map(g => {
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

// Load golfers from localStorage or JSON
async function loadGolfersPage() {
  let golfers = JSON.parse(localStorage.getItem("golfers"));

  if (!golfers) {
    const res = await fetch("data/golfers.json");
    golfers = await res.json();
    localStorage.setItem("golfers", JSON.stringify(golfers));
  }

  renderGolfers(golfers);
}

// Render golfers table
function renderGolfers(golfers) {
  const tbody = document.querySelector("#golfersTable tbody");
  tbody.innerHTML = "";

  golfers.forEach((g, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${g.name}</td>
      <td>${g.handicap}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editGolfer('${g.id}')">Edit</button>
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteGolfer('${g.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}


// Add golfer

function addGolfer() {
  const name = document.getElementById("newName").value.trim();
  const handicap = parseInt(document.getElementById("newHandicap").value);

  if (!name || isNaN(handicap)) {
    alert("Please enter a name and handicap.");
    return;
  }

  const golfers = JSON.parse(localStorage.getItem("golfers")) || [];

  golfers.push({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    handicap
  });

  localStorage.setItem("golfers", JSON.stringify(golfers));
  renderGolfers(golfers);

  document.getElementById("newName").value = "";
  document.getElementById("newHandicap").value = "";
}


// Edit golfer
function editGolfer(golferId) {
  const golfers = JSON.parse(localStorage.getItem("golfers")) || [];
  const golfer = golfers.find(g => g.id === golferId);

  if (!golfer) {
    alert("Golfer not found");
    return;
  }

  const newName = prompt("Edit name:", golfer.name);
  const newHandicap = prompt("Edit handicap:", golfer.handicap);

  if (newName && !isNaN(parseInt(newHandicap))) {

    // Update the golfer
    golfer.name = newName.trim();
    golfer.handicap = parseInt(newHandicap);

    // Save back to localStorage
    localStorage.setItem("golfers", JSON.stringify(golfers));

    // Re-render table
    renderGolfers(golfers);
  }
}


// Delete golfer
function deleteGolfer(golferId) {
  if (!confirm("Delete this golfer?")) return;

  const golfers = JSON.parse(localStorage.getItem("golfers")) || [];

  // Remove the golfer with matching ID
  const updated = golfers.filter(g => g.id !== golferId);

  localStorage.setItem("golfers", JSON.stringify(updated));

  alert("Golfer deleted");
  location.reload();
}


// Load Add Day page

function loadAddDayPage() {
  // Load courses from localStorage
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const courseSelect = document.getElementById("courseSelect");

  courseSelect.innerHTML = "";

  if (courses.length === 0) {
    courseSelect.innerHTML = `<option value="">No courses available</option>`;
  } else {
    courses.forEach(course => {
      const opt = document.createElement("option");
      opt.value = course.id;
      opt.textContent = course.name;
      courseSelect.appendChild(opt);
    });
  }

  // Load golfers
  const golfers = JSON.parse(localStorage.getItem("golfers")) || [];
  const golfersList = document.getElementById("golfersList");

  golfersList.innerHTML = "";

  golfers.forEach(g => {
    const div = document.createElement("div");
    div.className = "form-check";

    div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="golfer-${g.id}" value="${g.id}">
      <label class="form-check-label" for="golfer-${g.id}">
        ${g.name}
      </label>
    `;

    golfersList.appendChild(div);
  });
}


// Load course

function loadCourse() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");

  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === courseId);

  if (!course) {
    document.getElementById("courseName").innerText = "Course not found";
    return;
  }

  // Set course name
  document.getElementById("courseName").innerText = course.name;

  // Set edit button link
  document.getElementById("editCourseBtn").href = `edit-course.html?id=${courseId}`;

  // Delete button
  document.getElementById("deleteCourseBtn").addEventListener("click", () => {
    if (confirm(`Delete course "${course.name}"?`)) {
      const updated = courses.filter(c => c.id !== courseId);
      localStorage.setItem("courses", JSON.stringify(updated));
      alert("Course deleted");
      window.location.href = "courses.html";
    }
  });

  // Build hole table
  const table = document.getElementById("courseTable").querySelector("tbody");
  table.innerHTML = "";

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


function loadCourseForEditing() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");

  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === courseId);

  if (!course) {
    alert("Course not found");
    return;
  }

  document.getElementById("courseName").value = course.name;
  document.getElementById("courseLocation").value = course.location;

  const container = document.getElementById("holesContainer");
  container.innerHTML = "";

  course.holes.forEach(h => {
    const row = document.createElement("div");
    row.className = "row mb-2";

    row.innerHTML = `
      <div class="col-2"><strong>${h.hole}</strong></div>
      <div class="col-2"><input type="number" class="form-control" id="par-${h.hole}" value="${h.par}"></div>
      <div class="col-2"><input type="number" class="form-control" id="si-${h.hole}" value="${h.si}"></div>
    `;

    container.appendChild(row);
  });
}

  // Save Edit course

function saveEditedCourse() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");

  let courses = JSON.parse(localStorage.getItem("courses")) || [];
  const courseIndex = courses.findIndex(c => c.id === courseId);

  const name = document.getElementById("courseName").value.trim();
  const location = document.getElementById("courseLocation").value.trim();

  const holes = [];
  for (let i = 1; i <= 18; i++) {
    holes.push({
      hole: i,
      par: parseInt(document.getElementById(`par-${i}`).value),
      si: parseInt(document.getElementById(`si-${i}`).value)
    });
  }

  courses[courseIndex] = { id: courseId, name, location, holes };

  localStorage.setItem("courses", JSON.stringify(courses));

  alert("Course updated");
  window.location.href = `course.html?id=${courseId}`;
}


// Save new day

function saveNewDay() {
  const date = document.getElementById("dayDate").value;
  const courseId = document.getElementById("courseSelect").value;

  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === courseId);

  const selectedGolfers = [];
  document.querySelectorAll("#golfersList input:checked").forEach(cb => {
    selectedGolfers.push(cb.value);
  });

  const days = JSON.parse(localStorage.getItem("days")) || [];

  const newDay = {
    id: "day-" + Date.now(),
    date,
    courseId,
    courseName: course.name,
    golfers: selectedGolfers,
    handicaps: {} // filled later in day-setup
  };

  days.push(newDay);
  localStorage.setItem("days", JSON.stringify(days));

  alert("Day added");
  window.location.href = "days.html";
}


// update days.html to show new days

function loadDaysPage() {
  const days = JSON.parse(localStorage.getItem("days")) || [];
  const container = document.getElementById("daysList");

  container.innerHTML = "";

  if (days.length === 0) {
    container.innerHTML = `<p>No days added yet.</p>`;
    return;
  }

  days.forEach(day => {
    const div = document.createElement("div");
    div.className = "col-md-4";

    div.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${day.date}</h5>
          <p class="card-text"><strong>Course:</strong> ${day.courseName}</p>

          <a href="day-setup.html?day=${day.id}" class="btn btn-primary btn-sm mb-2">Setup Handicaps</a>
          <a href="scorecard.html?day=${day.id}" class="btn btn-success btn-sm mb-2">Scorecard</a>
          <a href="day-leaderboard.html?day=${day.id}" class="btn btn-info btn-sm mb-2">Leaderboard</a>


          <a href="edit-day.html?id=${day.id}" class="btn btn-warning btn-sm mb-2">Edit</a>
          <button class="btn btn-danger btn-sm mb-2" onclick="deleteDay('${day.id}')">Delete</button>

        </div>
      </div>
    `;

    container.appendChild(div);
  });
}


// delete day logic
function deleteDay(dayId) {
  if (!confirm("Delete this day?")) return;

  const days = JSON.parse(localStorage.getItem("days")) || [];
  const updated = days.filter(d => d.id !== dayId);
  localStorage.setItem("days", JSON.stringify(updated));

  // Delete related keys (wildcard)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(`handicaps-day-${dayId}`)) {
      localStorage.removeItem(key);
    }
    if (key.startsWith(`scores-day-${dayId}`)) {
      localStorage.removeItem(key);
    }
  });

  alert("Day deleted");
  location.reload();
}


// edit day logic
function loadEditDayPage() {
  const params = new URLSearchParams(window.location.search);
  const dayId = params.get("id");

  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id === dayId);

  if (!day) {
    alert("Day not found");
    return;
  }

  // Fill date
  document.getElementById("dayDate").value = day.date;

  // Load courses
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const courseSelect = document.getElementById("courseSelect");

  courses.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === day.courseId) opt.selected = true;
    courseSelect.appendChild(opt);
  });

  // Load golfers
  const golfers = JSON.parse(localStorage.getItem("golfers")) || [];
  const golfersList = document.getElementById("golfersList");

  golfers.forEach(g => {
    const div = document.createElement("div");
    div.className = "form-check";

    const checked = day.golfers.includes(g.id) ? "checked" : "";

    div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="golfer-${g.id}" value="${g.id}" ${checked}>
      <label class="form-check-label" for="golfer-${g.id}">
        ${g.name}
      </label>
    `;

    golfersList.appendChild(div);
  });
}

// save edited day logic

function saveEditedDay() {
  const params = new URLSearchParams(window.location.search);
  const dayId = params.get("id");

  let days = JSON.parse(localStorage.getItem("days")) || [];
  const dayIndex = days.findIndex(d => d.id === dayId);

  const date = document.getElementById("dayDate").value;
  const courseId = document.getElementById("courseSelect").value;

  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === courseId);

  // Get selected golfers
  const selectedGolfers = [];
  document.querySelectorAll("#golfersList input:checked").forEach(cb => {
    selectedGolfers.push(cb.value);
  });

  // Load existing snapshot (if any)
  let existingSnapshot = JSON.parse(localStorage.getItem(`handicaps-day-${dayId}`));

  // Only update snapshot if it exists
  if (existingSnapshot) {

    const allGolfers = JSON.parse(localStorage.getItem("golfers")) || [];
    const newSnapshot = [];

    selectedGolfers.forEach(id => {
      const master = allGolfers.find(x => x.id === id);
      const old = existingSnapshot.find(x => x.id === id);

      newSnapshot.push({
        id: master.id,
        name: master.name,
        handicap: old ? old.handicap : master.handicap
      });
    });

    // Save updated snapshot
    localStorage.setItem(`handicaps-day-${dayId}`, JSON.stringify(newSnapshot));

    // Also store snapshot inside the day object
    days[dayIndex].handicaps = newSnapshot;
  }

  // Update day object (always)
  days[dayIndex] = {
    id: dayId,
    date,
    courseId,
    courseName: course.name,
    golfers: selectedGolfers,
    handicaps: days[dayIndex].handicaps || {} // unchanged if no snapshot yet
  };

  localStorage.setItem("days", JSON.stringify(days));

  alert("Day updated");
  window.location.href = "days.html";
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

// Save scores

function saveScores(dayId) {
  const scoreInputs = document.querySelectorAll("input.gross[data-player][data-hole]");
  const scores = {};

  scoreInputs.forEach(input => {
    const player = input.getAttribute("data-player");
    const hole = input.getAttribute("data-hole");

    const gross = parseInt(input.value);

    const netCell = document.querySelector(`.net[data-player="${player}"][data-hole="${hole}"]`);
    const pointsCell = document.querySelector(`.points[data-player="${player}"][data-hole="${hole}"]`);

    const net = parseInt(netCell.innerText);
    const points = parseInt(pointsCell.innerText);

    if (!scores[player]) scores[player] = {};

    scores[player][hole] = {
      gross: isNaN(gross) ? null : gross,
      net: isNaN(net) ? null : net,
      points: isNaN(points) ? null : points
    };
  });

  localStorage.setItem(`scores-day-${dayId}`, JSON.stringify(scores));

  alert("Scores saved");
}


// load leaderboard day

function loadDayLeaderboard(dayId) {

  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id === dayId);

  if (!day) {
    document.getElementById("leaderboardTitle").innerText = "Day not found";
    return;
  }

  document.getElementById("leaderboardTitle").innerHTML = `
    Leaderboard<br>
    <small>${day.date} – ${day.courseName}</small>
  `;

  const allGolfers = JSON.parse(localStorage.getItem("golfers")) || [];
  const handicaps = JSON.parse(localStorage.getItem(`handicaps-day-${dayId}`)) || [];
  const scores = JSON.parse(localStorage.getItem(`scores-day-${dayId}`)) || {};

  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === day.courseId);

  const leaderboardData = [];

  day.golfers.forEach(id => {
    const g = allGolfers.find(x => x.id === id);
    const h = handicaps.find(x => x.id === id);

    let grossTotal = 0;
    let netTotal = 0;
    let pointsTotal = 0;

    course.holes.forEach(hole => {
      const s = scores[g.name]?.[hole.hole];
      if (!s) return;

      if (!isNaN(s.gross)) grossTotal += s.gross;
      if (!isNaN(s.net)) netTotal += s.net;
      if (!isNaN(s.points)) pointsTotal += s.points;
    });

    leaderboardData.push({
      name: g.name,
      gross: grossTotal,
      net: netTotal,
      points: pointsTotal
    });
  });

  // Default sort by points
  leaderboardData.sort((a, b) => b.points - a.points);

  renderLeaderboardTable(leaderboardData);
}


  // Render Leaderboard Table click to sort headers
function renderLeaderboardTable(data) {

  const container = document.getElementById("leaderboard");

  let table = `
    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th data-sort="name">Golfer</th>
          <th data-sort="gross">Gross</th>
          <th data-sort="net">Net</th>
          <th data-sort="points">Points</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(row => {
    table += `
      <tr>
        <td>${row.name}</td>
        <td>${row.gross}</td>
        <td>${row.net}</td>
        <td>${row.points}</td>
      </tr>
    `;
  });

  table += `
      </tbody>
    </table>
  `;

  container.innerHTML = table;

  // Add sorting
  container.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");

      // Sort descending except name
      if (key === "name") {
        data.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        data.sort((a, b) => b[key] - a[key]);
      }

      renderLeaderboardTable(data);
    });
  });
}

