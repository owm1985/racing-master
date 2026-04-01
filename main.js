const BEST_SCORE_KEY = "pikachu-rush-best-score";
const GRAVITY = 0.58;
const FRICTION = 0.82;
const MOVE_SPEED = 0.85;
const MAX_SPEED_X = 6;
const JUMP_POWER = -13.5;
const LEVEL_WIDTH = 3400;
const GROUND_Y = 470;

const CHARACTERS = [
    { id: "pikachu", name: "피카츄", role: "player", badge: "⚡", color: "#ffd84d" },
    { id: "raichu", name: "라이츄", role: "goal", badge: "⚡", color: "#ef8a32" },
    { id: "charmander", name: "파이리", role: "friend", badge: "🔥", color: "#f06a53" },
    { id: "squirtle", name: "꼬부기", role: "friend", badge: "💧", color: "#4c8ef7" },
    { id: "butterfree", name: "버터플", role: "friend", badge: "🦋", color: "#8e70f2" },
    { id: "slowbro", name: "야도란", role: "friend", badge: "🌊", color: "#d070a6" },
    { id: "pidgeot", name: "피존투", role: "friend", badge: "🪶", color: "#9c7448" },
    { id: "koffing", name: "또가스", role: "enemy", badge: "☁️", color: "#8f68db" },
    { id: "snorlax", name: "잠만보", role: "enemy", badge: "💤", color: "#457577" },
    { id: "bulbasaur", name: "이상해씨", role: "friend", badge: "🌿", color: "#58a96d" }
];

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const statusTextNode = document.getElementById("status-text");
const statusSubtextNode = document.getElementById("status-subtext");
const scoreNode = document.getElementById("score");
const bestScoreNode = document.getElementById("best-score");
const livesNode = document.getElementById("lives");
const coresNode = document.getElementById("cores");
const progressNode = document.getElementById("progress");
const rosterNode = document.getElementById("roster");
const restartButton = document.getElementById("restart-button");
const overlayNode = document.getElementById("result-overlay");
const resultTitleNode = document.getElementById("result-title");
const resultMessageNode = document.getElementById("result-message");
const playAgainButton = document.getElementById("play-again-button");

const keys = { left: false, right: false };

const platforms = [
    { x: 0, y: 470, w: 420, h: 90 },
    { x: 480, y: 420, w: 160, h: 24 },
    { x: 720, y: 360, w: 140, h: 24 },
    { x: 920, y: 470, w: 260, h: 90 },
    { x: 1240, y: 395, w: 170, h: 24 },
    { x: 1470, y: 335, w: 150, h: 24 },
    { x: 1680, y: 470, w: 300, h: 90 },
    { x: 2050, y: 410, w: 170, h: 24 },
    { x: 2290, y: 350, w: 150, h: 24 },
    { x: 2510, y: 470, w: 310, h: 90 },
    { x: 2890, y: 380, w: 160, h: 24 },
    { x: 3110, y: 470, w: 290, h: 90 }
];

const enemiesBase = [
    { x: 570, y: 384, w: 48, h: 36, vx: 1.2, minX: 500, maxX: 600, characterId: "koffing" },
    { x: 1000, y: 430, w: 84, h: 40, vx: 1.1, minX: 960, maxX: 1090, characterId: "snorlax" },
    { x: 1540, y: 295, w: 48, h: 40, vx: 1.4, minX: 1480, maxX: 1568, characterId: "koffing" },
    { x: 1760, y: 430, w: 84, h: 40, vx: 1.25, minX: 1710, maxX: 1880, characterId: "snorlax" },
    { x: 2340, y: 310, w: 48, h: 40, vx: 1.5, minX: 2300, maxX: 2380, characterId: "koffing" },
    { x: 2660, y: 430, w: 84, h: 40, vx: 1.15, minX: 2550, maxX: 2720, characterId: "snorlax" }
];

