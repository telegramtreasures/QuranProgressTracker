/* ======================
   FILE: app.js
   PURPOSE: Main JavaScript logic for Quran Tracker
====================== */

/* ======================
   STATE MANAGEMENT SECTION
====================== */
const state = {
  currentPage: "home",
  currentSurah: null,
  currentSurahData: null,
  translation: "en",
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
  quranData: null,
  translations: {
    en: null,
    ms: null,
    id: null,
    ur: null,
    tr: null
  }
};

/* ======================
   CONSTANTS
====================== */
const TRANSLATIONS = {
  en: "English",
  ms: "Malay",
  id: "Indonesian",
  ur: "Urdu",
  tr: "Turkish"
};

const TRIVIA_FACTS = [
  "The Quran contains exactly 114 surahs (chapters).",
  "Surah Al-Fatihah is the first chapter and is recited in every rak'ah of prayer.",
  "The Quran was revealed over 23 years: 13 years in Mecca and 10 years in Medina.",
  "Bismillah (بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ) appears at the beginning of every surah except Surah At-Tawbah.",
  "Surah Al-Baqarah is the longest surah with 286 verses.",
  "Surah Al-Kawthar is the shortest surah with only 3 verses.",
  "There are 30 juz (parts) in the Quran, allowing it to be completed in one month during Ramadan.",
  "The Quran mentions 25 prophets by name, starting with Adam and ending with Muhammad (peace be upon them all).",
  "Surah Yusuf is the only surah that narrates a complete story from beginning to end.",
  "The Quran has been preserved without change since its revelation over 1400 years ago.",
  "Surah Al-Ikhlas (Chapter 112) is considered equal to one-third of the Quran in reward.",
  "The first revelation was Surah Al-Alaq (96:1-5) which begins with 'Read in the name of your Lord'.",
  "Surah Ar-Rahman repeatedly asks 'Then which of the favors of your Lord will you deny?' - 31 times.",
  "The Quran contains scientific facts that were unknown at the time of revelation, such as embryonic development.",
  "Surah Ya-Sin is known as the 'Heart of the Quran'."
];

// Bismillah constants
const BISMILLAH_UI = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
const BISMILLAH_TRANSLATION = "In the name of Allah, the Most Gracious, the Most Merciful";

/* ======================
   TELEGRAM INTEGRATION SECTION
====================== */
const tg = window.Telegram?.WebApp;

function initTelegram() {
  if (!tg) {
    console.log("Telegram Web App not detected, running in standalone mode");
    return;
  }
  
  tg.expand();
  tg.enableClosingConfirmation();
  
  const user = tg.initDataUnsafe?.user;
  if (!user) return;
  
  const greetingElement = document.getElementById("greeting");
  if (user.first_name) {
    greetingElement.textContent = `Assalamu'alaikum, ${user.first_name}`;
  }
  
  if (user.photo_url) {
    const img = document.getElementById("tg-avatar");
    img.src = user.photo_url;
    img.classList.remove("hidden");
    document.getElementById("avatar-fallback").classList.add("hidden");
  }
}

/* ======================
   DATE & TIME FUNCTIONS SECTION
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
  if (greetingElement.textContent.includes("Assalamu'alaikum") && !tg?.initDataUnsafe?.user?.first_name) {
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
  
  dateTimeElement.style.transition = 'opacity 0.3s ease';
  dateTimeElement.style.opacity = '0';
  
  setTimeout(() => {
    dateTimeElement.textContent = dateTimeStr;
    dateTimeElement.style.opacity = '1';
  }, 200);
}

/* ======================
   MODAL FUNCTIONS SECTION
====================== */
function initModal() {
  const modal = document.getElementById("sadaqah-modal");
  const sadaqahBtn = document.getElementById("sadaqah-btn");
  const supportBtn = document.getElementById("support-btn");
  const closeBtn = document.getElementById("close-modal");
  const copyBtn = document.getElementById("copy-link");
  const shareBtn = document.getElementById("share-app");
  const copyMessage = document.getElementById("copy-message");
  
  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  
  if (sadaqahBtn) sadaqahBtn.addEventListener('click', openModal);
  if (supportBtn) supportBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const donationLink = 'https://buymeacoffee.com/shadowedscroll';
      
      navigator.clipboard.writeText(donationLink).then(() => {
        copyMessage.textContent = 'Donation link copied to clipboard!';
        copyMessage.className = 'copy-message success';
        copyMessage.style.opacity = '1';
        
        setTimeout(() => {
          copyMessage.style.opacity = '0';
          setTimeout(() => {
            copyMessage.className = 'copy-message';
            copyMessage.textContent = '';
          }, 300);
        }, 3000);
        
      }).catch((err) => {
        console.error('Failed to copy:', err);
        copyMessage.textContent = 'Failed to copy link. Please try again.';
        copyMessage.className = 'copy-message error';
        copyMessage.style.opacity = '1';
        
        setTimeout(() => {
          copyMessage.style.opacity = '0';
        }, 3000);
      });
    });
  }
  
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'Quran Tracker App',
          text: 'Check out this amazing Quran progress tracking app!',
          url: window.location.href
        }).then(() => {
          console.log('Thanks for sharing!');
        }).catch(err => {
          console.log('Error sharing:', err);
        });
      } else {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out Quran Tracker App!')}`;
        window.open(shareUrl, '_blank');
      }
    });
  }
}

