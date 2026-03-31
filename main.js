const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const LINES_PER_LEVEL = 10;
const DROP_SPEEDS = [800, 720, 630, 550, 470, 380, 300, 220, 160, 110];
const LINE_SCORES = [0, 100, 300, 500, 800];

const boardCanvas = document.getElementById("board");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next-piece");
const nextCtx = nextCanvas.getContext("2d");

const scoreNode = document.getElementById("score");
const linesNode = document.getElementById("lines");
const levelNode = document.getElementById("level");
const messageNode = document.getElementById("message");
const restartButton = document.getElementById("restart");
const pauseButton = document.getElementById("pause");
const mobileControls = document.querySelector(".mobile-controls");

const COLORS = {
    I: "#59f0ff",
    J: "#4d7cff",
    L: "#ff9f68",
    O: "#ffd166",
    S: "#7ae582",
    T: "#d983ff",
    Z: "#ff5d73"
};

const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

let board;
let activePiece;
let nextPiece;
let score;
let linesCleared;
let level;
let lastTime;
let dropAccumulator;
let animationFrameId;
let isPaused;
let isGameOver;

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
    return matrix.map((row) => [...row]);
}

function randomPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        type,
        color: COLORS[type],
        matrix: cloneMatrix(SHAPES[type]),
        x: Math.floor((COLS - SHAPES[type][0].length) / 2),
        y: -1
    };
}

function resetGame() {
    board = createBoard();
    score = 0;
    linesCleared = 0;
    level = 1;
    isPaused = false;
    isGameOver = false;
    dropAccumulator = 0;
    lastTime = 0;
    nextPiece = randomPiece();
    spawnPiece();
    updateStats();
    hideMessage();
    pauseButton.textContent = "Pause";
    cancelAnimationFrame(animationFrameId);
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnPiece() {
    activePiece = nextPiece;
    activePiece.x = Math.floor((COLS - activePiece.matrix[0].length) / 2);
    activePiece.y = -getVisibleTopOffset(activePiece.matrix);
    nextPiece = randomPiece();

    if (collides(activePiece)) {
        endGame();
    }
}

function getVisibleTopOffset(matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
        if (matrix[y].some(Boolean)) {
            return y;
        }
    }
    return 0;
}

function collides(piece, offsetX = 0, offsetY = 0, testMatrix = piece.matrix) {
    for (let y = 0; y < testMatrix.length; y += 1) {
        for (let x = 0; x < testMatrix[y].length; x += 1) {
            if (!testMatrix[y][x]) {
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
    activePiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (!value) {
                return;
            }

            const boardY = activePiece.y + y;
            const boardX = activePiece.x + x;

            if (boardY >= 0) {
                board[boardY][boardX] = activePiece.color;
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
        return;
    }

    linesCleared += cleared;
    score += LINE_SCORES[cleared] * level;
    level = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
    updateStats();
}

function updateStats() {
    scoreNode.textContent = score.toString();
    linesNode.textContent = linesCleared.toString();
    levelNode.textContent = level.toString();
}

function rotate(matrix) {
    return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function tryRotate() {
    if (isPaused || isGameOver) {
        return;
    }

    const rotated = rotate(activePiece.matrix);
    const kicks = [0, -1, 1, -2, 2];

    for (const kick of kicks) {
        if (!collides(activePiece, kick, 0, rotated)) {
            activePiece.matrix = rotated;
            activePiece.x += kick;
            draw();
            return;
        }
    }
}

function movePiece(direction) {
    if (isPaused || isGameOver) {
        return;
    }

    if (!collides(activePiece, direction, 0)) {
        activePiece.x += direction;
        draw();
    }
}

function softDrop() {
    if (isPaused || isGameOver) {
        return;
    }

    if (!collides(activePiece, 0, 1)) {
        activePiece.y += 1;
        score += 1;
        updateStats();
        draw();
        return;
    }

    lockPiece();
}

function hardDrop() {
    if (isPaused || isGameOver) {
        return;
    }

    let distance = 0;
    while (!collides(activePiece, 0, distance + 1)) {
        distance += 1;
    }

    activePiece.y += distance;
    score += distance * 2;
    updateStats();
    lockPiece();
}

function lockPiece() {
    mergePiece();
    clearLines();
    spawnPiece();
    draw();
}

function getDropDelay() {
    return DROP_SPEEDS[Math.min(level - 1, DROP_SPEEDS.length - 1)];
}

function gameLoop(timestamp = 0) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (!isPaused && !isGameOver) {
        dropAccumulator += delta;
        if (dropAccumulator >= getDropDelay()) {
            dropAccumulator = 0;
            if (!collides(activePiece, 0, 1)) {
                activePiece.y += 1;
            } else {
                lockPiece();
            }
            draw();
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
    isGameOver = true;
    showMessage("Game Over");
}

function togglePause() {
    if (isGameOver) {
        return;
    }

    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    if (isPaused) {
        showMessage("Paused");
    } else {
        hideMessage();
    }
}

function showMessage(text) {
    messageNode.textContent = text;
    messageNode.classList.remove("hidden");
}

function hideMessage() {
    messageNode.classList.add("hidden");
}

function drawCell(ctx, x, y, color, size) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawBoard() {
    boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    board.forEach((row, y) => {
        row.forEach((color, x) => {
            if (color) {
                drawCell(boardCtx, x, y, color, BLOCK_SIZE);
            }
        });
    });
}

function drawPiece(ctx, piece, size, offsetX = 0, offsetY = 0) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (!value) {
                return;
            }
            const drawY = piece.y + y + offsetY;
            if (drawY < 0) {
                return;
            }
            drawCell(ctx, piece.x + x + offsetX, drawY, piece.color, size);
        });
    });
}

function drawGhost() {
    let ghostY = activePiece.y;
    while (!collides({ ...activePiece, y: ghostY }, 0, 1)) {
        ghostY += 1;
    }

    const ghost = { ...activePiece, y: ghostY };
    boardCtx.globalAlpha = 0.25;
    drawPiece(boardCtx, ghost, BLOCK_SIZE);
    boardCtx.globalAlpha = 1;
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const size = 24;
    const matrixWidth = nextPiece.matrix[0].length;
    const matrixHeight = nextPiece.matrix.length;
    const offsetX = Math.floor((nextCanvas.width / size - matrixWidth) / 2);
    const offsetY = Math.floor((nextCanvas.height / size - matrixHeight) / 2);
    drawPiece(nextCtx, { ...nextPiece, x: 0, y: 0 }, size, offsetX, offsetY);
}

function draw() {
    drawBoard();
    if (!isGameOver) {
        drawGhost();
        drawPiece(boardCtx, activePiece, BLOCK_SIZE);
    }
    drawNextPiece();
}

document.addEventListener("keydown", (event) => {
    if (event.repeat && event.code !== "ArrowDown") {
        return;
    }

    switch (event.code) {
        case "ArrowLeft":
            movePiece(-1);
            break;
        case "ArrowRight":
            movePiece(1);
            break;
        case "ArrowDown":
            softDrop();
            break;
        case "ArrowUp":
        case "KeyX":
            tryRotate();
            break;
        case "Space":
            event.preventDefault();
            hardDrop();
            break;
        case "KeyP":
            togglePause();
            break;
        default:
            break;
    }
});

restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", togglePause);

mobileControls.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    const { action } = button.dataset;
    if (action === "left") {
        movePiece(-1);
    } else if (action === "right") {
        movePiece(1);
    } else if (action === "rotate") {
        tryRotate();
    } else if (action === "down") {
        softDrop();
    } else if (action === "drop") {
        hardDrop();
    }
});

resetGame();
