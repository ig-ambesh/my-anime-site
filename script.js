// ... [KEEP CONFIG & AUTH THE SAME AS BEFORE] ...

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

let allContentCache = []; 
let currentUser = null;

// ==========================================
// 2. AUTHENTICATION & PROFILE
// ==========================================
auth.onAuthStateChanged((user) => {
    currentUser = user;
    const loginBtn = document.getElementById('login-btn');
    const profileWrap = document.getElementById('profile-wrapper');
    const avatar = document.getElementById('user-avatar');
    const mobileBtn = document.getElementById('mobile-profile-btn');

    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(profileWrap) {
            profileWrap.style.display = 'block';
            avatar.src = user.photoURL || 'https://via.placeholder.com/35';
        }
        if(mobileBtn) mobileBtn.innerHTML = `<img src="${user.photoURL}" style="width:24px; border-radius:50%;"> <span>Profile</span>`;
        loadHistory(user.uid);
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(profileWrap) profileWrap.style.display = 'none';
        if(mobileBtn) mobileBtn.innerHTML = `<i class="fas fa-user-circle"></i> <span>Sign In</span>`;
    }
});

function googleLogin() { auth.signInWithPopup(provider).then(() => location.reload()); }
function logout() { auth.signOut().then(() => location.reload()); }
function openEditProfile() { if(!currentUser) return; document.getElementById('edit-name').value = currentUser.displayName; document.getElementById('edit-pic').value = currentUser.photoURL; document.getElementById('edit-profile-modal').style.display = 'flex'; }
function closeEditProfile() { document.getElementById('edit-profile-modal').style.display = 'none'; }
function saveProfileChanges() { const name = document.getElementById('edit-name').value; const pic = document.getElementById('edit-pic').value; currentUser.updateProfile({ displayName: name, photoURL: pic }).then(() => { alert("Profile Updated!"); location.reload(); }).catch(err => alert(err.message)); }
function handleProfileClick() { if (currentUser) { if(confirm("Click OK to Edit Profile, Cancel to Logout")) { openEditProfile(); } else { logout(); } } else { googleLogin(); } }
function openMobileProfile() { handleProfileClick(); } // Alias for mobile button

// ==========================================
// 3. HOME PAGE
// ==========================================
function loadHomePage() {
    const mainRow = document.getElementById('anime-row');
    if(!mainRow) return;

    db.collection('animes').get().then((snap) => {
        allContentCache = [];
        mainRow.innerHTML = "";
        document.getElementById('series-row').innerHTML = "";
        document.getElementById('movie-row').innerHTML = "";

        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allContentCache.push(data);
            
            mainRow.appendChild(createNetflixCard(data));
            if((data.type||'').toLowerCase() === 'movie') {
                document.getElementById('movie-row').appendChild(createNetflixCard(data));
            } else {
                document.getElementById('series-row').appendChild(createNetflixCard(data));
            }
        });
        
        let featured = allContentCache.filter(x => x.featured === true);
        if(featured.length === 0) featured = allContentCache.slice(0, 5); 
        renderHeroSlider(featured);
    });
}