/* ======================
   PAGE NAVIGATION SECTION
====================== */
function navigate(page) {
  if (state.currentPage === page) return;
  
  state.currentPage = page;
  renderPage();
  
  if (page === 'read') {
    const surahSelect = document.getElementById("surah-select");
    if (surahSelect && surahSelect.options.length <= 1) {
      loadSurahList();
    }
  }
}

function renderPage() {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });
  
  const currentPage = document.getElementById(`page-${state.currentPage}`);
  if (currentPage) {
    currentPage.classList.add("active");
    
    setTimeout(() => {
      const cards = currentPage.querySelectorAll('.card');
      cards.forEach((card, index) => {
        if (!card.classList.contains('slide-in')) {
          card.style.animationDelay = `${index * 0.1}s`;
          card.classList.add('slide-in');
        }
      });
    }, 50);
  }
  
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const isActive = btn.dataset.page === state.currentPage;
    btn.classList.toggle("active", isActive);
    
    const icon = btn.querySelector('i');
    if (icon) {
      if (isActive) {
        icon.style.transform = 'translateY(-3px)';
      } else {
        icon.style.transform = 'translateY(0)';
      }
    }
  });
  
  if (state.currentPage === 'home') {
    updateStatsDisplay();
  }
}

/* ======================
   STATS FUNCTIONS SECTION
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
   QURAN DATA LOADING (WITH YOUR STRUCTURE)
====================== */
async function loadQuranData() {
  try {
    console.log("📖 Loading Quran data from local JSON...");
    
    const response = await fetch('quran.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    state.quranData = await response.json();
    console.log(`✅ Quran data loaded successfully: ${Object.keys(state.quranData).length} surahs`);
    
    return state.quranData;
    
  } catch (error) {
    console.error("❌ Failed to load Quran data:", error);
    showStatusMessage("Failed to load Quran data. Please refresh the page.", "error");
    
    // Fallback to Surah 1 only
    state.quranData = {
      "1": {
        "ayahs": {
          "1": "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
          "2": "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
          "3": "مَـٰلِكِ يَوْمِ ٱلدِّينِ",
          "4": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
          "5": "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
          "6": "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ"
        },
        "bismillah": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
      }
    };
    
    return state.quranData;
  }
}

/* ======================
   TRANSLATION DATA LOADING (WITH YOUR STRUCTURE)
====================== */
async function loadTranslation(lang) {
  try {
    // If translation already loaded, return it
    if (state.translations[lang]) {
      return state.translations[lang];
    }
    
    console.log(`📖 Loading ${lang} translation...`);
    const response = await fetch(`translation-${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang} translation`);
    }
    
    state.translations[lang] = await response.json();
    console.log(`✅ ${lang} translation loaded successfully`);
    return state.translations[lang];
    
  } catch (error) {
    console.error(`❌ Failed to load ${lang} translation:`, error);
    return null;
  }
}

