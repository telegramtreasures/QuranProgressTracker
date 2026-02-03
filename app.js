/* ======================
   FILE: app.js
   PURPOSE: Main JavaScript logic for Quran Tracker
   FIXED: Bottom navigation, Bismillah display & Translation loading working 100%
====================== */

/* ======================
   STATE MANAGEMENT SECTION
====================== */
const state = {
  currentPage: "home",
  currentSurah: null,
  currentSurahData: null,
  translation: "en",
  translationsData: {},
  timer: {
    running: false,
    startTime: 0,
    elapsed: 0,
    interval: null
  },
  fontSize: 24,
  triviaIndex: 0,
  stats: {
    surahsRead: 0,
    timeSpent: 0,
    dayStreak: 0
  },
  preferences: {
    reduceMotion: false
  },
  lastVerseRefresh: null,
  dailyVerse: null,
  quranData: null
};

/* ======================
   CONSTANTS
====================== */
const TRANSLATIONS = {
  en: "English",
  ms: "Malay (Bahasa Melayu)",
  id: "Indonesian (Bahasa Indonesia)",
  ur: "Urdu (اردو)",
  tr: "Turkish (Türkçe)"
};

const TRANSLATION_FILES = {
  en: "translation-en.json",
  ms: "translation-ms.json",
  id: "translation-id.json",
  ur: "translation-ur.json",
  tr: "translation-tr.json"
};

/* ======================
   CACHE FUNCTIONS
====================== */
const CACHE_PREFIX = 'quran_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function saveToCache(key, data) {
  try {
    const cacheItem = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn(`Failed to save to cache:`, error);
  }
}

function loadFromCache(key) {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    
    const cacheItem = JSON.parse(cached);
    const now = Date.now();
    
    if (now - cacheItem.timestamp > CACHE_DURATION) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    return null;
  }
}

/* ======================
   TRIVIA FACTS
====================== */
const TRIVIA_FACTS = [
  "The Quran contains exactly 114 surahs (chapters).",
  "Surah Al-Fatihah is the first chapter and is recited in every rak'ah of prayer.",
  "The Quran was revealed over 23 years: 13 years in Mecca and 10 years in Medina.",
  "Bismillah appears at the beginning of every surah except Surah At-Tawbah.",
  "Surah Al-Baqarah is the longest surah with 286 verses.",
  "Surah Al-Kawthar is the shortest surah with only 3 verses.",
  "There are 30 juz (parts) in the Quran.",
  "The Quran mentions 25 prophets by name.",
  "Surah Yusuf is the only surah that narrates a complete story.",
  "The Quran has been preserved without any change since its revelation."
];

/* ======================
   TELEGRAM INTEGRATION
====================== */
const tg = window.Telegram?.WebApp;

function initTelegram() {
  if (!tg) return;
  
  tg.expand();
  const user = tg.initDataUnsafe?.user;
  
  if (user?.first_name) {
    const greetingElement = document.getElementById("greeting");
    if (greetingElement) {
      greetingElement.textContent = `Assalamu'alaikum, ${user.first_name}`;
    }
  }
}

/* ======================
   DATE & TIME
====================== */
function updateDateTime() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Assalamu'alaikum";
  
  if (hour >= 5 && hour < 12) greeting = "Good Morning";
  else if (hour >= 12 && hour < 18) greeting = "Good Afternoon";
  else if (hour >= 18 && hour < 22) greeting = "Good Evening";
  else greeting = "Good Night";
  
  const greetingElement = document.getElementById("greeting");
  if (greetingElement) {
    greetingElement.textContent = `Assalamu'alaikum (${greeting})`;
  }
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  const dateTimeStr = now.toLocaleDateString('en-US', options);
  const dateTimeElement = document.getElementById("date-time");
  if (dateTimeElement) {
    dateTimeElement.textContent = dateTimeStr;
  }
}

