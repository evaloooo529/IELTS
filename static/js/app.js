(function () {
  "use strict";

  const STORAGE_KEY = "ielts_vocab_progress";
  const SWIPE_THRESHOLD = 80;
  const BASE_URL = new URL("./", document.baseURI);

  function assetUrl(path) {
    return new URL(path, BASE_URL).href;
  }

  let allWords = [];
  let queue = [];
  let currentIndex = 0;
  let showingMeaning = false;

  // Swipe state
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;
  let isSwipeGesture = false;

  // DOM
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const wordCard = $("#wordCard");
  const cardFront = $("#cardFront");
  const cardBack = $("#cardBack");
  const wordText = $("#wordText");
  const wordTextBack = $("#wordTextBack");
  const ukPhonetic = $("#ukPhonetic");
  const meaningText = $("#meaningText");
  const progressInfo = $("#progressInfo");
  const emptyState = $("#emptyState");
  const cardContainer = $("#cardContainer");
  const actionButtons = $(".action-buttons");
  const swipeHints = $(".swipe-hints");

  // Progress storage
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        remembered: [],
        forgotten: [],
        currentQueue: [],
        currentIndex: 0,
      };
    } catch {
      return { remembered: [], forgotten: [], currentQueue: [], currentIndex: 0 };
    }
  }

  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getProgress() {
    return loadProgress();
  }

  // Init
  async function init() {
    registerServiceWorker();

    const res = await fetch(assetUrl("data/words.json"));
    allWords = await res.json();
    restoreSession();
    bindEvents();
    showCurrentWord();
    updateBadges();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(assetUrl("sw.js")).catch(() => {});
    }
  }

  function restoreSession() {
    const progress = getProgress();
    if (progress.currentQueue.length > 0) {
      queue = progress.currentQueue
        .map((id) => allWords.find((w) => w.id === id))
        .filter(Boolean);
      currentIndex = Math.min(progress.currentIndex || 0, Math.max(queue.length - 1, 0));
    } else {
      startNewSession();
    }

    if (queue.length === 0) {
      const doneCount = progress.remembered.length + progress.forgotten.length;
      if (doneCount < allWords.length) {
        startNewSession();
      }
    }
  }

  function startNewSession() {
    const progress = getProgress();
    const doneIds = new Set([
      ...progress.remembered.map((w) => w.id),
      ...progress.forgotten.map((w) => w.id),
    ]);
    queue = allWords.filter((w) => !doneIds.has(w.id));
    shuffleArray(queue);
    currentIndex = 0;
    saveSession();
  }

  function saveSession() {
    const progress = getProgress();
    progress.currentQueue = queue.map((w) => w.id);
    progress.currentIndex = currentIndex;
    saveProgress(progress);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Display
  function showCurrentWord() {
    showingMeaning = false;
    cardFront.classList.remove("hidden");
    cardBack.classList.add("hidden");

    if (currentIndex >= queue.length) {
      showEmptyState();
      return;
    }

    hideEmptyState();
    const word = queue[currentIndex];
    wordText.textContent = word.word;
    wordTextBack.textContent = word.word;
    ukPhonetic.textContent = word.uk_phonetic || "";
    meaningText.textContent = word.meaning || "暂无释义";

    const total = queue.length;
    const current = currentIndex + 1;
    progressInfo.textContent = `${current} / ${total}`;

    wordCard.classList.remove("exit-left", "exit-right");
    wordCard.classList.add("enter");
    setTimeout(() => wordCard.classList.remove("enter"), 350);
  }

  function showEmptyState() {
    emptyState.classList.remove("hidden");
    cardContainer.classList.add("hidden");
    actionButtons.classList.add("hidden");
    swipeHints.classList.add("hidden");
    progressInfo.textContent = "完成";
  }

  function hideEmptyState() {
    emptyState.classList.add("hidden");
    cardContainer.classList.remove("hidden");
    actionButtons.classList.remove("hidden");
    swipeHints.classList.remove("hidden");
  }

  function showMeaning() {
    if (currentIndex >= queue.length || showingMeaning) return;
    showingMeaning = true;
    cardFront.classList.add("hidden");
    cardBack.classList.remove("hidden");
  }

  // Actions
  function markRemembered() {
    if (currentIndex >= queue.length) return;
    const word = queue[currentIndex];
    const progress = getProgress();
    progress.remembered = progress.remembered.filter((w) => w.id !== word.id);
    progress.remembered.unshift(word);
    progress.forgotten = progress.forgotten.filter((w) => w.id !== word.id);
    saveProgress(progress);
    animateAndNext("exit-left");
  }

  function markForgotten() {
    if (currentIndex >= queue.length) return;
    const word = queue[currentIndex];
    const progress = getProgress();
    progress.forgotten = progress.forgotten.filter((w) => w.id !== word.id);
    progress.forgotten.unshift(word);
    progress.remembered = progress.remembered.filter((w) => w.id !== word.id);
    saveProgress(progress);
    animateAndNext("exit-right");
  }

  function animateAndNext(exitClass) {
    wordCard.classList.add(exitClass);
    setTimeout(() => {
      currentIndex++;
      saveSession();
      updateBadges();
      showCurrentWord();
    }, 350);
  }

  // TTS
  function speakWord() {
    if (currentIndex >= queue.length) return;
    const word = queue[currentIndex];
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(
      (v) => v.lang.startsWith("en-GB") || v.name.includes("British")
    );
    if (gbVoice) utterance.voice = gbVoice;

    window.speechSynthesis.speak(utterance);
  }

  // Swipe / tap handling (Pointer Events — avoids mobile touch+mouse double fire)
  const TAP_MOVE_LIMIT = 18;

  function getSwipeDelta(endX, endY) {
    return {
      deltaX: endX - startX,
      deltaY: endY - startY,
    };
  }

  function resetCardTransform() {
    wordCard.style.transition = "";
    wordCard.style.transform = "";
    wordCard.classList.remove("swiping-left", "swiping-right");
  }

  function onPointerDown(e) {
    if (currentIndex >= queue.length) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isDragging = true;
    isSwipeGesture = false;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    wordCard.style.transition = "none";
    wordCard.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    currentX = e.clientX;
    const { deltaX, deltaY } = getSwipeDelta(e.clientX, e.clientY);

    if (!isSwipeGesture && Math.abs(deltaX) > TAP_MOVE_LIMIT && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwipeGesture = true;
    }

    if (isSwipeGesture) {
      e.preventDefault();
      const rotate = deltaX * 0.08;
      wordCard.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;

      wordCard.classList.remove("swiping-left", "swiping-right");
      if (deltaX < -20) {
        wordCard.classList.add("swiping-left");
        wordCard.style.setProperty("--swipe-opacity", Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1));
      } else if (deltaX > 20) {
        wordCard.classList.add("swiping-right");
        wordCard.style.setProperty("--swipe-opacity", Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1));
      }
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    if (wordCard.hasPointerCapture(e.pointerId)) {
      wordCard.releasePointerCapture(e.pointerId);
    }

    const { deltaX, deltaY } = getSwipeDelta(e.clientX, e.clientY);
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    resetCardTransform();
    isSwipeGesture = false;

    if (absX >= SWIPE_THRESHOLD && absX > absY) {
      if (deltaX < 0) markRemembered();
      else markForgotten();
    } else if (absX <= TAP_MOVE_LIMIT && absY <= TAP_MOVE_LIMIT) {
      showMeaning();
    }
  }

  function onPointerCancel() {
    if (!isDragging) return;
    isDragging = false;
    isSwipeGesture = false;
    resetCardTransform();
  }

  // List views
  function renderWordList(containerId, words, emptyId) {
    const container = $(containerId);
    const empty = $(emptyId);
    container.innerHTML = "";

    if (words.length === 0) {
      empty.classList.remove("hidden");
      container.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    container.classList.remove("hidden");

    words.forEach((w) => {
      const item = document.createElement("div");
      item.className = "word-item";
      item.innerHTML = `
        <div class="word-item-header">
          <span class="word-item-word">${escapeHtml(w.word)}</span>
        </div>
        <div class="word-item-phonetic">${escapeHtml(w.uk_phonetic || "")}</div>
        <div class="word-item-meaning">${escapeHtml(w.meaning || "")}</div>
      `;
      container.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function updateBadges() {
    const progress = getProgress();
    $("#rememberedBadge").textContent = progress.remembered.length;
    $("#forgottenBadge").textContent = progress.forgotten.length;
    $("#rememberedCount").textContent = `${progress.remembered.length} 个单词`;
    $("#forgottenCount").textContent = `${progress.forgotten.length} 个单词`;
    renderWordList("#rememberedList", progress.remembered, "#rememberedEmpty");
    renderWordList("#forgottenList", progress.forgotten, "#forgottenEmpty");
  }

  // Navigation
  function switchView(viewName) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    $$(".nav-btn").forEach((b) => b.classList.remove("active"));

    const titles = {
      study: "IELTS 背单词",
      remembered: "已记住的单词",
      forgotten: "未记住的单词",
    };

    $(`#${viewName}View`).classList.add("active");
    $(`.nav-btn[data-view="${viewName}"]`).classList.add("active");
    $("#pageTitle").textContent = titles[viewName];

    if (viewName !== "study") {
      updateBadges();
    }
  }

  // Events
  function bindEvents() {
    // Nav
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    // Action buttons
    $("#btnRemember").addEventListener("click", (e) => {
      e.stopPropagation();
      markRemembered();
    });
    $("#btnForgot").addEventListener("click", (e) => {
      e.stopPropagation();
      markForgotten();
    });

    $("#speakBtn").addEventListener("pointerdown", (e) => e.stopPropagation());
    $("#speakBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      speakWord();
    });

    // Restart
    $("#btnRestart").addEventListener("click", () => {
      startNewSession();
      showCurrentWord();
    });

    // Clear lists
    $("#btnClearRemembered").addEventListener("click", () => {
      if (confirm("确定清空所有已记住的单词？")) {
        const progress = getProgress();
        progress.remembered = [];
        saveProgress(progress);
        updateBadges();
      }
    });
    $("#btnClearForgotten").addEventListener("click", () => {
      if (confirm("确定清空所有未记住的单词？")) {
        const progress = getProgress();
        progress.forgotten = [];
        saveProgress(progress);
        updateBadges();
      }
    });

    // Swipe / tap on card
    wordCard.addEventListener("pointerdown", onPointerDown);
    wordCard.addEventListener("pointermove", onPointerMove);
    wordCard.addEventListener("pointerup", onPointerUp);
    wordCard.addEventListener("pointercancel", onPointerCancel);

    // Preload TTS voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }

  init();
})();
