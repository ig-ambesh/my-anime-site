// ==========================================
// 1. CONFIGURATION
// ==========================================
// 🔴 PASTE YOUR KEYS HERE 🔴
const firebaseConfig = {
  apiKey: "AIzaSyCChaLOwXv66FOJYy5swjrIU4GQtKUh1Jw",
  authDomain: "anistream-9ef60.firebaseapp.com",
  projectId: "anistream-9ef60",
  storageBucket: "anistream-9ef60.firebasestorage.app",
  messagingSenderId: "364571969552",
  appId: "1:364571969552:web:aed0d2e751b443ddd4e295"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// GLOBAL STATE
let allContentCache = []; 
let currentAnimeData = null;
let currentSeasonIndex = 0;
let currentEpisodeIndex = 0;
let currentUser = null;

// ==========================================
// 2. AUTHENTICATION
// ==========================================
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const avatar = document.getElementById('user-avatar');
    if (user) {
        currentUser = user;
        if(loginBtn) loginBtn.style.display = 'none';
        if(avatar) { avatar.style.display = 'block'; avatar.src = user.photoURL; }
        loadHistory(user.uid);
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(avatar) avatar.style.display = 'none';
    }
});
function googleLogin() { auth.signInWithPopup(provider).then(() => location.reload()); }
function logout() { auth.signOut().then(() => location.reload()); }

// ==========================================
// 3. HOME PAGE LOGIC (Fixed Sorting)
// ==========================================
function loadHomePage() {
    const mainRow = document.getElementById('anime-row');
    const seriesRow = document.getElementById('series-row');
    const movieRow = document.getElementById('movie-row');
    
    if(!mainRow) return;

    db.collection('animes').get().then((snap) => {
        allContentCache = [];
        mainRow.innerHTML = "";
        seriesRow.innerHTML = "";
        movieRow.innerHTML = "";

        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allContentCache.push(data);
            
            // 1. Add to Trending
            mainRow.appendChild(createNetflixCard(data));

            // 2. Smart Sorting
            const type = (data.type || '').toLowerCase();
            
            if(type === 'movie') {
                movieRow.appendChild(createNetflixCard(data));
            } else {
                // Default to Series if it's not a movie
                seriesRow.appendChild(createNetflixCard(data));
            }
        });
        
        // Pick Hero
        const featured = allContentCache.find(x => x.featured === true) || allContentCache[0];
        if(featured) renderHero(featured);
    });
}

function filterContent(type) {
    const title = document.getElementById('row-title');
    const mainRow = document.getElementById('anime-row');
    
    if (type === 'all') {
        title.innerText = "Trending Now";
        document.getElementById('series-section').style.display = 'block';
        document.getElementById('movie-section').style.display = 'block';
        renderGrid(allContentCache, mainRow);
    } else {
        title.innerText = type === 'movie' ? "Movies" : "Series";
        document.getElementById('series-section').style.display = 'none';
        document.getElementById('movie-section').style.display = 'none';
        
        const filtered = allContentCache.filter(item => {
            const itemType = (item.type || 'series').toLowerCase();
            return itemType === type;
        });
        renderGrid(filtered, mainRow);
    }
}

function renderGrid(items, container) {
    container.innerHTML = ""; 
    items.forEach(data => container.appendChild(createNetflixCard(data)));
}