/* ======================
   MODAL FUNCTIONS
====================== */
function openModal() {
  const modal = document.getElementById("sadaqah-modal");
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById("sadaqah-modal");
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function initModal() {
  const modal = document.getElementById("sadaqah-modal");
  const sadaqahBtn = document.getElementById("sadaqah-btn");
  const supportBtn = document.getElementById("support-btn");
  const closeBtn = document.getElementById("close-modal");
  const copyBtn = document.getElementById("copy-link");
  const shareBtn = document.getElementById("share-app");
  
  if (sadaqahBtn) sadaqahBtn.addEventListener('click', openModal);
  if (supportBtn) supportBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const donationLink = 'https://buymeacoffee.com/shadowedscroll';
      navigator.clipboard.writeText(donationLink).then(() => {
        showStatusMessage('Donation link copied!', 'success');
      }).catch(() => {
        showStatusMessage('Failed to copy link', 'error');
      });
    });
  }
  
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: 'Quran Tracker',
        text: 'Track your daily Quran reading with this beautiful app!',
        url: window.location.href
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showStatusMessage('Shared successfully!', 'success');
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.log('Share failed:', err);
          }
        }
      } else {
        // Fallback: copy link
        navigator.clipboard.writeText(window.location.href).then(() => {
          showStatusMessage('Link copied to clipboard!', 'success');
        });
      }
    });
  }
}

/* ======================
   NAVIGATION - FIXED & SIMPLE
====================== */
function navigate(page) {
  console.log(`Navigating to: ${page}`);
  
  if (state.currentPage === page) return;
  state.currentPage = page;
  
  // Hide all pages
  document.querySelectorAll(".page").forEach(pageEl => {
    pageEl.classList.remove("active");
  });
  
  // Show target page
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add("active");
  }
  
  // Update nav buttons
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  
  // Page-specific actions
  if (page === 'read') {
    const surahSelect = document.getElementById("surah-select");
    if (surahSelect && surahSelect.options.length <= 1) {
      loadSurahList();
    }
    populateTranslationDropdown();
  }
  
  if (page === 'home') {
    updateStatsDisplay();
  }
}

/* ======================
   STATS FUNCTIONS
====================== */
function updateStatsDisplay() {
  const statValues = document.querySelectorAll('.stat-value');
  if (statValues.length >= 3) {
    statValues[0].textContent = state.stats.surahsRead;
    statValues[1].textContent = formatTime(state.stats.timeSpent);
    statValues[2].textContent = state.stats.dayStreak;
  }
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

/* ======================
   TRANSLATION DROPDOWN
====================== */
function populateTranslationDropdown() {
  const translationSelect = document.getElementById("translation-select");
  if (!translationSelect) return;
  
  translationSelect.innerHTML = '';
  
  Object.entries(TRANSLATIONS).forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    if (code === state.translation) option.selected = true;
    translationSelect.appendChild(option);
  });
}

/* ======================
   QURAN DATA LOADING
====================== */
async function loadQuranData() {
  try {
    const response = await fetch("quran.json");
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    state.quranData = await response.json();
    console.log("✅ Quran data loaded successfully");
    return state.quranData;
  } catch (error) {
    console.error("❌ Failed to load Quran data:", error);
    showStatusMessage("Failed to load quran.json", "error");
    throw error;
  }
}

