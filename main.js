const BEST_SCORE_KEY = "tetris-volt-best-score";
const LEADERBOARD_KEY = "tetris-volt-top-five";
const COMMENTS_KEY = "tetris-volt-comments";
const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
const BOARD_X = 110;
const BOARD_Y = 30;
const DROP_INTERVAL_START = 950;
const LEVEL_STEP = 6;
const PREVIEW_COUNT = 3;
const SOFT_DROP_POINTS = 1;
const HARD_DROP_POINTS = 2;
const LINE_CLEAR_POINTS = [0, 100, 300, 500, 800];
const TARGET_LINES = 18;
const TIME_LIMIT_MS = 1 * 60 * 1000;

const PIECES = {
    I: {
        color: "#57d6ff",
        rotations: [
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]],
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]]
        ]
    },
    O: {
        color: "#ffd84d",
        rotations: [
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]]
        ]
    },
    T: {
        color: "#b27cff",
        rotations: [
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]]
        ]
    },
    S: {
        color: "#67d67b",
        rotations: [
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]],
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]]
        ]
    },
    Z: {
        color: "#ff7a6b",
        rotations: [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]],
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ]
    },
    J: {
        color: "#5f8cff",
        rotations: [
            [[1, 0, 0], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[0, 1], [0, 1], [1, 1]]
        ]
    },
    L: {
        color: "#ffb055",
        rotations: [
            [[0, 0, 1], [1, 1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1], [0, 1], [0, 1]]
        ]
    }
};

const PIECE_ORDER = Object.keys(PIECES);

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
const leaderboardNode = document.getElementById("leaderboard");
const restartButton = document.getElementById("restart-button");
const overlayNode = document.getElementById("result-overlay");
const resultTitleNode = document.getElementById("result-title");
const resultMessageNode = document.getElementById("result-message");
const playAgainButton = document.getElementById("play-again-button");
const partnershipForm = document.getElementById("partnership-form");
const partnershipSubmitButton = document.getElementById("partnership-submit");
const formStatusNode = document.getElementById("form-status");
const commentForm = document.getElementById("comment-form");
const commentSubmitButton = document.getElementById("comment-submit");
const commentStatusNode = document.getElementById("comment-status");
const commentListNode = document.getElementById("comment-list");
const leaderboardForm = document.getElementById("leaderboard-form");
const leaderboardNameInput = document.getElementById("leaderboard-name");
const leaderboardStatusNode = document.getElementById("leaderboard-status");
const leaderboardSummaryNode = document.getElementById("leaderboard-summary");

let board = [];
let currentPiece = null;
let nextQueue = [];
let animationFrameId = 0;
let lastTime = 0;
let dropAccumulator = 0;
let score = 0;
let bestScore = 0;
let lines = 0;
let level = 1;
let gameEnded = false;
let remainingTimeMs = TIME_LIMIT_MS;
let roundSaved = false;
let resultOutcome = "fail";

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function setStatus(title, subtext) {
    statusTextNode.textContent = title;
    statusSubtextNode.textContent = subtext;
}

function formatTime(ms) {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.ceil(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function loadLeaderboard() {
    try {
        const stored = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveLeaderboard(entries) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 5)));
    } catch (error) {
    }
}

function sortLeaderboard(entries) {
    return [...entries].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        if (b.lines !== a.lines) {
            return b.lines - a.lines;
        }
        if (b.remainingTimeMs !== a.remainingTimeMs) {
            return b.remainingTimeMs - a.remainingTimeMs;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }).slice(0, 5);
}

function createPreviewLeaderboardEntry() {
    return {
        name: "현재 플레이",
        score,
        lines,
        level,
        remainingTimeMs,
        outcome: "live",
        createdAt: new Date().toISOString(),
        isPreview: true
    };
}