function renderHero(data) {
    const hero = document.getElementById('hero-section');
    const bg = data.banner || data.image; 
    const lang = data.language || 'Sub'; 
    
    hero.innerHTML = `
        <div class="hero-slide" style="background-image: url('${bg}')">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1 class="hero-title">${data.title}</h1>
                <div style="display:flex; gap:10px; margin-bottom:15px; align-items:center;">
                    <span style="color:#46d369; font-weight:bold;">98% Match</span>
                    <span style="border:1px solid #888; padding:0 5px; font-size:0.8rem;">${data.year || '2025'}</span>
                    <span style="border:1px solid white; padding:0 5px; font-size:0.7rem; border-radius:3px;">HD</span>
                    <span style="color:#ccc; font-size:0.9rem;">${lang}</span>
                </div>
                <p class="hero-desc">${data.description || 'Watch this amazing title now. Full HD streaming available.'}</p>
                <div class="hero-btns">
                    <button class="btn-primary" onclick="window.location.href='watch.html?anime=${data.id}'"><i class="fas fa-play"></i> Play</button>
                    <button class="btn-secondary" onclick="window.location.href='watch.html?anime=${data.id}'"><i class="fas fa-info-circle"></i> More Info</button>
                </div>
            </div>
        </div>
    `;
}

function createNetflixCard(data) {
    const card = document.createElement('div');
    card.classList.add('anime-card');
    
    const randomMatch = Math.floor(Math.random() * (99 - 80 + 1) + 80);
    const eps = data.sub || '?';
    const subDubBadge = data.dub > 0 ? `<span style="border:1px solid #666; padding:0 4px;">Dub</span>` : '';

    card.innerHTML = `
        <img src="${data.image}" loading="lazy">
        <div class="card-info">
            <h4 style="font-size:0.9rem; margin-bottom:5px;">${data.title}</h4>
            <div class="card-meta">
                <span class="match">${randomMatch}% Match</span>
                <span style="border:1px solid #888; padding:0 4px;">${data.type === 'movie' ? 'Movie' : eps + ' eps'}</span>
                ${subDubBadge}
            </div>
        </div>
    `;
    card.onclick = () => window.location.href = `watch.html?anime=${data.id}`;
    return card;
}

// ==========================================
// 4. PLAYER & BUTTONS (Fixed)
// ==========================================
function initPlayer() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('anime');
    if (!id) return;
    db.collection("animes").doc(id).get().then(doc => { if(doc.exists) setupPlayer(doc.data(), id); });
}

function setupPlayer(content, id) {
    currentAnimeData = content;
    currentAnimeData.id = id; // Store ID
    document.getElementById('anime-title').innerText = content.title;
    checkMyListStatus(id);

    if (content.type === 'movie') {
        document.getElementById('video-player').src = content.videoUrl;
        document.getElementById('ep-title').innerText = "Full Movie";
        document.querySelector('.sidebar-section').style.display = 'none';
        document.querySelector('.watch-layout').style.gridTemplateColumns = '1fr';
        if(currentUser) saveHistory(id, content, "Movie");
    } else {
        const sTabs = document.getElementById('season-tabs');
        const epList = document.getElementById('episode-list-container');
        
        if (!content.seasons || content.seasons.length === 0) { 
            epList.innerHTML = "<h3 style='color:white; padding:20px;'>No episodes found.</h3>"; 
            return; 
        }
        
        sTabs.innerHTML = "";
        content.seasons.forEach((season, idx) => {
            const btn = document.createElement('button');
            btn.className = `season-btn ${idx===0 ? 'active-season' : ''}`;
            btn.innerText = season.name || `Season ${idx+1}`;
            btn.onclick = () => renderEpisodes(idx);
            sTabs.appendChild(btn);
        });
        
        // Make renderEpisodes available globally
        window.renderEpisodes = (idx) => {
            epList.innerHTML = "";
            currentSeasonIndex = idx;
            
            // Update active tab style
            document.querySelectorAll('.season-btn').forEach((b, i) => {
                if(i === idx) b.classList.add('active-season');
                else b.classList.remove('active-season');
            });

            content.seasons[idx].episodes.forEach((ep, eIdx) => {
                const div = document.createElement('div');
                div.className = 'ep-btn';
                div.innerHTML = `<span class="ep-num">${eIdx+1}</span> <span>${ep.title}</span>`;
                
                div.onclick = () => {
                    playEpisode(idx, eIdx);
                };
                epList.appendChild(div);
            });
        };
        
        // Auto play first episode of first season
        renderEpisodes(0);
        playEpisode(0, 0);
    }
}

