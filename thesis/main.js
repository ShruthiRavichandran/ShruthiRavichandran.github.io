let username = "";
let countdown = 5;
let routes = [];
let selectedRoute = null;
let currentLocation = null;
let mapData = {};
let moveCount = 0;
let timer = 0;
let timerInterval = null;
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

window.addEventListener("load", async () => {
  welcomeScreen.style.display = "flex";
  targetScreen.style.display = "none";
  gameScreen.style.display = "none";
  congratsScreen.style.display = "none";
  await loadRoutes();
  await loadMap();
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
  initThreeJS();
  loadCurrentLocation();
  setupNavigationButtons();
  setupOrientationDisplay();
  setupInfoBox();
  moveCount = 0;
  timer = 0;
  startTimer();
}

function resetGame() {
  moveCount = 0;
  timer = 0;
  currentLocation = null;
  selectedRoute = null;
  pickRandomRoute();
  showTargetScreen();
}

function move(direction) {
  const current = mapData[currentLocation];
  if (current.neighbors && current.neighbors[direction]) {
    currentLocation = current.neighbors[direction];
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

function showCongratsScreen() {
  stopTimer();

  if (!gameHistory[username]) {
    gameHistory[username] = [];
  }
  
  gameHistory[username].push({
    route: {
      start: selectedRoute.start,
      target: selectedRoute.target,
    },
    moves: moveCount,
    time: timer,
    timestamp: new Date().toISOString()
  });
  
  console.log("📚 Game history for", username, gameHistory[username]);
  

  welcomeScreen.style.display = "none";
  targetScreen.style.display = "none";
  gameScreen.style.display = "none";

  document.getElementById("info-box")?.remove();
  document.getElementById("orientation-display")?.remove();
  const controlPanel = document.querySelector("div[style*='grid']");
  if (controlPanel) controlPanel.remove();

  const targetBase = selectedRoute.target.replace(/[^a-zA-Z0-9]/g, "");
  const messageParagraphs = congratsScreen.querySelectorAll("p");

  if (messageParagraphs[0]) {
    messageParagraphs[0].innerText = `You’ve reached building ${targetBase}!`;
  }

  let timeSummary = "";
  if (timer < 60) {
    timeSummary = `${timer} seconds`;
  } else {
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    timeSummary = `${mins} minute${mins > 1 ? "s" : ""} and ${secs} second${secs !== 1 ? "s" : ""}`;
  }

  if (messageParagraphs[1]) {
    messageParagraphs[1].innerText = `You took ${moveCount} moves and ${timeSummary}.`;
  } else {
    const summary = document.createElement("p");
    summary.innerText = `You took ${moveCount} moves and ${timeSummary}.`;
    congratsScreen.appendChild(summary);
  }

  congratsScreen.style.display = "flex";
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
}

function loadCurrentLocation() {
  const loc = mapData[currentLocation];
  if (!loc) return alert("Invalid location: " + currentLocation);
  load360Image(`https://tunnel-public.shruthi-ravichandran.workers.dev/${loc.image}`);
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

  window.addEventListener("keydown", (e) => {
    const keyMap = {
      ArrowUp: "forward",
      ArrowDown: "backward",
      ArrowLeft: "left",
      ArrowRight: "right"
    };
    const input = keyMap[e.key];
    if (input) {
      const abs = getRelativeDirections()[input];
      move(abs);
    }
  });
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