function compareLeaderboardEntries(a, b) {
    if (a.score !== b.score) {
        return a.score - b.score;
    }
    if (a.lines !== b.lines) {
        return a.lines - b.lines;
    }
    if (a.remainingTimeMs !== b.remainingTimeMs) {
        return a.remainingTimeMs - b.remainingTimeMs;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function getLiveLeaderboardEntries() {
    const entries = loadLeaderboard();
    if (gameEnded || roundSaved) {
        return entries;
    }

    return sortLeaderboard([...entries, createPreviewLeaderboardEntry()]);
}

function renderLeaderboard() {
    if (!leaderboardNode) {
        return;
    }

    const entries = getLiveLeaderboardEntries();
    leaderboardNode.innerHTML = "";

    if (!entries.length) {
        const item = document.createElement("li");
        item.className = "leaderboard-empty";
        item.textContent = "아직 등록된 기록이 없습니다.";
        leaderboardNode.appendChild(item);
        return;
    }

    entries.forEach((entry, index) => {
        const item = document.createElement("li");
        item.className = "leaderboard-item";
        if (entry.isPreview) {
            item.classList.add("leaderboard-item-preview");
        }

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = `#${index + 1}`;

        const name = document.createElement("strong");
        name.textContent = entry.name;

        const meta = document.createElement("span");
        meta.className = "leaderboard-meta";
        meta.textContent = `${entry.score}점 · ${entry.lines}줄 · ${formatTime(entry.remainingTimeMs)} 남음`;

        item.append(rank, name, meta);
        leaderboardNode.appendChild(item);
    });
}

function qualifiesForLeaderboard() {
    const currentEntry = createLeaderboardEntry("현재 플레이");
    const entries = loadLeaderboard();

    if (entries.length < 5) {
        return true;
    }

    const sorted = sortLeaderboard(entries);
    const cutoff = sorted[sorted.length - 1];
    return compareLeaderboardEntries(currentEntry, cutoff) > 0;
}

function setLeaderboardFormVisible(visible) {
    if (!leaderboardForm) {
        return;
    }
    leaderboardForm.classList.toggle("hidden", !visible);
    leaderboardSummaryNode.classList.toggle("hidden", visible);
    leaderboardStatusNode.textContent = "";
    leaderboardStatusNode.className = "form-status";
    if (visible) {
        leaderboardNameInput.value = "";
        setTimeout(() => leaderboardNameInput.focus(), 0);
    }
}

function createLeaderboardEntry(name) {
    return {
        name,
        score,
        lines,
        level,
        remainingTimeMs,
        outcome: resultOutcome,
        createdAt: new Date().toISOString()
    };
}

function getDropInterval() {
    return Math.max(180, DROP_INTERVAL_START - (level - 1) * 70);
}

function makeBag() {
    const bag = [...PIECE_ORDER];
    for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

function refillQueue() {
    while (nextQueue.length < PREVIEW_COUNT + 4) {
        nextQueue.push(...makeBag());
    }
}

function getMatrix(piece = currentPiece) {
    return PIECES[piece.type].rotations[piece.rotation];
}

function createPiece(type) {
    const matrix = PIECES[type].rotations[0];
    return {
        type,
        rotation: 0,
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: -getSpawnOffset(matrix)
    };
}

function getSpawnOffset(matrix) {
    let emptyTop = 0;
    for (const row of matrix) {
        if (row.every((cell) => cell === 0)) {
            emptyTop += 1;
        } else {
            break;
        }
    }
    return emptyTop;
}

function spawnPiece() {
    refillQueue();
    currentPiece = createPiece(nextQueue.shift());
    if (collides(currentPiece)) {
        finishRound(false, "필드가 가득 차서 더 이상 블록을 둘 수 없습니다.");
    }
}

function collides(piece, offsetX = 0, offsetY = 0, rotation = piece.rotation) {
    const matrix = PIECES[piece.type].rotations[rotation];
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (!matrix[y][x]) {
                continue;
            }
            const boardX = piece.x + x + offsetX;
            const boardY = piece.y + y + offsetY;
            if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                return true;
            }
            if (boardY >= 0 && board[boardY][boardX]) {
                return true;
            }
        }
    }
    return false;
}

function mergePiece() {
    const matrix = getMatrix();
    matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (!cell) {
                return;
            }
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0) {
                board[boardY][boardX] = currentPiece.type;
            }
        });
    });
}

function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (board[y].every(Boolean)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));
            cleared += 1;
            y += 1;
        }
    }

    if (!cleared) {
        setStatus("낙하 중", `${TARGET_LINES}줄 목표까지 ${Math.max(0, TARGET_LINES - lines)}줄 남았습니다.`);
        return;
    }

    lines += cleared;
    level = Math.floor(lines / LEVEL_STEP) + 1;
    score += LINE_CLEAR_POINTS[cleared] * level;
    const label = cleared === 4 ? "테트리스" : `${cleared}줄 제거`;
    setStatus(label, `${TARGET_LINES}줄 목표까지 ${Math.max(0, TARGET_LINES - lines)}줄 남았습니다.`);

    if (lines >= TARGET_LINES) {
        finishRound(true, `${formatTime(remainingTimeMs)}를 남기고 목표를 달성했습니다.`);
    }
}