/* ======================
   HELPER FUNCTIONS FOR YOUR DATA STRUCTURE
====================== */
function getSurahInfo(surahNumber) {
  // DEBUG: Check what's in SURAH_INFO
  console.log("DEBUG getSurahInfo called for:", surahNumber);
  console.log("DEBUG window.SURAH_INFO:", window.SURAH_INFO);
  
  // Try to get from window.SURAH_INFO first
  let surahInfo = null;
  
  if (window.SURAH_INFO && window.SURAH_INFO[surahNumber]) {
    surahInfo = window.SURAH_INFO[surahNumber];
    console.log("DEBUG Found in SURAH_INFO:", surahInfo);
  }
  
  // Fallback translations and revelations
  const fallbackTranslations = {
    1: "The Opening",
    2: "The Cow", 
    3: "Family of Imran",
    4: "The Women",
    5: "The Table Spread",
    6: "The Cattle",
    7: "The Heights",
    8: "The Spoils of War",
    9: "The Repentance",
    10: "Jonah"
  };
  
  const fallbackRevelations = {
    1: "Meccan",
    2: "Medinan",
    3: "Medinan",
    4: "Medinan", 
    5: "Medinan",
    6: "Meccan",
    7: "Meccan",
    8: "Medinan",
    9: "Medinan",
    10: "Meccan"
  };
  
  // Get name and english from SURAH_INFO or use fallback
  const name = surahInfo ? surahInfo.name : `سورة ${surahNumber}`;
  const english = surahInfo ? surahInfo.english : `Surah ${surahNumber}`;
  
  // Get translation and revelation (check surahInfo first, then fallback)
  let translation = "";
  let revelation = "";
  
  if (surahInfo && surahInfo.translation) {
    translation = surahInfo.translation;
  } else {
    translation = fallbackTranslations[surahNumber] || "Unknown Surah";
  }
  
  if (surahInfo && surahInfo.revelation) {
    revelation = surahInfo.revelation;
  } else {
    revelation = fallbackRevelations[surahNumber] || "Unknown";
  }
  
  // Get ayah count from quran data
  const ayahCount = state.quranData && state.quranData[surahNumber] 
    ? Object.keys(state.quranData[surahNumber].ayahs).length 
    : 0;
  
  console.log("DEBUG Returning:", { name, english, translation, revelation, ayahs: ayahCount });
  
  return {
    name: name,
    english: english,
    translation: translation,
    revelation: revelation,
    ayahs: ayahCount
  };
}

function getVerseTranslation(surahNumber, ayahNumber) {
  try {
    const translationData = state.translations[state.translation];
    if (!translationData) return "Translation loading...";
    
    if (translationData[surahNumber] && translationData[surahNumber].ayahs[ayahNumber]) {
      return translationData[surahNumber].ayahs[ayahNumber];
    }
    
    return "Translation not available";
  } catch (error) {
    console.error("Error getting translation:", error);
    return "Translation error";
  }
}

function getSurahBismillah(surahNumber) {
  // Surah 9 has no Bismillah
  if (surahNumber == 9) return null;
  
  // Surah 1 has Bismillah as separate entry
  if (surahNumber == 1) {
    return state.quranData["1"]?.bismillah || BISMILLAH_UI;
  }
  
  // Other surahs: check if first ayah starts with Bismillah
  const firstAyah = state.quranData[surahNumber]?.ayahs["1"];
  if (firstAyah && firstAyah.includes(BISMILLAH_UI)) {
    return BISMILLAH_UI;
  }
  
  return null;
}