const coresBase = [
    { x: 540, y: 372, characterId: "charmander" },
    { x: 770, y: 312, characterId: "squirtle" },
    { x: 1280, y: 347, characterId: "butterfree" },
    { x: 1510, y: 287, characterId: "slowbro" },
    { x: 1830, y: 418, characterId: "pidgeot" },
    { x: 2120, y: 362, characterId: "bulbasaur" },
    { x: 2340, y: 302, characterId: "charmander" },
    { x: 2930, y: 332, characterId: "butterfree" }
];

const goal = { x: 3290, y: 320, w: 64, h: 150, characterId: "raichu" };

let animationFrameId = 0;
let bestScore = 0;
let score = 0;
let lives = 3;
let collectedCores = 0;
let gameEnded = false;
let cameraX = 0;
let foundRoster = new Set(["pikachu"]);

let player;
let enemies;
let cores;

function getCharacter(id) {
    return CHARACTERS.find((character) => character.id === id);
}

function loadBestScore() {
    try {
        const stored = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
        return Number.isFinite(stored) ? stored : 0;
    } catch (error) {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch (error) {
    }
}

function cloneEntities() {
    enemies = enemiesBase.map((enemy) => ({ ...enemy }));
    cores = coresBase.map((core) => ({ ...core, collected: false }));
}

function setStatus(title, subtext) {
    statusTextNode.textContent = title;
    statusSubtextNode.textContent = subtext;
}

function renderRoster() {
    rosterNode.innerHTML = "";
    CHARACTERS.forEach((character) => {
        const chip = document.createElement("span");
        chip.className = "roster-chip";
        if (foundRoster.has(character.id)) {
            chip.classList.add("found");
        }
        chip.textContent = `${character.badge} ${character.name}`;
        rosterNode.appendChild(chip);
    });
}

function updateHud() {
    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
    }

    scoreNode.textContent = String(score);
    bestScoreNode.textContent = String(bestScore);
    livesNode.textContent = String(lives);
    coresNode.textContent = `${collectedCores} / ${coresBase.length}`;
    progressNode.textContent = `${Math.max(0, Math.min(100, Math.round((player.x / (goal.x - 80)) * 100)))}%`;
    renderRoster();
}

function resetPlayer() {
    player = {
        x: 80,
        y: 360,
        w: 46,
        h: 58,
        vx: 0,
        vy: 0,
        onGround: false,
        invincibleUntil: 0,
        facing: 1
    };
    cameraX = 0;
}

function startGame() {
    cancelAnimationFrame(animationFrameId);
    score = 0;
    lives = 3;
    collectedCores = 0;
    gameEnded = false;
    foundRoster = new Set(["pikachu", "raichu"]);
    cloneEntities();
    resetPlayer();
    overlayNode.classList.add("hidden");
    setStatus("출발 준비", "방향키로 이동하고 스페이스로 점프하세요.");
    updateHud();
    lastTime = 0;
    animationFrameId = requestAnimationFrame(loop);
}

function showResult(title, message) {
    gameEnded = true;
    overlayNode.classList.remove("hidden");
    resultTitleNode.textContent = title;
    resultMessageNode.textContent = message;
}

function hitPlayer(enemyCharacter) {
    const now = performance.now();
    if (now < player.invincibleUntil || gameEnded) {
        return;
    }

    lives -= 1;
    player.invincibleUntil = now + 1400;
    player.vx = -4;
    player.vy = -8;
    setStatus("피격", `${enemyCharacter.name}에게 막혔습니다. 하트가 하나 줄었습니다.`);
    updateHud();

    if (lives <= 0) {
        showResult("게임 오버", `점수 ${score}점. 또가스와 잠만보 구간을 넘기지 못했습니다.`);
    }
}

function collectCore(core) {
    if (core.collected) {
        return;
    }

    core.collected = true;
    collectedCores += 1;
    score += 150;
    foundRoster.add(core.characterId);
    const character = getCharacter(core.characterId);
    setStatus("코어 획득", `${character.name}의 에너지를 얻었습니다.`);
    updateHud();
}

