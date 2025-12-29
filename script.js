// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// ⚠️ PASTE YOUR KEYS HERE
const firebaseConfig = {
  apiKey: "AIzaSyCChaLOwXv66FOJYy5swjrIU4GQtKUh1Jw",
  authDomain: "anistream-9ef60.firebaseapp.com",
  projectId: "anistream-9ef60",
  storageBucket: "anistream-9ef60.firebasestorage.app",
  messagingSenderId: "364571969552",
  appId: "1:364571969552:web:aed0d2e751b443ddd4e295"
};

// Initialize
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 2. AUTHENTICATION
// ==========================================
function googleLogin() {
    auth.signInWithPopup(provider)
        .then(() => location.reload())
        .catch((error) => console.error(error));
}

function logout() {
    auth.signOut().then(() => location.reload());
}

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const profile = document.getElementById('user-profile');
    
    if (user) {
        currentUser = user;
        if(loginBtn) loginBtn.style.display = 'none';
        if(profile) {
            profile.style.display = 'block';
            document.getElementById('user-avatar').src = user.photoURL;
            document.getElementById('user-name').innerText = user.displayName.split(" ")[0];
        }
        loadHistory();
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(profile) profile.style.display = 'none';
    }
});

// ==========================================
// 3. HOME PAGE (GRID & SLIDER)
// ==========================================
const grid = document.getElementById('anime-grid');
const searchBar = document.getElementById('search-bar');

if (grid) {
    db.collection("animes").get().then((snapshot) => {
        let allContent = [];
        snapshot.forEach(doc => allContent.push({ id: doc.id, ...doc.data() }));

        // A. SLIDER LOGIC
        const sliderContent = allContent.filter(item => item.banner && item.featured === true);
        if (sliderContent.length > 0) initSlider(sliderContent);

        // B. GRID LOGIC
        function renderGrid(filterText = "") {
            grid.innerHTML = "";
            allContent.forEach(item => {
                if (item.title.toLowerCase().includes(filterText.toLowerCase())) {
                    grid.appendChild(createCard(item));
                }
            });
        }
        renderGrid();
        if(searchBar) searchBar.addEventListener('input', (e) => renderGrid(e.target.value));
    });
}

function createCard(item, customSubtitle = null) {
    const card = document.createElement('div');
    card.classList.add('anime-card');

    // Badges
    let badgeHTML = "";
    if (item.lastUpdated && !customSubtitle && item.type !== 'movie') {
        const days = (new Date() - item.lastUpdated.toDate()) / (1000 * 3600 * 24);
        if (days < 3) badgeHTML = `<div class="badge-new">NEW EP</div>`;
    }

    let langHTML = "";
    if (item.language) {
        let colorClass = "";
        if(item.language.includes("Dub")) colorClass = "lang-dub";
        if(item.language.includes("Hindi")) colorClass = "lang-hindi";
        langHTML = `<div class="badge-lang ${colorClass}">${item.language}</div>`;
    }

    // Subtitle
    let sub = customSubtitle;
    if (!sub) {
        sub = item.type === 'movie' ? 'Watch Now' : `${item.seasons ? item.seasons.length : 0} Seasons`;
    }

    card.innerHTML = `
        ${badgeHTML}
        ${langHTML}
        <img src="${item.image}" onerror="this.src='https://wallpapercave.com/wp/wp2326757.jpg'">
        <div class="card-info">
            <h3>${item.title}</h3>
            <p>${sub}</p>
        </div>
    `;
    card.onclick = () => window.location.href = `watch.html?anime=${item.id}`;
    return card;
}

// ==========================================
// 4. HERO SLIDER LOGIC
// ==========================================
function initSlider(items) {
    const wrapper = document.getElementById('hero-slider');
    const dots = document.getElementById('slider-dots');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    const MAX_SLIDES = 5;
    const featured = items.slice(0, MAX_SLIDES);
    let current = 0;

    featured.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.classList.add('slide');
        if (index === 0) slide.classList.add('active');
        slide.style.backgroundImage = `url('${item.banner}')`;
        
        slide.innerHTML = `
            <div class="slide-content">
                <div class="slide-title">${item.title}</div>
                <div class="slide-desc">${item.type === 'movie' ? 'Full Movie' : (item.seasons ? item.seasons.length : 0) + ' Seasons Available'}</div>
                <button class="watch-now-btn" onclick="window.location.href='watch.html?anime=${item.id}'">
                    <i class="fas fa-play"></i> Watch Now
                </button>
            </div>`;
        wrapper.appendChild(slide);

        const dot = document.createElement('div');
        dot.classList.add('dot');
        if(index === 0) dot.classList.add('active');
        dot.style.cssText = "width:10px; height:10px; background:rgba(255,255,255,0.3); border-radius:50%; cursor:pointer; transition:0.3s;";
        if(index === 0) dot.style.background = "white";
        dot.onclick = () => showSlide(index);
        dots.appendChild(dot);
    });

    function showSlide(index) {
        const slides = document.querySelectorAll('.slide');
        const allDots = document.querySelectorAll('.dot');
        if (index >= featured.length) current = 0;
        else if (index < 0) current = featured.length - 1;
        else current = index;

        slides.forEach(s => s.classList.remove('active'));
        allDots.forEach(d => d.style.background = "rgba(255,255,255,0.3)");
        slides[current].classList.add('active');
        allDots[current].style.background = "white";
    }

    if(featured.length > 1) {
        let interval = setInterval(() => showSlide(current + 1), 5000);
        if(prevBtn) prevBtn.onclick = () => { showSlide(current - 1); clearInterval(interval); interval = setInterval(() => showSlide(current + 1), 5000); };
        if(nextBtn) nextBtn.onclick = () => { showSlide(current + 1); clearInterval(interval); interval = setInterval(() => showSlide(current + 1), 5000); };
    } else {
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
    }
}