/* ======================
   TRANSLATION LOADER - FIXED
====================== */
async function loadTranslation(lang = "en") {
  try {
    console.log(`📖 Loading translation: ${lang}`);
    
    const cacheKey = `translation_${lang}`;
    const cached = loadFromCache(cacheKey);
    
    if (cached) {
      state.translationsData[lang] = cached;
      console.log(`✅ Translation ${lang} loaded from cache`);
      return;
    }
    
    const fileName = TRANSLATION_FILES[lang];
    if (!fileName) {
      throw new Error(`Translation file for ${lang} not defined`);
    }
    
    const response = await fetch(fileName);
    if (!response.ok) {
      throw new Error(`Translation file ${fileName} not found (${response.status})`);
    }
    
    const translationData = await response.json();
    state.translationsData[lang] = translationData;
    saveToCache(cacheKey, translationData);
    
    console.log(`✅ Translation ${lang} loaded successfully`);
    
  } catch (error) {
    console.error(`❌ Translation load failed (${lang}):`, error);
    state.translationsData[lang] = null;
    
    if (state.currentPage === 'read' && state.currentSurah) {
      showStatusMessage(`Could not load ${TRANSLATIONS[lang]} translation. Falling back to English.`, "warning");
      if (lang !== "en" && state.translationsData["en"]) {
        state.translation = "en";
        const translationSelect = document.getElementById("translation-select");
        if (translationSelect) translationSelect.value = "en";
        setTimeout(() => loadSurah(state.currentSurah), 500);
      }
    }
  }
}

/* ======================
   LOAD SURAH LIST
====================== */
async function loadSurahList() {
  const surahSelect = document.getElementById("surah-select");
  if (!surahSelect) return;

  surahSelect.innerHTML = '<option value="" disabled selected>Choose a surah...</option>';

  if (!state.quranData) {
    await loadQuranData();
  }

  Object.keys(state.quranData).forEach((surahNumber) => {
    const option = document.createElement("option");
    option.value = surahNumber;
    
    const info = window.SURAH_INFO ? window.SURAH_INFO[Number(surahNumber)] : null;
    option.textContent = info && info.english
      ? `${surahNumber}. ${info.english}`
      : `Surah ${surahNumber}`;
    
    if (info && info.name) {
      option.title = info.name;
    }
    
    surahSelect.appendChild(option);
  });
}