/* ======================
   QURAN READING FUNCTIONS SECTION - FIXED!
====================== */
async function loadSurahList() {
  try {
    const surahSelect = document.getElementById("surah-select");
    if (!surahSelect) return;
    
    const originalHTML = surahSelect.innerHTML;
    surahSelect.innerHTML = '<option value="" disabled selected>Loading surahs...</option>';
    
    // Ensure Quran data is loaded
    if (!state.quranData) {
      await loadQuranData();
    }
    
    // Debug: Check SURAH_INFO
    console.log("DEBUG in loadSurahList - SURAH_INFO available:", !!window.SURAH_INFO);
    if (window.SURAH_INFO) {
      console.log("DEBUG SURAH_INFO[1]:", window.SURAH_INFO[1]);
      console.log("DEBUG SURAH_INFO[2]:", window.SURAH_INFO[2]);
    }
    
    surahSelect.innerHTML = '<option value="" disabled selected>Choose a surah...</option>';
    
    // Get all surah numbers from quran data
    const surahNumbers = Object.keys(state.quranData).map(Number).sort((a, b) => a - b);
    
    surahNumbers.forEach(surahNumber => {
      const surahInfo = getSurahInfo(surahNumber);
      const ayahCount = Object.keys(state.quranData[surahNumber].ayahs || {}).length;
      
      console.log(`DEBUG Creating option for surah ${surahNumber}:`, surahInfo);
      
      const option = document.createElement("option");
      option.value = surahNumber;
      // FIXED: Using the correct properties from surahInfo
      option.textContent = `${surahNumber}. ${surahInfo.english} (${surahInfo.name})`;
      option.title = `${surahInfo.translation} | ${surahInfo.revelation} | ${ayahCount} verses`;
      surahSelect.appendChild(option);
    });
    
    if (state.currentSurah) {
      surahSelect.value = state.currentSurah;
    }
    
    console.log(`✅ Loaded ${surahNumbers.length} surahs successfully`);
    
  } catch (error) {
    console.error("Failed to load surah list:", error);
    const surahSelect = document.getElementById("surah-select");
    if (!surahSelect) return;
    
    surahSelect.innerHTML = `
      <option value="" disabled selected>Failed to load surahs. Please check connection.</option>
    `;
    
    const retryOption = document.createElement("option");
    retryOption.value = "retry";
    retryOption.textContent = "Click here to retry";
    surahSelect.appendChild(retryOption);
    
    surahSelect.addEventListener('change', function() {
      if (this.value === "retry") {
        loadSurahList();
      }
    });
  }
}

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
        <h3>Loading Surah...</h3>
        <p>Please wait while we fetch the Quranic text</p>
      </div>
    `;
  }
  
  try {
    // Ensure Quran data is loaded
    if (!state.quranData) {
      await loadQuranData();
    }
    
    // Load translation if not already loaded
    if (!state.translations[state.translation]) {
      await loadTranslation(state.translation);
    }
    
    const surahData = state.quranData[surahNumber];
    if (!surahData) {
      throw new Error(`Surah ${surahNumber} not found in data`);
    }
    
    state.currentSurah = surahNumber;
    state.currentSurahData = surahData;
    state.stats.surahsRead++;
    updateStatsDisplay();
    
    const ayahs = surahData.ayahs;
    const surahInfo = getSurahInfo(surahNumber);
    const hasBismillah = getSurahBismillah(surahNumber);
    
    console.log("DEBUG loadSurah - surahInfo:", surahInfo);
    
    let versesHTML = "";
    
    // ===============================
    // SURAH 1 — AL-FATIHAH SPECIAL HANDLING
    // ===============================
    if (surahNumber == 1) {
      // 1️⃣ Show Bismillah as a header (from bismillah field)
      versesHTML += `
        <div class="bismillah-starter" style="margin-bottom: 25px; text-align:center;">
          <div class="verse-ar" style="font-size:${state.fontSize + 4}px; font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">
            ${hasBismillah || BISMILLAH_UI}
          </div>
          <div class="verse-tr" style="font-style:italic;color:#555;">
            ${BISMILLAH_TRANSLATION}
          </div>
          <div style="font-size:12px;color:#14b8a6;margin-top:6px;">
            <i class="fas fa-star"></i> Starter (not counted as an ayah)
          </div>
        </div>
      `;

      // 2️⃣ Display ayahs 1-6 (which are actually ayahs 1-6 in your data)
      for (let i = 1; i <= 6; i++) {
        const ayahText = ayahs[i];
        if (!ayahText) continue;
        
        const translation = getVerseTranslation(surahNumber, i);
        
        versesHTML += `
          <div class="verse" style="font-size:${state.fontSize}px">
            <div class="verse-ar" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">
              ${ayahText}
              <span class="verse-number">${i}</span>
            </div>
            <div class="verse-tr">
              ${translation}
            </div>
          </div>
        `;
      }
    }
    // ===============================
    // SURAH 9 — AT-TAWBAH (NO BISMILLAH)
    // ===============================
    else if (surahNumber == 9) {
      // Display all ayahs normally
      Object.entries(ayahs).forEach(([ayahNum, ayahText]) => {
        const translation = getVerseTranslation(surahNumber, parseInt(ayahNum));
        
        versesHTML += `
          <div class="verse" style="font-size:${state.fontSize}px">
            <div class="verse-ar" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">
              ${ayahText}
              <span class="verse-number">${ayahNum}</span>
            </div>
            <div class="verse-tr">
              ${translation}
            </div>
          </div>
        `;
      });
    }
    // ===============================
    // ALL OTHER SURAHS (2-114, except 9)
    // ===============================
    else {
      // Check if first ayah contains Bismillah
      const firstAyahText = ayahs["1"];
      const bismillahInAyah = firstAyahText && firstAyahText.includes(BISMILLAH_UI);
      
      if (bismillahInAyah) {
        // First ayah has Bismillah - separate it
        const bismillahPart = BISMILLAH_UI;
        const restOfAyah = firstAyahText.replace(BISMILLAH_UI, '').trim();
        const translation = getVerseTranslation(surahNumber, 1);
        
        versesHTML += `
          <div class="verse first-ayah-special">
            <div class="ayah-separated">
              <div class="bismillah-part">
                <div class="verse-ar bismillah-text" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">${bismillahPart}</div>
                <div class="verse-tr bismillah-translation">${BISMILLAH_TRANSLATION}</div>
              </div>
              <div class="separator-line">
                <div class="line"></div>
                <div class="ayah-number">1</div>
                <div class="line"></div>
              </div>
              <div class="rest-of-ayah">
                <div class="verse-ar" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">${restOfAyah}</div>
                <div class="verse-tr">${translation}</div>
              </div>
            </div>
          </div>
        `;
        
        // Display remaining ayahs (starting from 2)
        for (let i = 2; ayahs[i]; i++) {
          const translation = getVerseTranslation(surahNumber, i);
          
          versesHTML += `
            <div class="verse" style="font-size:${state.fontSize}px">
              <div class="verse-ar" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">
                ${ayahs[i]}
                <span class="verse-number">${i}</span>
              </div>
              <div class="verse-tr">
                ${translation}
              </div>
            </div>
          `;
        }
      } else {
        // No Bismillah in first ayah, display all normally
        Object.entries(ayahs).forEach(([ayahNum, ayahText]) => {
          const translation = getVerseTranslation(surahNumber, parseInt(ayahNum));
          
          versesHTML += `
            <div class="verse" style="font-size:${state.fontSize}px">
              <div class="verse-ar" style="font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif;">
                ${ayahText}
                <span class="verse-number">${ayahNum}</span>
              </div>
              <div class="verse-tr">
                ${translation}
              </div>
            </div>
          `;
        });
      }
    }
    
    // Calculate correct number of ayahs
    let correctAyahCount;
    let noteType;
    let noteText;
    
    if (surahNumber == 1) {
      correctAyahCount = 6;
      noteType = 'fatihah';
      noteText = 'Al-Fatihah: 6 verses + Bismillah opener';
    } else if (surahNumber == 9) {
      correctAyahCount = Object.keys(ayahs).length;
      noteType = 'tawbah';
      noteText = 'At-Tawbah: No Bismillah at beginning';
    } else {
      correctAyahCount = Object.keys(ayahs).length;
      noteType = 'normal';
      noteText = hasBismillah ? 'Bismillah included in first verse' : 'No Bismillah in this surah';
    }
    
    const translationSelect = document.getElementById("translation-select");
    const translationName = TRANSLATIONS[state.translation] || 'English';
    
    const surahHeader = `
      <div class="surah-header">
        <h2>${surahInfo.english} <span style="font-weight:300;">(${surahInfo.name})</span></h2>
        <p style="opacity: 0.9; margin-bottom: 10px;">
          <strong>${surahInfo.translation}</strong> • ${correctAyahCount} verses • ${surahInfo.revelation}
        </p>
        <p style="margin-top: 15px; font-size: 0.95em;">
          <i class="fas fa-language"></i> Translation: <strong>${translationName}</strong>
        </p>
        <div class="surah-note ${noteType}" style="margin-top: 12px;">
          <i class="fas fa-info-circle"></i> ${noteText}
        </div>
      </div>
    `;
    
    if (readerElement) {
      readerElement.innerHTML = surahHeader + versesHTML;
      readerElement.scrollTop = 0;
    }
    
    showStatusMessage("Surah loaded successfully!", "success");
    
    // Log for debugging
    console.log(`Surah ${surahNumber} loaded:`, {
      name: surahInfo.english,
      ayahCount: correctAyahCount,
      type: noteType,
      hasBismillah: !!hasBismillah
    });
    
  } catch (error) {
    console.error("Failed to load surah:", error);
    
    if (readerElement) {
      readerElement.innerHTML = `
        <div class="reader-placeholder">
          <div class="placeholder-icon" style="color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Failed to Load Surah</h3>
          <p>${error.message || "Please check your data and try again"}</p>
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

