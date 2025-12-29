// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// PASTE YOUR KEYS HERE
const firebaseConfig = {
  apiKey: "AIzaSyCChaLOwXv66FOJYy5swjrIU4GQtKUh1Jw",
  authDomain: "anistream-9ef60.firebaseapp.com",
  projectId: "anistream-9ef60",
  storageBucket: "anistream-9ef60.firebasestorage.app",
  messagingSenderId: "364571969552",
  appId: "1:364571969552:web:aed0d2e751b443ddd4e295"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 2. AUTHENTICATION
// ==========================================
function googleLogin() {
    auth.signInWithPopup(provider).then(() => location.reload()).catch(e => console.error(e));
}

function logout() {
    auth.signOut().then(() => location.reload());
}

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const profile = document.getElementById('user-profile');
    
    if (user && loginBtn) {
        currentUser = user;
        loginBtn.style.display = 'none';
        profile.style.display = 'block';
        document.getElementById('user-avatar').src = user.photoURL;
        document.getElementById('user-name').innerText = user.displayName.split(" ")[0];
        loadHistory();
    }
});

// ==========================================
// 3. HOME PAGE LOGIC
// ==========================================
const grid = document.getElementById('anime-grid');
const searchBar = document.getElementById('search-bar');

if (grid) {
    db.collection("animes").get().then((snapshot) => {
        let allAnime = [];
        snapshot.forEach(doc => allAnime.push({ id: doc.id, ...doc.data() }));

        // --- FILTER FOR SLIDER ---
        // Must have Banner AND 'featured' must be true
        const bannerAnimes = allAnime.filter(a => a.banner && a.featured === true);
        
        if (bannerAnimes.length > 0) initSlider(bannerAnimes);

        // Render Grid
        function renderGrid(filterText = "") {
            grid.innerHTML = "";
            allAnime.forEach(anime => {
                if (anime.title.toLowerCase().includes(filterText.toLowerCase())) {
                    grid.appendChild(createAnimeCard(anime));
                }
            });
        }
        renderGrid();
        if(searchBar) searchBar.addEventListener('input', (e) => renderGrid(e.target.value));
    });
}

// === CARD CREATOR (Updated with Lang Badge) ===
function createAnimeCard(anime, customSubtitle = null) {
    const card = document.createElement('div');
    card.classList.add('anime-card');

    // 1. NEW EPISODE BADGE (Right)
    let badgeHTML = "";
    if (anime.lastUpdated && !customSubtitle) {
        const days = (new Date() - anime.lastUpdated.toDate()) / (1000 * 3600 * 24);
        if (days < 3) badgeHTML = `<div class="badge-new">NEW EP</div>`;
    }

    // 2. LANGUAGE BADGE (Left)
    let langHTML = "";
    if (anime.language) {
        let colorClass = "";
        if(anime.language.includes("Dub")) colorClass = "lang-dub";
        if(anime.language.includes("Hindi")) colorClass = "lang-hindi";
        langHTML = `<div class="badge-lang ${colorClass}">${anime.language}</div>`;
    }

    const sub = customSubtitle ? `<span style="color:#8B5CF6">${customSubtitle}</span>` : `${anime.seasons ? anime.seasons.length : 0} Seasons`;

    card.innerHTML = `
        ${badgeHTML}
        ${langHTML}
        <img src="${anime.image}" onerror="this.src='https://wallpapercave.com/wp/wp2326757.jpg'">
        <div class="card-info">
            <h3>${anime.title}</h3>
            <p>${sub}</p>
        </div>
    `;
    card.onclick = () => window.location.href = `watch.html?anime=${anime.id}`;
    return card;
}

// ==========================================
// 4. HERO SLIDER
// ==========================================
function initSlider(animes) {
    const wrapper = document.getElementById('hero-slider');
    const dots = document.getElementById('slider-dots');
    
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    
    const MAX_SLIDES = 5;
    const featured = animes.slice(0, MAX_SLIDES);
    let current = 0;

    featured.forEach((anime, index) => {
        const slide = document.createElement('div');
        slide.classList.add('slide');
        if (index === 0) slide.classList.add('active');
        slide.style.backgroundImage = `url('${anime.banner}')`;
        slide.innerHTML = `
            <div class="slide-content">
                <div class="slide-title">${anime.title}</div>
                <div class="slide-desc">${anime.seasons ? anime.seasons.length : 0} Seasons Available</div>
                <button class="watch-now-btn" onclick="window.location.href='watch.html?anime=${anime.id}'">
                    <i class="fas fa-play"></i> Watch Now
                </button>
            </div>`;
        wrapper.appendChild(slide);

        const dot = document.createElement('div');
        dot.classList.add('dot');
        if(index === 0) dot.classList.add('active');
        dot.style.cssText = "width:12px; height:12px; background:rgba(255,255,255,0.3); border-radius:50%; cursor:pointer;";
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
        prevBtn.onclick = () => { showSlide(current - 1); clearInterval(interval); interval = setInterval(() => showSlide(current + 1), 5000); };
        nextBtn.onclick = () => { showSlide(current + 1); clearInterval(interval); interval = setInterval(() => showSlide(current + 1), 5000); };
    } else {
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
    }
}

// ==========================================
// 5. HISTORY & PLAYER
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
                hGrid.appendChild(createAnimeCard({
                    id: doc.id, title: d.animeTitle, image: d.animeImage
                }, `Ep: ${d.lastEpisode}`));
            });
        }
    });
}

const player = document.getElementById('video-player');
if(player) {
    const params = new URLSearchParams(window.location.search);
    const animeId = params.get('anime');
    
    if(animeId) {
        db.collection("animes").doc(animeId).get().then(doc => {
            if(doc.exists) setupPlayer(doc.data(), animeId);
        });
    }

    function setupPlayer(anime, id) {
        document.getElementById('anime-title').innerText = anime.title;
        const sTabs = document.getElementById('season-tabs');
        const epList = document.getElementById('episode-list-container');

        anime.seasons.forEach((s, i) => {
            const btn = document.createElement('button');
            btn.classList.add('season-btn');
            btn.innerText = s.name;
            btn.onclick = () => loadEpisodes(i);
            sTabs.appendChild(btn);
        });
        if(anime.seasons.length > 0) loadEpisodes(0);

        function loadEpisodes(idx) {
            epList.innerHTML = "";
            anime.seasons[idx].episodes.forEach(ep => {
                const btn = document.createElement('div');
                btn.classList.add('ep-btn');
                btn.innerText = ep.title;
                btn.onclick = () => {
                    player.src = ep.url;
                    document.getElementById('ep-title').innerText = ep.title;
                    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if(currentUser) {
                        db.collection('users').doc(currentUser.uid).collection('history').doc(id).set({
                            animeTitle: anime.title, animeImage: anime.image, lastEpisode: ep.title,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                };
                epList.appendChild(btn);
            });
        }
    }
}