/* ======================
   LOAD SURAH - FIXED WITH BISMILLAH & BETTER TRANSLATION
====================== */
async function loadSurah(surahNumber) {
  if (!surahNumber || surahNumber === "") {
    showStatusMessage("Please select a surah first", "warning");
    return;
  }
  
  const readerElement = document.getElementById("reader");
  const loadBtn = document.getElementById("load-btn");
  
  const originalBtnHTML = loadBtn?.innerHTML;
  if (loadBtn) {
    loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    loadBtn.disabled = true;
  }
  
  if (readerElement) {
    readerElement.innerHTML = `
      <div class="reader-placeholder">
        <div class="placeholder-icon">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h3>Loading Surah ${surahNumber}...</h3>
      </div>
    `;
  }
  
  try {
    // Load Quran data if not loaded
    if (!state.quranData) {
      console.log("Loading Quran data...");
      await loadQuranData();
    }
    
    // Load translation if not loaded
    if (!state.translationsData[state.translation]) {
      console.log(`Loading ${state.translation} translation...`);
      await loadTranslation(state.translation);
    }
    
    const surah = state.quranData[surahNumber];
    if (!surah) throw new Error(`Surah ${surahNumber} not found in quran.json`);
    
    if (!surah.ayahs) throw new Error(`Surah ${surahNumber} has no ayahs`);
    
    state.currentSurah = surahNumber;
    state.currentSurahData = surah;
    state.stats.surahsRead++;
    updateStatsDisplay();
    
    let versesHTML = "";
    
    // FIXED: Add Bismillah for all surahs except At-Tawbah (Surah 9)
    const surahNum = parseInt(surahNumber);
    if (surahNum !== 9) {
      // Use Bismillah from JSON if available, otherwise use default
      const bismillahText = surah.bismillah || "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
      versesHTML += `
        <div class="bismillah-starter">
          <div class="verse-ar bismillah-text">${bismillahText}</div>
          <div class="verse-tr">In the name of Allah, the Most Gracious, the Most Merciful</div>
        </div>
      `;
    }
    
    // Get translation data
    const translationData = state.translationsData[state.translation];
    
    // Debug log
    console.log(`Translation data available for ${state.translation}:`, !!translationData);
    if (translationData && translationData[surahNumber]) {
      console.log(`Surah ${surahNumber} translation available:`, !!translationData[surahNumber].ayahs);
    }
    
    // Build verses HTML
    Object.entries(surah.ayahs).forEach(([ayahNumber, arabicText]) => {
      let translationText = "Translation not available";
      
      // FIXED: Better translation access
      if (translationData) {
        const surahTranslation = translationData[surahNumber];
        if (surahTranslation && surahTranslation.ayahs) {
          const ayahTranslation = surahTranslation.ayahs[ayahNumber];
          if (ayahTranslation) {
            translationText = ayahTranslation;
          }
        }
      }
      
      versesHTML += `
        <div class="verse">
          <div class="verse-ar">
            ${arabicText}
            <span class="verse-number">${ayahNumber}</span>
          </div>
          <div class="verse-tr">${translationText}</div>
        </div>
      `;
    });
    
    const totalAyahs = Object.keys(surah.ayahs || {}).length;
    const info = window.SURAH_INFO ? window.SURAH_INFO[Number(surahNumber)] : null;
    let surahTitle = info && info.english
      ? `${info.english} (${info.name || ''})`
      : `Surah ${surahNumber}`;
    
    const translationName = TRANSLATIONS[state.translation] || 'English';
    
    const surahHeader = `
      <div class="surah-header">
        <h2>${surahTitle}</h2>
        <p>${totalAyahs} verses</p>
        <p><i class="fas fa-language"></i> Translation: ${translationName}</p>
      </div>
    `;
    
    if (readerElement) {
      readerElement.innerHTML = surahHeader + versesHTML;
      readerElement.scrollTop = 0;
    }
    
    showStatusMessage(`Surah ${surahNumber} loaded!`, "success");
    console.log(`✅ Surah ${surahNumber} loaded successfully`);
    
  } catch (error) {
    console.error("❌ Failed to load surah:", error);
    
    if (readerElement) {
      readerElement.innerHTML = `
        <div class="reader-placeholder">
          <div class="placeholder-icon" style="color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Failed to Load Surah ${surahNumber}</h3>
          <p>${error.message}</p>
          <button id="retry-btn" class="btn mt-2">
            <i class="fas fa-redo"></i> Retry Loading
          </button>
        </div>
      `;
      
      document.getElementById("retry-btn")?.addEventListener('click', () => {
        loadSurah(surahNumber);
      }, { once: true });
    }
    
    showStatusMessage(`Failed to load surah: ${error.message}`, "error");
    
  } finally {
    if (loadBtn) {
      loadBtn.innerHTML = originalBtnHTML;
      loadBtn.disabled = false;
    }
  }
}

