const GAME_TIME = 75;
const MATCH_DELAY_MS = 760;
const BEST_SCORE_KEY = "pikachu-match-best-score";

const CHARACTERS = [
    {
        id: "pikachu",
        name: "피카츄",
        type: "전기 타입 / 번개 에이스",
        badge: "⚡",
        gradient: ["#ffe25c", "#ffb43f"]
    },
    {
        id: "raichu",
        name: "라이츄",
        type: "전기 타입 / 스피드 파워",
        badge: "⚡",
        gradient: ["#ffbf59", "#ef7f33"]
    },
    {
        id: "charmander",
        name: "파이리",
        type: "불꽃 타입 / 스타터 화력",
        badge: "🔥",
        gradient: ["#ff9b59", "#ef5a3b"]
    },
    {
        id: "squirtle",
        name: "꼬부기",
        type: "물 타입 / 단단한 수비",
        badge: "💧",
        gradient: ["#82d3ff", "#3d8df5"]
    },
    {
        id: "butterfree",
        name: "버터플",
        type: "벌레/비행 타입 / 공중 제압",
        badge: "🦋",
        gradient: ["#bc92ff", "#7f67f3"]
    },
    {
        id: "slowbro",
        name: "야도란",
        type: "물/에스퍼 타입 / 느긋한 탱커",
        badge: "🌊",
        gradient: ["#ff92bf", "#8d6df1"]
    },
    {
        id: "pidgeot",
        name: "피존투",
        type: "비행 타입 / 하늘의 추격자",
        badge: "🪶",
        gradient: ["#d6b47f", "#8f6a48"]
    },
    {
        id: "koffing",
        name: "또가스",
        type: "독 타입 / 혼란 장인",
        badge: "☁️",
        gradient: ["#a88cff", "#6d56c9"]
    },
    {
        id: "snorlax",
        name: "잠만보",
        type: "노말 타입 / 묵직한 마무리",
        badge: "💤",
        gradient: ["#7ec9b6", "#386e72"]
    },
    {
        id: "bulbasaur",
        name: "이상해씨",
        type: "풀 타입 / 밸런스 스타터",
        badge: "🌿",
        gradient: ["#8ddb91", "#4a9f61"]
    }
];

const boardNode = document.getElementById("game-board");
const partyListNode = document.getElementById("party-list");
const spotlightBadgeNode = document.getElementById("spotlight-badge");
const spotlightNameNode = document.getElementById("spotlight-name");
const spotlightTypeNode = document.getElementById("spotlight-type");
const statusTextNode = document.getElementById("status-text");
const statusSubtextNode = document.getElementById("status-subtext");
const scoreNode = document.getElementById("score");
const bestScoreNode = document.getElementById("best-score");
const timeLeftNode = document.getElementById("time-left");
const comboNode = document.getElementById("combo");
const matchesNode = document.getElementById("matches");
const cardsLeftNode = document.getElementById("cards-left");
const restartButton = document.getElementById("restart-button");
const shuffleButton = document.getElementById("shuffle-button");
const overlayNode = document.getElementById("result-overlay");
const resultTitleNode = document.getElementById("result-title");
const resultMessageNode = document.getElementById("result-message");
const playAgainButton = document.getElementById("play-again-button");

let deck = [];
let flippedCards = [];
let matchedIds = new Set();
let score = 0;
let bestScore = 0;
let combo = 0;
let matches = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let lockBoard = false;
let gameActive = true;

function shuffle(array) {
    const copied = [...array];

    for (let index = copied.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
    }

    return copied;
}

function loadBestScore() {
    try {
        const storedValue = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
        return Number.isFinite(storedValue) ? storedValue : 0;
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

function createDeck() {
    return shuffle(
        CHARACTERS.flatMap((character) => [
            { ...character, cardId: `${character.id}-a` },
            { ...character, cardId: `${character.id}-b` }
        ])
    );
}

function renderPartyList() {
    partyListNode.innerHTML = "";

    CHARACTERS.forEach((character) => {
        const chip = document.createElement("span");
        chip.className = "party-chip";
        if (matchedIds.has(character.id)) {
            chip.classList.add("found");
        }
        chip.textContent = character.name;
        partyListNode.appendChild(chip);
    });
}

function setSpotlight(character) {
    spotlightBadgeNode.textContent = character.badge;
    spotlightBadgeNode.style.background = `linear-gradient(135deg, ${character.gradient[0]}, ${character.gradient[1]})`;
    spotlightNameNode.textContent = character.name;
    spotlightTypeNode.textContent = character.type;
}

function updateStats() {
    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
    }

    scoreNode.textContent = String(score);
    bestScoreNode.textContent = String(bestScore);
    timeLeftNode.textContent = String(timeLeft);
    comboNode.textContent = String(combo);
    matchesNode.textContent = `${matches} / ${CHARACTERS.length}`;
    cardsLeftNode.textContent = String(deck.length - matchedIds.size * 2);
}

function updateStatus(title, description) {
    statusTextNode.textContent = title;
    statusSubtextNode.textContent = description;
}

function buildCardElement(card) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.cardId = card.cardId;
    button.dataset.characterId = card.id;
    button.setAttribute("aria-label", `${card.name} 카드`);
    button.innerHTML = `
        <span class="card-face card-back"><span>${card.badge}</span></span>
        <span class="card-face card-front" style="background: linear-gradient(160deg, ${card.gradient[0]}, ${card.gradient[1]});">
            <span class="card-badge">${card.badge}</span>
            <strong>${card.name}</strong>
            <small>${card.type}</small>
        </span>
    `;
    button.addEventListener("click", () => handleCardClick(button, card));
    return button;
}