function showStatusMessage(message, type = "info") {
  const statusMessages = document.getElementById("status-messages");
  if (!statusMessages) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `status-message ${type}`;
  messageDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${message}
  `;
  
  if (!document.querySelector('#status-message-styles')) {
    const style = document.createElement('style');
    style.id = 'status-message-styles';
    style.textContent = `
      #status-messages {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999;
        width: 90%;
        max-width: 400px;
      }
      .status-message {
        padding: 12px 20px;
        border-radius: 10px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .status-message.success {
        background: #d1fae5;
        color: #065f46;
        border-left: 4px solid #10b981;
      }
      .status-message.error {
        background: #fee2e2;
        color: #991b1b;
        border-left: 4px solid #ef4444;
      }
      .status-message.warning {
        background: #fef3c7;
        color: #92400e;
        border-left: 4px solid #f59e0b;
      }
      @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  statusMessages.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 5000);
}

/* ======================
   TIMER FUNCTIONS SECTION
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
        if (state.currentPage === 'home') {
          updateStatsDisplay();
        }
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
   TRIVIA FUNCTIONS SECTION
====================== */
function initTrivia() {
  const triviaText = document.getElementById("trivia-text");
  const triviaBtn = document.getElementById("trivia-btn");
  
  if (!triviaText || !triviaBtn) return;
  
  state.triviaIndex = Math.floor(Math.random() * TRIVIA_FACTS.length);
  triviaText.textContent = TRIVIA_FACTS[state.triviaIndex];
  
  triviaBtn.addEventListener('click', () => {
    triviaBtn.disabled = true;
    
    triviaText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
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
      
      triviaBtn.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        triviaBtn.style.transform = 'rotate(0deg)';
        triviaBtn.disabled = false;
      }, 300);
    }, 300);
  });
}