function renderHeroSlider(items) {
    const container = document.getElementById('hero-section');
    let slidesHTML = '';
    items.forEach(data => {
        const bg = data.banner || data.image;
        const lang = data.language || 'Sub';
        const year = data.year || '2025';
        slidesHTML += `
            <div class="swiper-slide" style="background-image: url('${bg}')">
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <h1 class="hero-title">${data.title}</h1>
                    <div style="display:flex; gap:10px; margin-bottom:15px; align-items:center;">
                        <span class="match">98% Match</span>
                        <span style="border:1px solid #888; padding:0 5px; font-size:0.8rem;">${year}</span>
                        <span style="border:1px solid white; padding:0 5px; font-size:0.7rem; border-radius:3px;">HD</span>
                        <span style="color:#ccc; font-size:0.9rem;">${lang}</span>
                    </div>
                    <p class="hero-desc">${data.description || 'Watch this amazing title now on AniStream.'}</p>
                    <div class="hero-btns">
                        <button class="btn-primary" onclick="window.location.href='watch.html?anime=${data.id}'"><i class="fas fa-play"></i> Play</button>
                        <button class="btn-secondary" onclick="window.location.href='watch.html?anime=${data.id}'"><i class="fas fa-info-circle"></i> Info</button>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = `<div class="swiper mySwiper"><div class="swiper-wrapper">${slidesHTML}</div><div class="swiper-button-next"></div><div class="swiper-button-prev"></div><div class="swiper-pagination"></div></div>`;
    new Swiper(".mySwiper", { loop: true, effect: "fade", autoplay: { delay: 5000, disableOnInteraction: false }, pagination: { el: ".swiper-pagination", clickable: true }, navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" } });
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
        const filtered = allContentCache.filter(item => (item.type||'series').toLowerCase() === type);
        renderGrid(filtered, mainRow);
    }
}
function renderGrid(items, container) { container.innerHTML = ""; items.forEach(data => container.appendChild(createNetflixCard(data))); }

function createNetflixCard(data) {
    const card = document.createElement('div');
    card.classList.add('anime-card');
    const randomMatch = Math.floor(Math.random() * (99 - 80 + 1) + 80);
    let seasonText = "";
    if ((data.type || '').toLowerCase() === 'movie') { seasonText = "Movie"; } 
    else { const sCount = data.seasons ? data.seasons.length : 0; seasonText = sCount > 1 ? `${sCount} Seasons` : '1 Season'; }
    const eps = data.sub || 0;
    const epBadge = eps > 0 ? `<span style="border:1px solid rgba(255,255,255,0.3); padding:0 4px; border-radius:3px;">${eps} Ep</span>` : '';
    const lang = data.language || 'Sub';
    card.innerHTML = `
        <img src="${data.image}" loading="lazy">
        <div class="card-info">
            <h4 style="font-size:0.9rem; margin-bottom:6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title}</h4>
            <div class="card-meta" style="flex-wrap: wrap; row-gap: 6px;">
                <span class="match">${randomMatch}% Match</span>
                <span style="border:1px solid rgba(255,255,255,0.3); padding:0 4px; border-radius:3px;">${seasonText}</span>
                ${epBadge}
                <span style="background: rgba(255,255,255,0.2); color:white; padding:0 4px; border-radius:3px; font-weight:600;">${lang}</span>
            </div>
        </div>`;
    card.onclick = () => window.location.href = `watch.html?anime=${data.id}`;
    return card;
}

document.getElementById('search-input')?.addEventListener('input', (e) => {
    const grid = document.getElementById('search-results-grid');
    const query = e.target.value.toLowerCase();
    grid.innerHTML = "";
    if (query.length < 2) return;
    const results = allContentCache.filter(item => item.title.toLowerCase().includes(query));
    results.forEach(item => grid.appendChild(createNetflixCard(item)));
});

// ==========================================
// 5. PLAYER
// ==========================================
function initPlayer() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('anime');
    if (!id) return;
    db.collection("animes").doc(id).get().then(doc => { if(doc.exists) setupPlayer(doc.data(), id); });
}

function setupPlayer(content, id) {
    currentAnimeData = content; currentAnimeData.id = id;
    document.getElementById('anime-title').innerText = content.title;
    checkMyListStatus(id);

    if ((content.type||'').toLowerCase() === 'movie') {
        document.getElementById('video-player').src = content.videoUrl;
        document.getElementById('ep-title').innerText = "Full Movie";
        document.querySelector('.playlist-sidebar').style.display = 'none'; // Changed for new CSS
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
        
        // --- NEW EPISODE RENDERING FOR NEW CSS ---
        window.renderEpisodes = (idx) => {
            epList.innerHTML = "";
            currentSeasonIndex = idx;
            document.querySelectorAll('.season-btn').forEach((b, i) => {
                if(i === idx) b.classList.add('active-season');
                else b.classList.remove('active-season');
            });
            content.seasons[idx].episodes.forEach((ep, eIdx) => {
                const div = document.createElement('div');
                div.className = 'ep-card'; // Changed class name
                div.innerHTML = `
                    <span class="ep-index">${eIdx+1}</span>
                    <span class="ep-name">${ep.title}</span>
                `;
                div.onclick = () => playEpisode(idx, eIdx);
                epList.appendChild(div);
            });
        };
        renderEpisodes(0);
        playEpisode(0, 0);
    }
}

function playEpisode(sIdx, eIdx) {
    const ep = currentAnimeData.seasons[sIdx].episodes[eIdx];
    document.getElementById('video-player').src = ep.url;
    document.getElementById('ep-title').innerText = `S${sIdx+1} E${eIdx+1}: ${ep.title}`;
    currentSeasonIndex = sIdx; currentEpisodeIndex = eIdx;
    document.querySelectorAll('.ep-card').forEach((btn, i) => { // Changed selector
        if(i === eIdx) btn.classList.add('active'); else btn.classList.remove('active');
    });
    if(currentUser) saveHistory(currentAnimeData.id, currentAnimeData, `S${sIdx+1} E${eIdx+1}`);
}

function playNextEpisode() {
    if(!currentAnimeData || (currentAnimeData.type||'').toLowerCase() === 'movie') return alert("No next episode for movies.");
    const season = currentAnimeData.seasons[currentSeasonIndex];
    if(currentEpisodeIndex + 1 < season.episodes.length) {
        playEpisode(currentSeasonIndex, currentEpisodeIndex + 1);
    } else if(currentSeasonIndex + 1 < currentAnimeData.seasons.length) {
        renderEpisodes(currentSeasonIndex + 1);
        playEpisode(currentSeasonIndex + 1, 0);
    } else {
        alert("Series Finished!");
    }
}

function shareAnime() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'Watch', url: url });
    else navigator.clipboard.writeText(url).then(() => alert("Copied!"));
}

function toggleMyList() {
    if (!currentUser) return alert("Login First");
    const id = new URLSearchParams(window.location.search).get('anime');
    const ref = db.collection('users').doc(currentUser.uid).collection('mylist').doc(id);
    ref.get().then(doc => {
        if (doc.exists) { ref.delete().then(() => { alert("Removed"); checkMyListStatus(id); }); }
        else { ref.set({ title: currentAnimeData.title, image: currentAnimeData.image, type: currentAnimeData.type, timestamp: Date.now() }).then(() => { alert("Added"); checkMyListStatus(id); }); }
    });
}

function checkMyListStatus(id) {
    if (!currentUser) return;
    const icon = document.getElementById('mylist-icon');
    db.collection('users').doc(currentUser.uid).collection('mylist').doc(id).get().then(doc => {
        if (doc.exists) { icon.classList.remove('far'); icon.classList.add('fas'); icon.style.color = '#e50914'; }
        else { icon.classList.remove('fas'); icon.classList.add('far'); icon.style.color = 'white'; }
    });
}

function saveHistory(id, content, label) {
    db.collection('users').doc(currentUser.uid).collection('history').doc(id).set({
        animeTitle: content.title, animeImage: content.image, lastEpisode: label, timestamp: Date.now(), type: content.type
    });
}

function loadHistory(uid) {
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