function lockPiece() {
    mergePiece();
    clearLines();
    if (!gameEnded) {
        spawnPiece();
        updateHud();
    }
}

function movePiece(deltaX) {
    if (gameEnded || !currentPiece) {
        return;
    }
    if (!collides(currentPiece, deltaX, 0)) {
        currentPiece.x += deltaX;
        updateHud();
    }
}

function rotatePiece(direction) {
    if (gameEnded || !currentPiece) {
        return;
    }
    const nextRotation = (currentPiece.rotation + direction + 4) % 4;
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
        if (!collides(currentPiece, kick, 0, nextRotation)) {
            currentPiece.x += kick;
            currentPiece.rotation = nextRotation;
            setStatus("회전 성공", "벽에 닿으면 살짝 밀어내며 회전합니다.");
            return;
        }
    }
}

function softDrop() {
    if (gameEnded || !currentPiece) {
        return;
    }
    if (!collides(currentPiece, 0, 1)) {
        currentPiece.y += 1;
        score += SOFT_DROP_POINTS;
    } else {
        lockPiece();
    }
}

function hardDrop() {
    if (gameEnded || !currentPiece) {
        return;
    }
    let distance = 0;
    while (!collides(currentPiece, 0, 1)) {
        currentPiece.y += 1;
        distance += 1;
    }
    score += distance * HARD_DROP_POINTS;
    setStatus("하드 드롭", `${distance}칸을 즉시 낙하시켰습니다.`);
    lockPiece();
}

function finishRound(success, message) {
    if (gameEnded) {
        return;
    }

    gameEnded = true;
    resultOutcome = success ? "clear" : "fail";
    overlayNode.classList.remove("hidden");
    resultTitleNode.textContent = success ? "타임어택 성공" : "타임어택 실패";
    resultMessageNode.textContent = `점수 ${score}점 · ${lines}/${TARGET_LINES}줄 · 남은 시간 ${formatTime(remainingTimeMs)}.`;
    leaderboardSummaryNode.textContent = success ? message : message || "1분 안에 목표 줄 수를 채우지 못했습니다.";
    setStatus(success ? "클리어" : "종료", success ? message : (message || "1분 타임어택 종료. 다시 도전해보세요."));
    setLeaderboardFormVisible(qualifiesForLeaderboard() && !roundSaved);
}

function startGame() {
    cancelAnimationFrame(animationFrameId);
    board = createBoard();
    nextQueue = [];
    refillQueue();
    score = 0;
    lines = 0;
    level = 1;
    gameEnded = false;
    remainingTimeMs = TIME_LIMIT_MS;
    dropAccumulator = 0;
    lastTime = 0;
    roundSaved = false;
    resultOutcome = "fail";
    overlayNode.classList.add("hidden");
    setLeaderboardFormVisible(false);
    spawnPiece();
    setStatus("시작", `1분 안에 ${TARGET_LINES}줄을 지우면 클리어입니다.`);
    updateHud();
    animationFrameId = requestAnimationFrame(loop);
}

function updateHud() {
    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
    }

    scoreNode.textContent = String(score);
    bestScoreNode.textContent = String(bestScore);
    livesNode.textContent = `${lines} / ${TARGET_LINES}`;
    coresNode.textContent = String(level);
    progressNode.textContent = formatTime(remainingTimeMs);
    renderQueue();
    renderLeaderboard();
}

function renderQueue() {
    rosterNode.innerHTML = "";
    nextQueue.slice(0, PREVIEW_COUNT).forEach((type, index) => {
        const chip = document.createElement("div");
        chip.className = "roster-chip found queue-chip";
        chip.innerHTML = `<strong>${index === 0 ? "NEXT" : `+${index}`}</strong><span>${type}</span>`;
        chip.style.borderColor = PIECES[type].color;
        chip.style.boxShadow = `inset 0 0 0 1px ${PIECES[type].color}40`;
        rosterNode.appendChild(chip);
    });
}

function getGhostY() {
    let ghostY = currentPiece.y;
    while (!collides({ ...currentPiece, y: ghostY }, 0, 1)) {
        ghostY += 1;
    }
    return ghostY;
}

function drawCell(x, y, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x + 3, y + 3, BLOCK - 10, 6);
    ctx.restore();
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#111827");
    gradient.addColorStop(1, "#1f2937");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < canvas.width; x += 36) {
        ctx.fillRect(x, 0, 1, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 36) {
        ctx.fillRect(0, y, canvas.width, 1);
    }
}

