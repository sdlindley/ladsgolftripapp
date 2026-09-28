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

async function loadDynamicScorecard(dayNumber) {

  // ---------------------------
  // Load day from localStorage
  // ---------------------------
  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id == dayNumber);

  if (!day) {
    document.getElementById("scorecardTitle").innerText = "Day not found";
    return;
  }

  document.getElementById("scorecardTitle").innerText =
    `Scorecard – Day ${day.id}`;


  // ---------------------------
  // Load course from localStorage
  // ---------------------------
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const course = courses.find(c => c.id === day.courseId);

  if (!course) {
    alert("Course not found in localStorage");
    return;
  }


  // ---------------------------
  // Load golfers for THIS day
  // (snapshot created when the day was added)
  // ---------------------------
  let golfers = day.golfers;

  // Load saved handicaps (if any)
  const savedHandicaps =
    JSON.parse(localStorage.getItem(`handicaps-day-${dayNumber}`));

  if (savedHandicaps) {
    golfers = savedHandicaps; // override snapshot
  }

  currentCourse = course;
  currentGolfers = golfers;


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
}



async function loadDaySetup(dayNumber) {
  // Load days from localStorage
  const days = JSON.parse(localStorage.getItem("days")) || [];
  const day = days.find(d => d.id == dayNumber);

  if (!day) {
    alert("Day not found");
    return;
  }

  // Load saved handicaps (if any)
  let saved = JSON.parse(localStorage.getItem(`handicaps-day-${dayNumber}`));

  // If none saved yet, use the snapshot from the day
  if (!saved) {
    saved = day.golfers;   // ⭐ THIS IS THE FIX
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
        <button class="btn btn-sm btn-secondary" onclick="editGolfer(${index})">Edit</button>
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

  const golfers = JSON.parse(localStorage.getItem("golfers"));
  golfers.push({ name, handicap });

  localStorage.setItem("golfers", JSON.stringify(golfers));
  renderGolfers(golfers);

  document.getElementById("newName").value = "";
  document.getElementById("newHandicap").value = "";
}

// Edit golfer
function editGolfer(index) {
  const golfers = JSON.parse(localStorage.getItem("golfers"));
  const g = golfers[index];

  const newName = prompt("Edit name:", g.name);
  const newHandicap = prompt("Edit handicap:", g.handicap);

  if (newName && !isNaN(parseInt(newHandicap))) {
    golfers[index] = {
      name: newName.trim(),
      handicap: parseInt(newHandicap)
    };

    localStorage.setItem("golfers", JSON.stringify(golfers));
    renderGolfers(golfers);
  }
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

  // Edit course

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

  if (!date || !courseId) {
    alert("Please select a date and course.");
    return;
  }

  // Load golfers
  const golfers = JSON.parse(localStorage.getItem("golfers"));
  const selectedGolfers = [];

  golfers.forEach((g, index) => {
    const checkbox = document.getElementById(`golfer-${index}`);
    if (checkbox.checked) {
      selectedGolfers.push({ name: g.name, handicap: g.handicap });
    }
  });

  if (selectedGolfers.length === 0) {
    alert("Please select at least one golfer.");
    return;
  }

  // Load existing days
  let days = JSON.parse(localStorage.getItem("days")) || [];

  const newDay = {
    id: days.length + 1,
    date,
    courseId,
    golfers: selectedGolfers
  };

  days.push(newDay);
  localStorage.setItem("days", JSON.stringify(days));

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

          <a href="edit-day.html?id=${day.id}" class="btn btn-warning btn-sm mb-2">Edit Day</a>
          <button class="btn btn-danger btn-sm" onclick="deleteDay('${day.id}')">Delete Day</button>
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

  const selectedGolfers = [];
  document.querySelectorAll("#golfersList input:checked").forEach(cb => {
    selectedGolfers.push(cb.value);
  });

  days[dayIndex] = {
    id: dayId,
    date,
    courseId,
    courseName: course.name,
    golfers: selectedGolfers,
    handicaps: days[dayIndex].handicaps // keep existing snapshot
  };

  localStorage.setItem("days", JSON.stringify(days));

  alert("Day updated");
  window.location.href = "days.html";
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