// ==========================================
// 5. HISTORY LOGIC
// ==========================================
function loadHistory() {
    if(!grid || !currentUser) return;
    const section = document.getElementById('continue-watching-section');
    const hGrid = document.getElementById('history-grid');

    db.collection('users').doc(currentUser.uid).collection('history')
      .orderBy('timestamp', 'desc').limit(4).get().then(snap => {
          if(!snap.empty) {
              section.style.display = 'block';
              hGrid.innerHTML = "";
              snap.forEach(doc => {
                  const d = doc.data();
                  hGrid.appendChild(createCard({
                      id: doc.id, title: d.animeTitle, image: d.animeImage, type: d.type
                  }, d.lastEpisode));
              });
          }
      });
}

// ==========================================
// 6. PLAYER LOGIC (Universal)
// ==========================================
const player = document.getElementById('video-player');

if (player) {
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('anime');

    if (contentId) {
        db.collection("animes").doc(contentId).get().then(doc => {
            if (doc.exists) setupPlayer(doc.data(), contentId);
        });
    }

    function setupPlayer(content, id) {
        document.getElementById('anime-title').innerText = content.title;
        const sTabs = document.getElementById('season-tabs');
        const epList = document.getElementById('episode-list-container');
        const sidebar = document.querySelector('.sidebar');
        const watchContainer = document.querySelector('.watch-container');

        // --- MOVIE MODE ---
        if (content.type === 'movie') {
            player.src = content.videoUrl;
            document.getElementById('ep-title').innerText = "Full Movie";
            if(watchContainer) watchContainer.classList.add('movie-mode');
            if(sidebar) sidebar.style.display = 'none';
            saveHistory(id, content, "Movie");
            loadGiscus(id, "Full Movie");
            return;
        }

        // --- SERIES MODE ---
        if(watchContainer) watchContainer.classList.remove('movie-mode');
        if(sidebar) sidebar.style.display = 'flex';

        content.seasons.forEach((season, index) => {
            const btn = document.createElement('button');
            btn.classList.add('season-btn');
            btn.innerText = season.name;
            btn.onclick = () => loadEpisodes(index);
            sTabs.appendChild(btn);
        });
        if(content.seasons.length > 0) loadEpisodes(0);

        function loadEpisodes(seasonIndex) {
            epList.innerHTML = "";
            content.seasons[seasonIndex].episodes.forEach(ep => {
                const btn = document.createElement('div');
                btn.classList.add('ep-btn');
                btn.innerText = ep.title;
                btn.onclick = () => {
                    player.src = ep.url;
                    document.getElementById('ep-title').innerText = ep.title;
                    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    saveHistory(id, content, `Ep: ${ep.title}`);
                    loadGiscus(id, ep.title);
                };
                epList.appendChild(btn);
            });
        }
    }

    function saveHistory(id, content, progressText) {
        if(currentUser) {
            db.collection('users').doc(currentUser.uid).collection('history').doc(id).set({
                animeTitle: content.title, animeImage: content.image, lastEpisode: progressText,
                type: content.type || 'series', timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
}

// ==========================================
// 7. GISCUS COMMENTS (Stable ID Fix)
// ==========================================
function loadGiscus(animeId, seasonIndex, episodeIndex) {
    const container = document.getElementById('comments-section');
    const iframe = document.querySelector('iframe.giscus-frame');
    
    // 1. GENERATE A STABLE ID (e.g., "naruto_s0_e1")
    // This ignores the title text, so comments never get lost.
    const term = `${animeId}_s${seasonIndex}_e${episodeIndex}`;
    
    console.log("Loading Comments for ID:", term); // Check Console (F12) if issues persist

    // 2. CHECK IF GISCUS IS ALREADY LOADED
    if (iframe) {
        // Hot Reload (Fast Switch)
        iframe.contentWindow.postMessage({
            giscus: {
                setConfig: {
                    term: term,
                    reactionsEnabled: '1',
                    emitMetadata: '0',
                    inputPosition: 'top',
                    theme: 'transparent_dark',
                    lang: 'en'
                }
            }
        }, 'https://giscus.app');
        
    } else {
        // Initial Load
        container.innerHTML = `
            <div class="comments-header">
                <h3 class="comments-title">Discussion</h3>
            </div>
            <div class="giscus"></div>
        `;

        const script = document.createElement('script');
        script.src = "https://giscus.app/client.js";

        // ⚠️ PASTE YOUR KEYS HERE ⚠️
        script.setAttribute("data-repo", "ig-ambesh/my-website-comments");
        script.setAttribute("data-repo-id", "R_kgDOQwo8og");
        script.setAttribute("data-category", "General");
        script.setAttribute("data-category-id", "DIC_kwDOQwo8os4C0Wk9");

        // Settings
        script.setAttribute("data-mapping", "pathname");
        script.setAttribute("data-term", term); // <--- Uses stable ID
        script.setAttribute("data-strict", "0");
        script.setAttribute("data-reactions-enabled", "1");
        script.setAttribute("data-emit-metadata", "0");
        script.setAttribute("data-input-position", "bottom");
        script.setAttribute("data-theme", "transparent_dark");
        script.setAttribute("data-lang", "en");
        script.setAttribute("crossorigin", "anonymous");
        script.async = true;

        container.appendChild(script);
    }
}