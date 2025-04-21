
//const supabaseUrl = 'https://jimxipnaggvxhtilxego.supabase.co';
//const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbXhpcG5hZ2d2eGh0aWx4ZWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTUwNjUsImV4cCI6MjA2MDQzMTA2NX0.5-kIxi00Hz3Syyd0PpdarPW7jo4tqQ8hTD3yS8DmvZ4';
const supabase = window.supabase.createClient(
  'https://jimxipnaggvxhtilxego.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbXhpcG5hZ2d2eGh0aWx4ZWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTUwNjUsImV4cCI6MjA2MDQzMTA2NX0.5-kIxi00Hz3Syyd0PpdarPW7jo4tqQ8hTD3yS8DmvZ4'
);


let username = "";
let countdown = 5;
let routes = [];
let selectedRoute = null;
let currentLocation = null;
let mapData = {};
let moveCount = 0;
let pathHistoryArray = [];
let timer = 0;
let timerInterval = null;
let gameActive = false;
let gameHistory = {};


const welcomeScreen = document.getElementById("welcome-screen");
const targetScreen = document.getElementById("target-screen");
const gameScreen = document.getElementById("game-screen");
const congratsScreen = document.getElementById("congrats-screen");
const startButton = document.getElementById("start-btn");
const replayButton = document.getElementById("replay-btn");
const targetText = document.getElementById("target-text");
const countdownText = document.getElementById("countdown-text");
const canvas = document.getElementById("viewer-canvas");

let scene, camera, renderer, sphere, isDragging = false, lastX = 0, lastY = 0;
let currentYaw = 0;
let directionButtons = {};
const pressedKeys = new Set();
let testerMode = false; // Flag to check if in tester mode

window.addEventListener("load", async () => {
  welcomeScreen.style.display = "flex";
  targetScreen.style.display = "none";
  gameScreen.style.display = "none";
  congratsScreen.style.display = "none";
  await loadRoutes();
  await loadMap();

  if (testerMode) {
    startGameAtNode9A(); // Start directly at node 9A in tester mode
  }

});


function startGameAtNode9A() {
  username = "Tester"; // Set username to "Tester" or any name you want
  selectedRoute = routes[0]; // Pick the first route, or specify a custom route
  currentLocation = "9A"; // Start directly at node 9A
  showGameScreen(); // Skip the welcome screen and countdown
  
  // Optional: Simulate automatic clicks through the game
  setTimeout(() => {
    move("forward"); // Move in a predefined direction, you can chain more moves
    setTimeout(() => move("right"), 1000); // Move after 1 second
    // Add more steps if needed...
  }, 1000); // Start after 1 second
}


window.addEventListener("keydown", (e) => {
  if (!gameActive) return;
  const keyMap = {
    ArrowUp: "forward",
    ArrowDown: "backward",
    ArrowLeft: "left",
    ArrowRight: "right"
  };

  if (keyMap[e.key] && !pressedKeys[e.key]) {
    pressedKeys[e.key] = true;
    const abs = getRelativeDirections()[keyMap[e.key]];
    move(abs);
  }
});


window.addEventListener("keyup", (e) => {
  if (pressedKeys[e.key]) {
    pressedKeys[e.key] = false;
  }
});




startButton.addEventListener("click", () => {
  const name = document.getElementById("username").value.trim();
  if (!name) return alert("Please enter your name!");
  username = name;
  pickRandomRoute();
  showTargetScreen();
});

replayButton.addEventListener("click", () => {
  resetGame();
});

async function loadRoutes() {
  try {
    const res = await fetch("routes.json");
    routes = await res.json();
    console.log("✅ Loaded routes:", routes);
  } catch (err) {
    console.error("❌ Failed to load routes.json:", err);
    alert("Failed to load routes. Check routes.json.");
  }
}

async function loadMap() {
  try {
    const res = await fetch("map.json");
    mapData = await res.json();
    console.log("✅ Loaded map data");
  } catch (err) {
    console.error("❌ Failed to load map.json:", err);
    alert("Failed to load map. Check map.json.");
  }
}