function drawBoardFrame() {
    ctx.fillStyle = "rgba(7, 12, 22, 0.88)";
    ctx.fillRect(BOARD_X - 14, BOARD_Y - 14, COLS * BLOCK + 28, ROWS * BLOCK + 28);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 14, BOARD_Y - 14, COLS * BLOCK + 28, ROWS * BLOCK + 28);

    for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
            ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)";
            ctx.fillRect(BOARD_X + x * BLOCK, BOARD_Y + y * BLOCK, BLOCK - 1, BLOCK - 1);
        }
    }
}

function drawPlacedBlocks() {
    for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
            const type = board[y][x];
            if (type) {
                drawCell(BOARD_X + x * BLOCK + 1, BOARD_Y + y * BLOCK + 1, PIECES[type].color);
            }
        }
    }
}

function drawPiece(piece, alpha = 1) {
    const matrix = getMatrix(piece);
    matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (!cell) {
                return;
            }
            const boardY = piece.y + y;
            if (boardY < 0) {
                return;
            }
            drawCell(BOARD_X + (piece.x + x) * BLOCK + 1, BOARD_Y + boardY * BLOCK + 1, PIECES[piece.type].color, alpha);
        });
    });
}

function drawGhost() {
    if (!currentPiece) {
        return;
    }
    drawPiece({ ...currentPiece, y: getGhostY() }, 0.22);
}

function drawHudInsideCanvas() {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 26px Trebuchet MS, sans-serif";
    ctx.fillText("TETRIS TIME ATTACK", 420, 76);
    ctx.font = "14px Trebuchet MS, sans-serif";
    ctx.fillStyle = "rgba(248, 250, 252, 0.72)";
    ctx.fillText(`1분 안에 ${TARGET_LINES}줄 삭제`, 420, 104);

    const info = [
        ["SCORE", String(score)],
        ["LINES", `${lines}/${TARGET_LINES}`],
        ["LEVEL", String(level)],
        ["TIME", formatTime(remainingTimeMs)]
    ];

    info.forEach(([label, value], index) => {
        const top = 146 + index * 72;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(420, top, 210, 54);
        ctx.fillStyle = "rgba(248,250,252,0.72)";
        ctx.font = "bold 12px Trebuchet MS, sans-serif";
        ctx.fillText(label, 438, top + 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Trebuchet MS, sans-serif";
        ctx.fillText(value, 438, top + 44);
    });

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(660, 146, 170, 170);
    ctx.fillStyle = "rgba(248,250,252,0.72)";
    ctx.font = "bold 12px Trebuchet MS, sans-serif";
    ctx.fillText("NEXT", 678, 168);

    nextQueue.slice(0, 1).forEach((type) => {
        const matrix = PIECES[type].rotations[0];
        matrix.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (!cell) {
                    return;
                }
                drawCell(686 + x * 24, 194 + y * 24, PIECES[type].color);
            });
        });
    });
}

function draw() {
    drawBackground();
    drawBoardFrame();
    drawPlacedBlocks();
    if (currentPiece) {
        drawGhost();
        drawPiece(currentPiece);
    }
    drawHudInsideCanvas();
}

function update(delta) {
    if (gameEnded || !currentPiece) {
        return;
    }

    remainingTimeMs = Math.max(0, remainingTimeMs - delta);
    if (remainingTimeMs <= 0) {
        finishRound(lines >= TARGET_LINES, "시간이 종료되었습니다.");
        return;
    }

    dropAccumulator += delta;
    const interval = getDropInterval();
    while (dropAccumulator >= interval) {
        dropAccumulator -= interval;
        if (!collides(currentPiece, 0, 1)) {
            currentPiece.y += 1;
        } else {
            lockPiece();
            break;
        }
    }
}

function loop(timestamp) {
    const delta = lastTime ? timestamp - lastTime : 0;
    lastTime = timestamp;
    update(delta);
    draw();
    updateHud();
    animationFrameId = requestAnimationFrame(loop);
}

function isTypingTarget(target) {
    if (!target) {
        return false;
    }

    const tagName = target.tagName;
    return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function handleKeyDown(event) {
    if (event.isComposing || event.keyCode === 229 || isTypingTarget(event.target)) {
        return;
    }

    if (gameEnded && event.code !== "KeyR") {
        return;
    }

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === "ArrowLeft") {
        movePiece(-1);
    } else if (event.code === "ArrowRight") {
        movePiece(1);
    } else if (event.code === "ArrowDown") {
        softDrop();
    } else if (event.code === "ArrowUp") {
        rotatePiece(1);
    } else if (event.code === "Space") {
        hardDrop();
    } else if (event.code === "KeyR") {
        startGame();
    }
}