/* ======================
   FONT SIZE CONTROL SECTION
====================== */
function initFontSizeControl() {
  const fontSizeSlider = document.getElementById("font-size");
  const fontSizeValue = document.getElementById("font-size-value");
  
  if (!fontSizeSlider || !fontSizeValue) return;
  
  fontSizeSlider.addEventListener('input', () => {
    state.fontSize = parseInt(fontSizeSlider.value);
    fontSizeValue.textContent = `${state.fontSize}px`;
    
    // Update all existing verse fonts
    const verses = document.querySelectorAll('.verse:not(.bismillah-starter):not(.first-ayah-special)');
    verses.forEach(verse => {
      verse.style.fontSize = `${state.fontSize}px`;
    });
    
    // Update Bismillah starter
    const bismillahStarters = document.querySelectorAll('.bismillah-starter .verse-ar');
    bismillahStarters.forEach(text => {
      text.style.fontSize = `${state.fontSize + 4}px`;
    });
    
    // Update separated ayah fonts
    const bismillahTexts = document.querySelectorAll('.bismillah-text');
    bismillahTexts.forEach(text => {
      text.style.fontSize = `${state.fontSize + 2}px`;
    });
  });
  
  fontSizeValue.textContent = `${state.fontSize}px`;
  fontSizeSlider.value = state.fontSize;
}

/* ======================
   QUICK ACTIONS SECTION
====================== */
function initQuickActions() {
  const readBtn = document.querySelector('.action-btn[data-page="read"]');
  if (readBtn) {
    readBtn.addEventListener('click', () => {
      navigate('read');
    });
  }
  
  const settingsBtn = document.querySelector('.action-btn[data-page="settings"]');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      navigate('settings');
    });
  }
  
  const sadaqahQuickBtn = document.getElementById('sadaqah-quick-btn');
  if (sadaqahQuickBtn) {
    sadaqahQuickBtn.addEventListener('click', () => {
      const modal = document.getElementById('sadaqah-modal');
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }
  
  const refreshVerseBtn = document.getElementById('refresh-verse');
  if (refreshVerseBtn) {
    refreshVerseBtn.addEventListener('click', async () => {
      await fetchRandomVerse();
    });
  }
  
  // Fetch random verse on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      fetchRandomVerse();
    }, 1000);
  });
}