function pickRandomRoute() {
  selectedRoute = routes[Math.floor(Math.random() * routes.length)];
  currentLocation = selectedRoute.start;
  console.log("🎯 Selected route:", selectedRoute);
  console.log("🧭 Start location:", selectedRoute.start);
  console.log("🏁 Target building:", selectedRoute.target);
}

function showTargetScreen() {
  welcomeScreen.style.display = "none";
  targetScreen.style.display = "flex";
  gameScreen.style.display = "none";
  congratsScreen.style.display = "none";
  targetText.innerText = `Target Building: ${selectedRoute.target}`;
  countdownText.innerText = countdown;

  let count = countdown;
  const interval = setInterval(() => {
    count--;
    countdownText.innerText = count;
    if (count <= 0) {
      clearInterval(interval);
      showGameScreen();
    }
  }, 1000);
}

function showGameScreen() {
  targetScreen.style.display = "none";
  gameScreen.style.display = "flex";
  moveCount = 0;
  timer = 0;
  pathHistoryArray = [];

  initThreeJS();
  loadCurrentLocation();
  setupNavigationButtons();
  setupOrientationDisplay();
  setupInfoBox(); // ✅ Make sure UI is ready BEFORE the timer
  gameActive = true;
  startTimer(); // ✅ Only start once UI is ready
}


function resetGame() {
  moveCount = 0;
  timer = 0;
  pathHistoryArray = []; // ✅ clear old path
  currentLocation = null;
  selectedRoute = null;
  pickRandomRoute();
  showTargetScreen();
}


function move(direction) {
  const current = mapData[currentLocation];
  if (current.neighbors && current.neighbors[direction]) {
    currentLocation = current.neighbors[direction];
    pathHistoryArray.push(currentLocation); // ✅ track each step
    moveCount++;
    console.log("➡️ Moved to:", currentLocation);
    loadCurrentLocation();
    updateInfoBox();
    checkIfAtTarget();
  } else {
    console.log("🚫 Can't move", direction, "from", currentLocation);
  }
}


function checkIfAtTarget() {
  const currentBuilding = mapData[currentLocation]?.building?.toLowerCase();
  const targetBuilding = selectedRoute.target.toLowerCase();
  if (currentBuilding === targetBuilding) {
    showCongratsScreen();
  }
}

function preloadNeighborImages(locationId) {
  const neighbors = mapData[locationId]?.neighbors;
  if (!neighbors) return;

  const loader = new THREE.TextureLoader();
  for (const direction in neighbors) {
    const neighborId = neighbors[direction];
    const neighborImage = mapData[neighborId]?.image;
    if (neighborImage) {
      loader.load(neighborImage); // just load into cache, don’t apply
    }
  }
}



async function showCongratsScreen() {
  stopTimer();
  gameActive = false;
  const lastGame = {
    username,
    start: selectedRoute.start,
    target: selectedRoute.target,
    moves: moveCount,
    time_sec: timer,
    path: pathHistoryArray,
  };

  // Save to Supabase
  const { error } = await supabase.from("leaderboard").insert([lastGame]);
  if (error) console.error("❌ Error inserting into leaderboard:", error);
  

  // UI updates
  welcomeScreen.style.display = "none";
  targetScreen.style.display = "none";
  gameScreen.style.display = "none";

  document.getElementById("info-box")?.remove();
  document.getElementById("orientation-display")?.remove();
  const controlPanel = document.querySelector("div[style*='grid']");
  if (controlPanel) controlPanel.remove();

  const startBuilding = getBuildingName(selectedRoute.start);
  const targetBuilding = getBuildingName(selectedRoute.target);
  
  document.getElementById("congrats-summary").innerText =
    `You took ${moveCount} moves and ${formatTime(timer)} from building ${startBuilding} to building ${targetBuilding}.`;
  

  await fetchRouteLeaderboard(selectedRoute.start, selectedRoute.target);

  congratsScreen.style.display = "flex";

  document.getElementById("replay-btn").onclick = () => resetGame();
  document.getElementById("full-leaderboard-btn").onclick = () => {
    alert("Coming soon: full leaderboard view!");
  };
}