function finishLevel() {
    if (gameEnded) {
        return;
    }

    const bonus = collectedCores * 120 + lives * 180;
    score += bonus;
    foundRoster = new Set(CHARACTERS.map((character) => character.id));
    updateHud();
    setStatus("클리어", "라이츄 게이트 도착. 스테이지 돌파 성공.");
    showResult("스테이지 클리어", `최종 점수 ${score}점. 수집 코어 ${collectedCores}개, 남은 하트 ${lives}개.`);
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer() {
    if (keys.left) {
        player.vx -= MOVE_SPEED;
        player.facing = -1;
    }
    if (keys.right) {
        player.vx += MOVE_SPEED;
        player.facing = 1;
    }

    player.vx *= FRICTION;
    player.vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, player.vx));
    player.vy += GRAVITY;

    player.x += player.vx;
    player.y += player.vy;
    player.onGround = false;

    platforms.forEach((platform) => {
        const wasAbove = player.y + player.h - player.vy <= platform.y;
        const withinX = player.x + player.w > platform.x && player.x < platform.x + platform.w;
        if (withinX && wasAbove && player.y + player.h >= platform.y && player.y + player.h <= platform.y + 26 && player.vy >= 0) {
            player.y = platform.y - player.h;
            player.vy = 0;
            player.onGround = true;
        }
    });

    if (player.y + player.h >= GROUND_Y && player.x < 420) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
    }
    if (player.y + player.h >= GROUND_Y && player.x > 920 && player.x < 1180) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
    }
    if (player.y + player.h >= GROUND_Y && player.x > 1680 && player.x < 1980) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
    }
    if (player.y + player.h >= GROUND_Y && player.x > 2510 && player.x < 2820) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
    }
    if (player.y + player.h >= GROUND_Y && player.x > 3110) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.onGround = true;
    }

    if (player.y > canvas.height + 120) {
        lives -= 1;
        updateHud();
        if (lives <= 0) {
            showResult("게임 오버", `점수 ${score}점. 낙하로 모험이 종료됐습니다.`);
        } else {
            setStatus("낙하", "발판 아래로 떨어졌습니다. 다시 시도하세요.");
            resetPlayer();
        }
    }

    player.x = Math.max(0, Math.min(LEVEL_WIDTH - player.w, player.x));
    cameraX = Math.max(0, Math.min(LEVEL_WIDTH - canvas.width, player.x - canvas.width * 0.35));
}

function updateEnemies() {
    enemies.forEach((enemy) => {
        enemy.x += enemy.vx;
        if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
            enemy.vx *= -1;
        }

        if (rectsOverlap(player, enemy)) {
            hitPlayer(getCharacter(enemy.characterId));
        }
    });
}

function updateCores() {
    cores.forEach((core) => {
        if (!core.collected && rectsOverlap(player, { x: core.x, y: core.y, w: 28, h: 28 })) {
            collectCore(core);
        }
    });
}

function updateGoal() {
    if (rectsOverlap(player, goal)) {
        finishLevel();
    }
}