async function fetchRandomVerse() {
  try {
    const refreshBtn = document.getElementById('refresh-verse');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    refreshBtn.disabled = true;
    
    // Ensure Quran data is loaded
    if (!state.quranData) {
      await loadQuranData();
    }
    
    // Get all surah numbers
    const surahNumbers = Object.keys(state.quranData).map(Number);
    const randomSurahNumber = surahNumbers[Math.floor(Math.random() * surahNumbers.length)];
    const randomSurah = state.quranData[randomSurahNumber];
    
    // Get all ayah numbers for this surah
    const ayahNumbers = Object.keys(randomSurah.ayahs).map(Number);
    const randomAyahNumber = ayahNumbers[Math.floor(Math.random() * ayahNumbers.length)];
    const randomAyahText = randomSurah.ayahs[randomAyahNumber];
    
    // Load translation for the verse
    if (!state.translations.en) {
      await loadTranslation('en');
    }
    
    const translation = getVerseTranslation(randomSurahNumber, randomAyahNumber);
    const surahInfo = getSurahInfo(randomSurahNumber);
    
    document.querySelector('.daily-verse-arabic').textContent = randomAyahText;
    document.querySelector('.daily-verse-translation').textContent = translation || "Translation not available";
    document.querySelector('.daily-verse-reference').textContent = `Surah ${surahInfo.english} (${randomSurahNumber}:${randomAyahNumber})`;
    
    showStatusMessage('New verse loaded!', 'success');
    
  } catch (error) {
    console.error('Error fetching verse:', error);
    showStatusMessage('Failed to load new verse. Please try again.', 'error');
    
    const fallbackVerses = [
      {
        arabic: 'رَبَّنَآ اٰتِنَا فِى الدُّنْيَا حَسَنَةً وَّفِى الْاٰخِرَةِ حَسَنَةً وَّقِنَا عَذَابَ النَّارِ',
        translation: "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.",
        reference: "Surah Al-Baqarah (2:201)"
      },
      {
        arabic: 'وَذَكَرَ ٱسْمَ رَبِّهِۦ فَصَلَّىٰ',
        translation: "And mentions the name of his Lord and prays.",
        reference: "Surah Al-A'la (87:15)"
      },
      {
        arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        translation: "Indeed, with hardship [will be] ease.",
        reference: "Surah Ash-Sharh (94:6)"
      }
    ];
    
    const randomFallback = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
    document.querySelector('.daily-verse-arabic').textContent = randomFallback.arabic;
    document.querySelector('.daily-verse-translation').textContent = randomFallback.translation;
    document.querySelector('.daily-verse-reference').textContent = randomFallback.reference;
    
  } finally {
    const refreshBtn = document.getElementById('refresh-verse');
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Another Verse';
    refreshBtn.disabled = false;
  }
}

/* ======================
   EVENT BINDING SECTION
====================== */
function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  
  const loadBtn = document.getElementById("load-btn");
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const surahNumber = document.getElementById("surah-select").value;
      loadSurah(surahNumber);
    });
  }
  
  const translationSelect = document.getElementById("translation-select");
  if (translationSelect) {
    translationSelect.addEventListener('change', () => {
      state.translation = translationSelect.value;
      // Clear cached translation to force reload
      state.translations[state.translation] = null;
      if (state.currentSurah) {
        loadSurah(state.currentSurah);
      }
    });
  }
  
  initFontSizeControl();
  initQuickActions();
}

function trackEvent(eventName, data = {}) {
  console.log(`📊 Event: ${eventName}`, data);
}