async function fetchRouteLeaderboard(start, target) {
  const container = document.getElementById("route-leaderboard");
  container.innerText = "Loading...";

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("start", start)
    .eq("target", target)
    .order("time_sec", { ascending: true })
    .limit(5);

  if (error) {
    container.innerText = "Error loading route leaderboard.";
    console.error("❌", error);
    return;
  }

  if (!data.length) {
    container.innerText = "No entries yet for this route.";
    return;
  }

  const rows = data.map(row => `
    <tr>
      <td>${row.username}</td>
      <td>${row.moves}</td>
      <td>${formatTime(row.time_sec)}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    <table style="margin-top:10px; border-collapse: collapse; width: 100%;">
      <thead>
        <tr><th>Player</th><th>Moves</th><th>Time</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


async function fetchAndDisplayLeaderboard() {
  const leaderboardContainer = document.getElementById("leaderboard-container");

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("time_sec", { ascending: true })
    .limit(10);

  if (error) {
    leaderboardContainer.innerText = "Error loading leaderboard.";
    console.error("❌ Failed to fetch leaderboard:", error);
    return;
  }

  if (!data || data.length === 0) {
    leaderboardContainer.innerText = "No entries yet!";
    return;
  }

  const table = document.createElement("table");
  table.style.marginTop = "10px";
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.innerHTML = `
    <tr>
      <th>Player</th>
      <th>Start</th>
      <th>Target</th>
      <th>Moves</th>
      <th>Time</th>
    </tr>
    ${data
      .map(
        (row) => `
      <tr>
        <td>${row.username}</td>
        <td>${row.start}</td>
        <td>${row.target}</td>
        <td>${row.moves}</td>
        <td>${formatTime(row.time_sec)}</td>
      </tr>`
      )
      .join("")}
  `;

  leaderboardContainer.innerHTML = "";
  leaderboardContainer.appendChild(table);
}


function startTimer() {
  timer = 0;
  updateInfoBox();
  timerInterval = setInterval(() => {
    timer++;
    updateInfoBox();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function loadCurrentLocation() {
  const loc = mapData[currentLocation];
  if (!loc) return alert("Invalid location: " + currentLocation);
  load360Image(loc.image);
  preloadNeighborImages(currentLocation); // 👈 Preload here!
  console.log(`🖼 Now viewing image: ${loc.image} at location: ${currentLocation}`);
  updateNavigationButtons();
}


function initThreeJS() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 0.1;

  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  animate();

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    sphere.rotation.y -= dx * 0.005;
    sphere.rotation.x -= dy * 0.005;
    lastX = e.clientX;
    lastY = e.clientY;

    currentYaw = (360 - sphere.rotation.y * (180 / Math.PI)) % 360;
    if (currentYaw < 0) currentYaw += 360;

    updateNavigationButtons();
    updateOrientationDisplay();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function load360Image(path) {
  const loader = new THREE.TextureLoader();
  loader.load(
    path,
    (texture) => {
      sphere.material.map = texture;
      sphere.material.needsUpdate = true;
      console.log("✅ Loaded texture:", path);
    },
    undefined,
    (err) => {
      console.error("❌ Failed to load texture:", path, err);
    }
  );
}

function getBuildingName(locationId) {
  const location = mapData[locationId];
  return location?.building || locationId;
}


function getRelativeDirections() {
  const yaw = currentYaw;

  const sectors = [
    { dir: "north", angle: 0 },
    { dir: "east", angle: 90 },
    { dir: "south", angle: 180 },
    { dir: "west", angle: 270 }
  ];

  const threshold = 15;
  let forward = sectors.reduce((prev, curr) => {
    const diff = Math.abs(curr.angle - yaw);
    return (diff < Math.abs(prev.angle - yaw) && diff < threshold) ? curr : prev;
  }).dir;

  if (forward === "north") forward = "south";
  else if (forward === "south") forward = "north";

  const compass = ["north", "east", "south", "west"];
  const idx = compass.indexOf(forward);

  return {
    forward,
    right: compass[(idx + 1) % 4],
    backward: compass[(idx + 2) % 4],
    left: compass[(idx + 3) % 4]
  };
}

function updateNavigationButtons() {
  const directions = getRelativeDirections();
  const neighbors = mapData[currentLocation]?.neighbors || {};

  for (const [input, absolute] of Object.entries(directions)) {
    const btn = directionButtons[input];
    if (btn) {
      btn.disabled = !(absolute in neighbors);
    }
  }
}

function setupNavigationButtons() {
  const controlPanel = document.createElement("div");
  controlPanel.style.position = "absolute";
  controlPanel.style.bottom = "20px";
  controlPanel.style.right = "20px";
  controlPanel.style.display = "grid";
  controlPanel.style.gridTemplateRows = "repeat(3, 50px)";
  controlPanel.style.gridTemplateColumns = "repeat(3, 50px)";
  controlPanel.style.gap = "5px";
  controlPanel.style.zIndex = "10";

  const makeBtn = (label, inputDir) => {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.style.fontSize = "18px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      const abs = getRelativeDirections()[inputDir];
      move(abs);
    };
    directionButtons[inputDir] = btn;
    return btn;
  };

  controlPanel.appendChild(document.createElement("div"));
  controlPanel.appendChild(makeBtn("↑", "forward"));
  controlPanel.appendChild(document.createElement("div"));
  controlPanel.appendChild(makeBtn("←", "left"));
  controlPanel.appendChild(document.createElement("div"));
  controlPanel.appendChild(makeBtn("→", "right"));
  controlPanel.appendChild(document.createElement("div"));
  controlPanel.appendChild(makeBtn("↓", "backward"));
  controlPanel.appendChild(document.createElement("div"));

  document.body.appendChild(controlPanel);


}

function setupOrientationDisplay() {
  const display = document.createElement("div");
  display.id = "orientation-display";
  display.style.position = "absolute";
  display.style.top = "10px";
  display.style.left = "10px";
  display.style.color = "white";
  display.style.fontSize = "16px";
  display.style.zIndex = "20";
  document.body.appendChild(display);
  updateOrientationDisplay();
}

function updateOrientationDisplay() {
  const dir = getRelativeDirections().forward;
  const yaw = currentYaw.toFixed(1);
  document.getElementById("orientation-display").innerText = `Yaw: ${yaw}° | Facing: ${dir}`;
}

function setupInfoBox() {
  const infoBox = document.createElement("div");
  infoBox.id = "info-box";
  infoBox.style.position = "absolute";
  infoBox.style.top = "20px";
  infoBox.style.right = "20px";
  infoBox.style.padding = "10px";
  infoBox.style.backgroundColor = "#eee";
  infoBox.style.borderRadius = "10px";
  infoBox.style.color = "black";
  infoBox.style.fontSize = "14px";
  infoBox.style.zIndex = "30";

  const targetBuildingText = document.createElement("p");
  targetBuildingText.innerText = `Target Building: ${selectedRoute.target}`;

  const moveCountText = document.createElement("p");
  moveCountText.id = "move-count-text";
  moveCountText.innerText = `Moves: ${moveCount}`;

  const timerText = document.createElement("p");
  timerText.id = "timer-text";
  timerText.innerText = `Time: 00:00`;

  infoBox.appendChild(targetBuildingText);
  infoBox.appendChild(moveCountText);
  infoBox.appendChild(timerText);

  document.body.appendChild(infoBox);
}

function updateInfoBox() {
  console.log("🔄 Updating UI — Moves:", moveCount, "Time:", timer);

  const moveText = document.getElementById("move-count-text");
  if (moveText) moveText.innerText = `Moves: ${moveCount}`;

  const timerText = document.getElementById("timer-text");
  if (timerText) timerText.innerText = `Time: ${formatTime(timer)}`;
}


function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