/* ======================
   STATUS MESSAGES
====================== */
function showStatusMessage(message, type = "info") {
  const statusMessages = document.getElementById("status-messages");
  if (!statusMessages) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `status-message ${type}`;
  messageDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
    ${message}
  `;
  
  statusMessages.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.opacity = '0';
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 3000);
}

/* ======================
   TIMER FUNCTIONS
====================== */
function initTimer() {
  const timerBtn = document.getElementById("timer-btn");
  const resetBtn = document.getElementById("reset-btn");
  const timerDisplay = document.getElementById("timer-display");
  
  if (!timerBtn || !resetBtn || !timerDisplay) return;
  
  function formatTimerTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTimerTime(state.timer.elapsed);
  }
  
  timerBtn.addEventListener('click', () => {
    if (state.timer.running) {
      clearInterval(state.timer.interval);
      state.timer.running = false;
      timerBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
      timerBtn.classList.remove('secondary');
    } else {
      if (state.timer.elapsed === 0) {
        state.timer.startTime = Date.now();
      } else {
        state.timer.startTime = Date.now() - state.timer.elapsed * 1000;
      }
      
      state.timer.interval = setInterval(() => {
        state.timer.elapsed = Math.floor((Date.now() - state.timer.startTime) / 1000);
        updateTimerDisplay();
        state.stats.timeSpent = state.timer.elapsed;
        if (state.currentPage === 'home') updateStatsDisplay();
      }, 1000);
      
      state.timer.running = true;
      timerBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      timerBtn.classList.add('secondary');
    }
  });
  
  resetBtn.addEventListener('click', () => {
    clearInterval(state.timer.interval);
    state.timer.running = false;
    state.timer.elapsed = 0;
    state.timer.startTime = 0;
    updateTimerDisplay();
    timerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    timerBtn.classList.remove('secondary');
  });
  
  updateTimerDisplay();
}

/* ======================
   TRIVIA FUNCTIONS
====================== */
function initTrivia() {
  const triviaText = document.getElementById("trivia-text");
  const triviaBtn = document.getElementById("trivia-btn");
  
  if (!triviaText || !triviaBtn) return;
  
  state.triviaIndex = Math.floor(Math.random() * TRIVIA_FACTS.length);
  triviaText.textContent = TRIVIA_FACTS[state.triviaIndex];
  
  triviaBtn.addEventListener('click', () => {
    triviaBtn.disabled = true;
    
    triviaText.style.opacity = '0';
    triviaText.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * TRIVIA_FACTS.length);
      } while (newIndex === state.triviaIndex && TRIVIA_FACTS.length > 1);
      
      state.triviaIndex = newIndex;
      triviaText.textContent = TRIVIA_FACTS[state.triviaIndex];
      
      triviaText.style.opacity = '1';
      triviaText.style.transform = 'translateY(0)';
      
      triviaBtn.disabled = false;
    }, 300);
  });
}

/* ======================
   FONT SIZE CONTROL
====================== */
function initFontSizeControl() {
  const fontSizeSlider = document.getElementById("font-size");
  const fontSizeValue = document.getElementById("font-size-value");
  
  if (!fontSizeSlider || !fontSizeValue) return;
  
  fontSizeSlider.addEventListener('input', () => {
    state.fontSize = parseInt(fontSizeSlider.value);
    fontSizeValue.textContent = `${state.fontSize}px`;
    
    const verseArabic = document.querySelectorAll('.verse-ar');
    verseArabic.forEach(verse => {
      if (!verse.classList.contains('bismillah-text')) {
        verse.style.fontSize = `${state.fontSize}px`;
      }
    });
  });
  
  fontSizeValue.textContent = `${state.fontSize}px`;
  fontSizeSlider.value = state.fontSize;
}

/* ======================
   QUICK ACTIONS
====================== */
function initQuickActions() {
  // Quick action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const page = this.dataset.page;
      if (page) {
        navigate(page);
      }
      
      if (this.id === 'sadaqah-quick-btn') {
        openModal();
      }
    });
  });
  
  // Refresh verse button
  const refreshVerseBtn = document.getElementById('refresh-verse');
  if (refreshVerseBtn) {
    refreshVerseBtn.addEventListener('click', async () => {
      await fetchRandomVerse();
    });
  }
}

async function fetchRandomVerse() {
  try {
    const refreshBtn = document.getElementById('refresh-verse');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    refreshBtn.disabled = true;
    
    if (!state.quranData) {
      await loadQuranData();
      await loadTranslation(state.translation);
    }
    
    const surahNumbers = Object.keys(state.quranData);
    const randomSurahNum = surahNumbers[Math.floor(Math.random() * surahNumbers.length)];
    const randomSurah = state.quranData[randomSurahNum];
    
    if (!randomSurah || !randomSurah.ayahs) {
      throw new Error('No ayahs found');
    }
    
    const ayahNumbers = Object.keys(randomSurah.ayahs);
    const randomAyahNum = ayahNumbers[Math.floor(Math.random() * ayahNumbers.length)];
    const randomAyahText = randomSurah.ayahs[randomAyahNum];
    
    let translationText = "Translation not available";
    const translationData = state.translationsData[state.translation];
    
    if (translationData && translationData[randomSurahNum] && translationData[randomSurahNum].ayahs) {
      translationText = translationData[randomSurahNum].ayahs[randomAyahNum] || translationText;
    }
    
    const info = window.SURAH_INFO ? window.SURAH_INFO[Number(randomSurahNum)] : null;
    const surahName = info && info.english ? info.english : `Surah ${randomSurahNum}`;
    
    document.querySelector('.daily-verse-arabic').textContent = randomAyahText;
    document.querySelector('.daily-verse-translation').textContent = translationText;
    document.querySelector('.daily-verse-reference').textContent = `${surahName} (${randomSurahNum}:${randomAyahNum})`;
    
    showStatusMessage('New verse loaded!', 'success');
    
  } catch (error) {
    console.error('Error fetching verse:', error);
    showStatusMessage('Failed to load new verse', 'error');
  } finally {
    const refreshBtn = document.getElementById('refresh-verse');
    if (refreshBtn) {
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Another Verse';
      refreshBtn.disabled = false;
    }
  }
}

/* ======================
   EVENT BINDING - FIXED SIMPLE VERSION
====================== */
function bindEvents() {
  console.log("Binding events...");
  
  // 1. BOTTOM NAVIGATION - DIRECT EVENT LISTENERS
  const navButtons = document.querySelectorAll(".nav-btn");
  console.log(`Found ${navButtons.length} nav buttons`);
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const page = this.dataset.page;
      console.log(`Nav button clicked: ${page}`);
      navigate(page);
    });
  });
  
  // 2. LOAD SURAH BUTTON
  const loadBtn = document.getElementById("load-btn");
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const surahNumber = document.getElementById("surah-select").value;
      if (surahNumber) {
        loadSurah(surahNumber);
      } else {
        showStatusMessage("Please select a surah first", "warning");
      }
    });
  }
  
  // 3. TRANSLATION SELECT
  const translationSelect = document.getElementById("translation-select");
  if (translationSelect) {
    translationSelect.addEventListener('change', async () => {
      const newLang = translationSelect.value;
      state.translation = newLang;
      showStatusMessage(`Switching to ${TRANSLATIONS[newLang]}...`, "info");
      await loadTranslation(newLang);
      if (state.currentSurah) {
        setTimeout(() => loadSurah(state.currentSurah), 300);
      }
    });
  }
  
  console.log("Events bound successfully");
}

/* ======================
   HIDE LOADING SCREEN
====================== */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

/* ======================
   INITIALIZATION - FIXED
====================== */
async function initializeApp() {
  console.log("🕌 Quran Tracker initializing...");
  
  try {
    // Initialize all components
    initTelegram();
    initModal();
    initTimer();
    initTrivia();
    initFontSizeControl();
    initQuickActions();
    
    // Bind events FIRST
    bindEvents();
    
    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // Load data (async, non-blocking)
    setTimeout(async () => {
      try {
        await loadQuranData();
        await loadTranslation("en");
        await loadSurahList();
        populateTranslationDropdown();
        console.log("✅ Data loaded successfully");
      } catch (error) {
        console.warn("⚠️ Data loading warning:", error);
      }
    }, 500);
    
    // Hide loading screen
    setTimeout(() => {
      hideLoadingScreen();
      console.log("✅ App fully initialized");
    }, 1500);
    
  } catch (error) {
    console.error("❌ Initialization error:", error);
    hideLoadingScreen();
  }
}

/* ======================
   START THE APP
====================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for debugging
window.navigate = navigate;
window.state = state;
window.debug = function() {
  console.log("Current page:", state.currentPage);
  console.log("Nav buttons:", document.querySelectorAll('.nav-btn').length);
  console.log("Active page:", document.querySelector('.page.active')?.id);
  console.log("Translation loaded:", state.translation, !!state.translationsData[state.translation]);
};