function playEpisode(seasonIdx, episodeIdx) {
    const ep = currentAnimeData.seasons[seasonIdx].episodes[episodeIdx];
    document.getElementById('video-player').src = ep.url;
    document.getElementById('ep-title').innerText = `S${seasonIdx+1} E${episodeIdx+1}: ${ep.title}`;
    
    currentSeasonIndex = seasonIdx;
    currentEpisodeIndex = episodeIdx;

    // Highlight active episode
    document.querySelectorAll('.ep-btn').forEach((btn, idx) => {
        if(idx === episodeIdx) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if(currentUser) saveHistory(currentAnimeData.id, currentAnimeData, `S${seasonIdx+1} E${episodeIdx+1}`);
}

// REAL NEXT EPISODE LOGIC
function playNextEpisode() {
    if(!currentAnimeData || currentAnimeData.type === 'movie') return alert("No next episode for movies.");
    
    const season = currentAnimeData.seasons[currentSeasonIndex];
    
    // Check if there is a next episode in this season
    if(currentEpisodeIndex + 1 < season.episodes.length) {
        playEpisode(currentSeasonIndex, currentEpisodeIndex + 1);
    } 
    // Check if there is a next season
    else if(currentSeasonIndex + 1 < currentAnimeData.seasons.length) {
        renderEpisodes(currentSeasonIndex + 1);
        playEpisode(currentSeasonIndex + 1, 0); // Play first ep of next season
    } 
    else {
        alert("You've reached the end of the series!");
    }
}

// SHARE & MY LIST
function shareAnime() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'Watch Anime', url: url });
    else {
        navigator.clipboard.writeText(url).then(() => alert("Link Copied to Clipboard!"));
    }
}

function toggleMyList() {
    if (!currentUser) return alert("Please Login to use My List");
    const id = new URLSearchParams(window.location.search).get('anime');
    const ref = db.collection('users').doc(currentUser.uid).collection('mylist').doc(id);

    ref.get().then(doc => {
        if (doc.exists) {
            ref.delete().then(() => {
                alert("Removed from List");
                checkMyListStatus(id);
            });
        } else {
            ref.set({
                title: currentAnimeData.title,
                image: currentAnimeData.image,
                type: currentAnimeData.type,
                timestamp: Date.now()
            }).then(() => {
                alert("Added to List");
                checkMyListStatus(id);
            });
        }
    });
}

function checkMyListStatus(id) {
    if (!currentUser) return;
    const btn = document.getElementById('mylist-btn');
    const icon = document.getElementById('mylist-icon');
    
    db.collection('users').doc(currentUser.uid).collection('mylist').doc(id).get().then(doc => {
        if (doc.exists) {
            icon.classList.remove('far'); 
            icon.classList.add('fas'); // Solid heart
            icon.style.color = '#e50914';
        } else {
            icon.classList.remove('fas'); 
            icon.classList.add('far'); // Outline heart
            icon.style.color = 'white';
        }
    });
}

function saveHistory(id, content, label) {
    db.collection('users').doc(currentUser.uid).collection('history').doc(id).set({
        animeTitle: content.title, animeImage: content.image, lastEpisode: label, timestamp: Date.now(), type: content.type
    });
}

function loadHistory(uid) {
    // ... (Same as before) ...
    // Keeping existing history logic
    db.collection('users').doc(uid).collection('history').orderBy('timestamp', 'desc').limit(5).get().then(snap => {
        if(!snap.empty) {
            document.getElementById('continue-watching-row').style.display = 'block';
            const grid = document.getElementById('history-grid');
            grid.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const cardData = { title: d.animeTitle, image: d.animeImage, id: doc.id, type: d.type, sub: d.lastEpisode };
                grid.appendChild(createNetflixCard(cardData));
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('anime-row')) loadHomePage();
    if (document.getElementById('video-player')) initPlayer();
});