function drawBackground() {
    const scroll = cameraX * 0.35;
    ctx.fillStyle = "#86d8ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 5; i += 1) {
        const x = ((i * 210 - scroll) % (canvas.width + 180)) - 100;
        ctx.beginPath();
        ctx.arc(x + 60, 90 + (i % 2) * 20, 28, 0, Math.PI * 2);
        ctx.arc(x + 92, 82 + (i % 2) * 20, 36, 0, Math.PI * 2);
        ctx.arc(x + 130, 92 + (i % 2) * 20, 26, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#7dc76d";
    ctx.fillRect(0, 440, canvas.width, 100);
    ctx.fillStyle = "#5aa455";
    ctx.fillRect(0, 468, canvas.width, 72);
}

function drawPlatforms() {
    platforms.forEach((platform) => {
        const screenX = platform.x - cameraX;
        ctx.fillStyle = platform.h > 30 ? "#8e6b44" : "#a47d4c";
        ctx.fillRect(screenX, platform.y, platform.w, platform.h);
        ctx.fillStyle = "#6ec767";
        ctx.fillRect(screenX, platform.y, platform.w, 12);
    });
}

function drawGoal() {
    const raichu = getCharacter(goal.characterId);
    const x = goal.x - cameraX;
    ctx.fillStyle = "#f4c35c";
    ctx.fillRect(x, goal.y, goal.w, goal.h);
    ctx.fillStyle = raichu.color;
    ctx.fillRect(x + 8, goal.y + 12, goal.w - 16, goal.h - 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px sans-serif";
    ctx.fillText(raichu.badge, x + 18, goal.y + 44);
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(raichu.name, x - 10, goal.y - 10);
}

function drawCores() {
    cores.forEach((core) => {
        if (core.collected) {
            return;
        }
        const character = getCharacter(core.characterId);
        const x = core.x - cameraX;
        const bob = Math.sin((performance.now() + core.x) / 180) * 5;
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(x + 14, core.y + 14 + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px sans-serif";
        ctx.fillText(character.badge, x + 6, core.y + 20 + bob);
    });
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        const character = getCharacter(enemy.characterId);
        const x = enemy.x - cameraX;
        ctx.fillStyle = character.color;
        ctx.fillRect(x, enemy.y, enemy.w, enemy.h);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x + 6, enemy.y + 6, enemy.w - 12, enemy.h - 12);
        ctx.fillStyle = "#ffffff";
        ctx.font = enemy.w > 60 ? "26px sans-serif" : "22px sans-serif";
        ctx.fillText(character.badge, x + enemy.w * 0.22, enemy.y + enemy.h * 0.7);
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(character.name, x - 10, enemy.y - 8);
    });
}

function drawPlayer() {
    const blink = performance.now() < player.invincibleUntil && Math.floor(performance.now() / 100) % 2 === 0;
    if (blink) {
        return;
    }

    const x = player.x - cameraX;
    ctx.fillStyle = "#ffd84d";
    ctx.fillRect(x, player.y, player.w, player.h);
    ctx.fillStyle = "#1f2430";
    ctx.fillRect(x + (player.facing === 1 ? 30 : 8), player.y + 18, 6, 6);
    ctx.fillStyle = "#e96b51";
    ctx.fillRect(x + 10, player.y + 42, 26, 10);
    ctx.font = "24px sans-serif";
    ctx.fillText("⚡", x + 10, player.y + 28);
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("피카츄", x - 8, player.y - 10);
}

function drawHudInsideCanvas() {
    ctx.fillStyle = "rgba(255, 251, 239, 0.82)";
    ctx.fillRect(18, 18, 260, 72);
    ctx.fillStyle = "#202635";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`점수 ${score}`, 30, 46);
    ctx.fillText(`하트 ${"♥".repeat(Math.max(0, lives))}`, 30, 74);
    ctx.fillText(`코어 ${collectedCores}/${coresBase.length}`, 150, 46);
    ctx.fillText(`진행 ${Math.round((player.x / goal.x) * 100)}%`, 150, 74);
}

let lastTime = 0;
function loop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (!gameEnded) {
        updatePlayer(delta);
        updateEnemies(delta);
        updateCores();
        updateGoal();
    }

    drawBackground();
    drawPlatforms();
    drawGoal();
    drawCores();
    drawEnemies();
    drawPlayer();
    drawHudInsideCanvas();
    updateHud();

    animationFrameId = requestAnimationFrame(loop);
}

function handleKeyDown(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        keys.left = true;
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        keys.right = true;
    } else if ((event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") && player.onGround && !gameEnded) {
        event.preventDefault();
        player.vy = JUMP_POWER;
        player.onGround = false;
    } else if (event.code === "KeyR") {
        startGame();
    }
}

function handleKeyUp(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        keys.left = false;
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        keys.right = false;
    }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);

bestScore = loadBestScore();
startGame();