function loadComments() {
    try {
        const stored = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function saveComments(comments) {
    try {
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments.slice(0, 20)));
    } catch (error) {
    }
}

function formatCommentDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        return "방금";
    }
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function renderComments() {
    if (!commentListNode) {
        return;
    }

    const comments = loadComments();
    commentListNode.innerHTML = "";

    if (!comments.length) {
        const empty = document.createElement("p");
        empty.className = "comment-empty";
        empty.textContent = "아직 댓글이 없습니다. 첫 기록을 남겨보세요.";
        commentListNode.appendChild(empty);
        return;
    }

    comments.forEach((comment) => {
        const item = document.createElement("article");
        item.className = "comment-item";

        const meta = document.createElement("div");
        meta.className = "comment-meta";

        const author = document.createElement("strong");
        author.textContent = comment.nickname;

        const time = document.createElement("span");
        time.textContent = formatCommentDate(comment.createdAt);

        const body = document.createElement("p");
        body.className = "comment-body";
        body.textContent = comment.message;

        meta.append(author, time);
        item.append(meta, body);
        commentListNode.appendChild(item);
    });
}

async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!commentForm) {
        return;
    }

    const formData = new FormData(commentForm);
    const nickname = String(formData.get("nickname") || "").trim();
    const message = String(formData.get("comment") || "").trim();
    if (!nickname || !message) {
        commentStatusNode.textContent = "닉네임과 댓글을 입력해주세요.";
        commentStatusNode.className = "form-status is-error";
        return;
    }

    const entry = {
        nickname: nickname.slice(0, 24),
        message: message.slice(0, 400),
        createdAt: new Date().toISOString()
    };

    const comments = [entry, ...loadComments()].slice(0, 20);
    saveComments(comments);
    renderComments();

    commentForm.reset();
    commentStatusNode.textContent = "댓글이 바로 등록되었습니다.";
    commentStatusNode.className = "form-status is-success";
    commentSubmitButton.disabled = true;

    try {
        const submitData = new FormData();
        submitData.append("form_type", "comment");
        submitData.append("nickname", entry.nickname);
        submitData.append("comment", entry.message);
        submitData.append("page", window.location.href);

        await fetch(commentForm.action, {
            method: "POST",
            body: submitData,
            headers: {
                Accept: "application/json"
            }
        });
    } catch (error) {
    } finally {
        commentSubmitButton.disabled = false;
    }
}

function handleLeaderboardSubmit(event) {
    event.preventDefault();

    if (!leaderboardForm || roundSaved) {
        return;
    }

    const name = leaderboardNameInput.value.trim().slice(0, 18);
    if (!name) {
        leaderboardStatusNode.textContent = "닉네임을 입력해주세요.";
        leaderboardStatusNode.className = "form-status is-error";
        return;
    }

    const updated = sortLeaderboard([createLeaderboardEntry(name), ...loadLeaderboard()]);
    saveLeaderboard(updated);
    roundSaved = true;
    renderLeaderboard();
    leaderboardSummaryNode.textContent = "Top 5 기록에 등록되었습니다.";
    leaderboardStatusNode.textContent = "Top 5 기록에 등록되었습니다.";
    leaderboardStatusNode.className = "form-status is-success";
    setLeaderboardFormVisible(false);
}

async function handlePartnershipSubmit(event) {
    event.preventDefault();

    if (!partnershipForm) {
        return;
    }

    const formData = new FormData(partnershipForm);
    partnershipSubmitButton.disabled = true;
    formStatusNode.textContent = "문의 전송 중입니다...";
    formStatusNode.className = "form-status";

    try {
        const response = await fetch(partnershipForm.action, {
            method: "POST",
            body: formData,
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("request_failed");
        }

        partnershipForm.reset();
        formStatusNode.textContent = "문의가 접수되었습니다. 확인 후 회신드리겠습니다.";
        formStatusNode.className = "form-status is-success";
    } catch (error) {
        formStatusNode.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
        formStatusNode.className = "form-status is-error";
    } finally {
        partnershipSubmitButton.disabled = false;
    }
}

document.addEventListener("keydown", handleKeyDown);
restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
if (partnershipForm) {
    partnershipForm.addEventListener("submit", handlePartnershipSubmit);
}
if (commentForm) {
    commentForm.addEventListener("submit", handleCommentSubmit);
    renderComments();
}
if (leaderboardForm) {
    leaderboardForm.addEventListener("submit", handleLeaderboardSubmit);
}

bestScore = loadBestScore();
renderLeaderboard();
startGame();