/* ======================
   LOADING SCREEN SECTION
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
   ADD CUSTOM STYLES WITH ARABIC FONT IMPROVEMENTS
====================== */
function addCustomStyles() {
  if (!document.querySelector('#custom-animations')) {
    const style = document.createElement('style');
    style.id = 'custom-animations';
    style.textContent = `
      /* Import Arabic fonts */
      @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Scheherazade+New:wght@400;700&family=Lateef:wght@200;300;400;500;600;700;800&display=swap');
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-20px); opacity: 0; }
      }
      
      .success-message {
        animation: slideInRight 0.3s ease;
      }
      
      .success-message.hide {
        animation: slideOutRight 0.3s ease;
      }
      
      .loading-screen {
        transition: opacity 0.5s ease, visibility 0.5s ease;
      }
      
      /* Quran text animations */
      .verse {
        animation: fadeInVerse 0.5s ease forwards;
        opacity: 0;
        transform: translateY(10px);
      }
      
      @keyframes fadeInVerse {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Arabic text styling */
      .verse-ar {
        font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif !important;
        font-size: 26px;
        line-height: 2.2;
        text-align: right;
        direction: rtl;
        margin-bottom: 12px;
        color: #1a202c;
        font-weight: 400;
        letter-spacing: 0px;
        word-spacing: 3px;
      }
      
      .bismillah-starter .verse-ar {
        font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif !important;
        font-size: 28px;
        font-weight: 700;
        color: #115e59;
        line-height: 2.5;
        text-align: center;
      }
      
      /* First ayah special styling for separated Bismillah */
      .first-ayah-special {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
        border-radius: 15px !important;
        padding: 20px !important;
        margin-bottom: 25px !important;
        border-left: 4px solid #0f766e !important;
      }
      
      .ayah-separated {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .bismillah-part {
        text-align: center;
        padding: 15px;
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        border-radius: 12px;
        border: 1px dashed #14b8a6;
      }
      
      .bismillah-text {
        font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif !important;
        font-size: 26px !important;
        font-weight: 700 !important;
        color: #115e59 !important;
        line-height: 2 !important;
        margin-bottom: 8px !important;
        text-align: center !important;
      }
      
      .bismillah-translation {
        font-style: italic !important;
        color: #555 !important;
        font-size: 1rem !important;
        border-top: none !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
        text-align: center !important;
      }
      
      .separator-line {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 10px 0;
      }
      
      .separator-line .line {
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
      }
      
      .separator-line .ayah-number {
        background: linear-gradient(135deg, #0f766e, #14b8a6);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        box-shadow: 0 3px 6px rgba(15, 118, 110, 0.2);
      }
      
      .rest-of-ayah {
        text-align: center;
        padding: 15px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      
      .rest-of-ayah .verse-ar {
        font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif !important;
        font-size: 24px !important;
        line-height: 2 !important;
        margin-bottom: 8px !important;
        text-align: center !important;
      }
      
      .rest-of-ayah .verse-tr {
        color: #475569 !important;
        line-height: 1.6 !important;
        font-size: 1rem !important;
        border-top: 1px dashed #cbd5e1 !important;
        padding-top: 8px !important;
        margin-top: 8px !important;
      }
      
      /* Daily verse Arabic styling */
      .daily-verse-arabic {
        font-family: 'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif !important;
        font-size: 22px;
        line-height: 2;
        text-align: center;
        direction: rtl;
        color: #1a202c;
        margin-bottom: 15px;
      }
      
      /* Verse number styling */
      .verse-number {
        display: inline-block;
        width: 32px;
        height: 32px;
        line-height: 32px;
        text-align: center;
        background: linear-gradient(135deg, #0f766e, #14b8a6);
        color: white;
        border-radius: 50%;
        font-size: 0.8rem;
        font-weight: 700;
        margin: 0 8px;
        vertical-align: middle;
        box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);
      }
      
      /* Surah note styling */
      .surah-note {
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 0.9rem;
        background: #f0f9ff;
        border-left: 4px solid #0ea5e9;
      }
      
      .surah-note.fatihah {
        background: #f0fdf4;
        border-left: 4px solid #10b981;
      }
      
      .surah-note.tawbah {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
      }
      
      /* Font size responsiveness */
      @media (max-width: 768px) {
        .verse-ar {
          font-size: 24px !important;
          line-height: 2.2;
        }
        
        .bismillah-text {
          font-size: 24px !important;
        }
        
        .bismillah-starter .verse-ar {
          font-size: 26px !important;
        }
        
        .rest-of-ayah .verse-ar {
          font-size: 22px !important;
        }
        
        .daily-verse-arabic {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        .verse-ar {
          font-size: 22px !important;
          line-height: 2;
        }
        
        .bismillah-text {
          font-size: 22px !important;
        }
        
        .bismillah-starter .verse-ar {
          font-size: 24px !important;
        }
        
        .rest-of-ayah .verse-ar {
          font-size: 20px !important;
        }
        
        .verse-number {
          width: 30px;
          height: 30px;
          line-height: 30px;
          font-size: 0.8rem;
        }
        
        .separator-line .ayah-number {
          width: 28px;
          height: 28px;
          font-size: 0.8rem;
        }
        
        .verse {
          padding: 15px;
        }
        
        .first-ayah-special {
          padding: 15px !important;
        }
        
        .daily-verse-arabic {
          font-size: 18px;
        }
      }
      
      /* For very small screens */
      @media (max-width: 360px) {
        .verse-ar {
          font-size: 20px !important;
        }
        
        .bismillah-starter .verse-ar {
          font-size: 22px !important;
        }
        
        .daily-verse-arabic {
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ======================
   INITIALIZATION SECTION
====================== */
async function initializeApp() {
  console.log("🕌 Quran Tracker initializing...");
  
  try {
    addCustomStyles();
    initTelegram();
    initModal();
    initTimer();
    initTrivia();
    bindEvents();
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // Load Quran data first
    await loadQuranData();
    
    // Preload English translation for daily verse
    await loadTranslation('en');
    
    // Then load surah list
    await loadSurahList();
    
    renderPage();
    
    setTimeout(hideLoadingScreen, 1500);
    
    console.log("✅ Quran Tracker initialized successfully!");
    
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    
    hideLoadingScreen();
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      text-align: center;
      z-index: 9999;
      max-width: 80%;
    `;
    errorDiv.innerHTML = `
      <h3 style="color: #dc2626; margin-bottom: 10px;">
        <i class="fas fa-exclamation-triangle"></i> Initialization Error
      </h3>
      <p>There was an error loading the app. Please refresh the page.</p>
      <button onclick="window.location.reload()" class="btn" style="margin-top: 15px;">
        <i class="fas fa-redo"></i> Refresh Page
      </button>
    `;
    document.body.appendChild(errorDiv);
  }
}

/* ======================
   START THE APPLICATION
====================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

window.navigate = navigate;
window.state = state;