function renderBoard() {
    boardNode.innerHTML = "";
    deck.forEach((card) => {
        boardNode.appendChild(buildCardElement(card));
    });
}

function finishGame(title, message) {
    gameActive = false;
    lockBoard = true;
    window.clearInterval(timerId);
    overlayNode.classList.remove("hidden");
    resultTitleNode.textContent = title;
    resultMessageNode.textContent = message;
}

function handleMatch(firstCardButton, secondCardButton, character) {
    firstCardButton.classList.add("matched");
    secondCardButton.classList.add("matched");
    matchedIds.add(character.id);
    matches += 1;
    combo += 1;
    score += 120 + combo * 35;
    setSpotlight(character);
    renderPartyList();
    updateStats();

    if (matchedIds.size === CHARACTERS.length) {
        updateStatus("컬렉션 완성", `${CHARACTERS.length}종 캐릭터를 모두 찾았습니다.`);
        finishGame("컬렉션 완성", `최종 점수 ${score}점. 잠만보까지 전부 모았습니다.`);
    } else {
        updateStatus("매치 성공", `${character.name} 발견. 콤보 ${combo}단계 유지 중입니다.`);
    }
}

function handleMismatch(firstCardButton, secondCardButton) {
    combo = 0;
    score = Math.max(0, score - 20);
    updateStatus("다시 집중", "다른 카드였습니다. 패턴을 기억하고 다시 뒤집으세요.");
    updateStats();

    window.setTimeout(() => {
        firstCardButton.classList.remove("flipped");
        secondCardButton.classList.remove("flipped");
        flippedCards = [];
        lockBoard = false;
    }, MATCH_DELAY_MS);
}

function handleCardClick(button, card) {
    if (!gameActive || lockBoard || button.classList.contains("flipped") || button.classList.contains("matched")) {
        return;
    }

    button.classList.add("flipped");
    flippedCards.push({ button, card });
    setSpotlight(card);

    if (flippedCards.length < 2) {
        updateStatus("카드 확인 중", `${card.name} 카드가 열렸습니다.`);
        return;
    }

    lockBoard = true;
    const [firstPick, secondPick] = flippedCards;

    if (firstPick.card.id === secondPick.card.id) {
        window.setTimeout(() => {
            handleMatch(firstPick.button, secondPick.button, card);
            flippedCards = [];
            lockBoard = false;
        }, 220);
        return;
    }

    handleMismatch(firstPick.button, secondPick.button);
}

function tick() {
    timeLeft -= 1;
    updateStats();

    if (timeLeft <= 12 && timeLeft > 0) {
        updateStatus("마지막 스퍼트", `남은 시간 ${timeLeft}초. 빠르게 매치를 이어가세요.`);
    }

    if (timeLeft > 0) {
        return;
    }

    updateStatus("시간 종료", "제한 시간이 끝났습니다.");
    finishGame("시간 종료", `최종 점수 ${score}점. 다시 도전해서 컬렉션을 완성하세요.`);
}

function startTimer() {
    window.clearInterval(timerId);
    timerId = window.setInterval(tick, 1000);
}

function startGame({ reshuffleOnly = false } = {}) {
    deck = createDeck();
    flippedCards = [];
    matchedIds = new Set();
    score = reshuffleOnly ? Math.max(0, score - 40) : 0;
    combo = 0;
    matches = 0;
    timeLeft = GAME_TIME;
    lockBoard = false;
    gameActive = true;
    overlayNode.classList.add("hidden");
    updateStatus("준비 완료", "카드를 뒤집어 피카츄 컬렉션을 완성하세요.");
    setSpotlight(CHARACTERS[0]);
    renderBoard();
    renderPartyList();
    updateStats();
    startTimer();
}

restartButton.addEventListener("click", () => startGame());
shuffleButton.addEventListener("click", () => startGame({ reshuffleOnly: true }));
playAgainButton.addEventListener("click", () => startGame());

bestScore = loadBestScore();
startGame();
