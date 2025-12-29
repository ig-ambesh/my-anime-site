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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 2. AUTHENTICATION (Login/Logout)
// ==========================================
function googleLogin() {
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Logged in:", result.user);
            location.reload();
        })
        .catch((error) => console.error(error));
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// Check Login Status
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const profile = document.getElementById('user-profile');
    
    if (user) {
        currentUser = user;
        if(loginBtn) loginBtn.style.display = 'none';
        if(profile) {
            profile.style.display = 'block';
            document.getElementById('user-avatar').src = user.photoURL;
            document.getElementById('user-name').innerText = user.displayName.split(" ")[0]; // First Name
        }
        loadHistory();
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(profile) profile.style.display = 'none';
    }
});

// ==========================================
// 3. HOME PAGE LOGIC (Grid & Slider)
// ==========================================
const grid = document.getElementById('anime-grid');
const searchBar = document.getElementById('search-bar');

if (grid) {
    db.collection("animes").get().then((snapshot) => {
        let allContent = [];
        snapshot.forEach(doc => allContent.push({ id: doc.id, ...doc.data() }));

        // --- A. SLIDER LOGIC ---
        // Filter: Must have Banner URL + 'featured' checkbox true
        const sliderContent = allContent.filter(item => item.banner && item.featured === true);
        if (sliderContent.length > 0) initSlider(sliderContent);

        // --- B. GRID LOGIC ---
        function renderGrid(filterText = "") {
            grid.innerHTML = "";
            allContent.forEach(item => {
                if (item.title.toLowerCase().includes(filterText.toLowerCase())) {
                    grid.appendChild(createCard(item));
                }
            });
        }
        
        // Initial Render
        renderGrid();
        
        // Search Listener
        if(searchBar) {
            searchBar.addEventListener('input', (e) => renderGrid(e.target.value));
        }
    });
}

// --- HELPER: Create Card HTML ---
function createCard(item, customSubtitle = null) {
    const card = document.createElement('div');
    card.classList.add('anime-card');

    // 1. Badge: New Episode (Only for Series, < 3 days old)
    let badgeHTML = "";
    if (item.lastUpdated && !customSubtitle && item.type !== 'movie') {
        const days = (new Date() - item.lastUpdated.toDate()) / (1000 * 3600 * 24);
        if (days < 3) badgeHTML = `<div class="badge-new">NEW EP</div>`;
    }

    // 2. Badge: Language (Top Left)
    let langHTML = "";
    if (item.language) {
        let colorClass = "";
        if(item.language.includes("Dub")) colorClass = "lang-dub";
        if(item.language.includes("Hindi")) colorClass = "lang-hindi";
        langHTML = `<div class="badge-lang ${colorClass}" style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold; z-index:2; color:white;">${item.language}</div>`;
    }

    // 3. Badge: Type (Movie vs Series) - Bottom Right
    const typeText = item.type === 'movie' ? 'MOVIE' : 'SERIES';
    const typeBadge = `<div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.8); padding:2px 6px; border-radius:4px; font-size:0.6rem; z-index:2; border:1px solid rgba(255,255,255,0.3); color:#ccc;">${typeText}</div>`;

    // 4. Subtitle Logic
    let sub = customSubtitle;
    if (!sub) {
        // If no custom subtitle, show Season count or "Full Movie"
        sub = item.type === 'movie' ? 'Watch Now' : `${item.seasons ? item.seasons.length : 0} Seasons`;
    }

    card.innerHTML = `
        ${badgeHTML}
        ${langHTML}
        ${typeBadge}
        <img src="${item.image}" onerror="this.src='https://wallpapercave.com/wp/wp2326757.jpg'">
        <div class="card-info">
            <h3>${item.title}</h3>
            <p style="color:#8B5CF6">${sub}</p>
        </div>
    `;
    
    card.onclick = () => window.location.href = `watch.html?anime=${item.id}`;
    return card;
}

// ==========================================
// 4. HERO SLIDER FUNCTION
// ==========================================
function initSlider(items) {
    const wrapper = document.getElementById('hero-slider');
    const dots = document.getElementById('slider-dots');
    
    // Get Arrows (Make sure these exist in your index.html)
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    // Settings
    const MAX_SLIDES = 5;
    const featured = items.slice(0, MAX_SLIDES);
    let current = 0;

    // Create Slides
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
            </div>
        `;
        wrapper.appendChild(slide);

        // Create Dots
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
        
        // Loop Logic
        if (index >= featured.length) current = 0;
        else if (index < 0) current = featured.length - 1;
        else current = index;

        // Reset All
        slides.forEach(s => s.classList.remove('active'));
        allDots.forEach(d => d.style.background = "rgba(255,255,255,0.3)");

        // Activate Current
        slides[current].classList.add('active');
        allDots[current].style.background = "white";
    }

    // Auto Play & Controls
    if(featured.length > 1) {
        let interval = setInterval(() => showSlide(current + 1), 5000); // 5 Seconds

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
    if(!grid || !currentUser) return; // Only run on home page if logged in
    
    const section = document.getElementById('continue-watching-section');
    const hGrid = document.getElementById('history-grid');

    db.collection('users').doc(currentUser.uid).collection('history')
      .orderBy('timestamp', 'desc').limit(4)
      .get().then(snap => {
          if(!snap.empty) {
              section.style.display = 'block';
              hGrid.innerHTML = "";
              snap.forEach(doc => {
                  const d = doc.data();
                  // Create card with "Ep: X" subtitle
                  hGrid.appendChild(createCard({
                      id: doc.id,
                      title: d.animeTitle,
                      image: d.animeImage,
                      type: d.type // Pass type to handle badges
                  }, d.lastEpisode));
              });
          }
      });
}

// ==========================================
// 6. PLAYER PAGE LOGIC (Universal: Movie & Series)
// ==========================================
const player = document.getElementById('video-player');

if (player) {
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('anime');

    if (contentId) {
        db.collection("animes").doc(contentId).get().then(doc => {
            if (doc.exists) {
                setupPlayer(doc.data(), contentId);
            }
        });
    }

    function setupPlayer(content, id) {
        document.getElementById('anime-title').innerText = content.title;
        const sTabs = document.getElementById('season-tabs');
        const epList = document.getElementById('episode-list-container');
        
        // Layout Elements
        const sidebar = document.querySelector('.sidebar');
        const watchContainer = document.querySelector('.watch-container');

        // --- SCENARIO A: IT IS A MOVIE ---
        if (content.type === 'movie') {
            // 1. Play Video
            player.src = content.videoUrl;
            document.getElementById('ep-title').innerText = "Full Movie";
            
            // 2. Apply Movie Layout Class (Fixes Mobile Issue)
            if(watchContainer) watchContainer.classList.add('movie-mode');
            if(sidebar) sidebar.style.display = 'none'; // Double check hidden

            // 3. Save History
            saveHistory(id, content, "Movie");
            return; 
        }

        // --- SCENARIO B: IT IS A SERIES ---
        // 1. Reset Layout (Remove Movie Class)
        if(watchContainer) watchContainer.classList.remove('movie-mode');
        if(sidebar) sidebar.style.display = 'flex';

        // 2. Load Seasons
        sTabs.innerHTML = ""; // Clear old tabs
        content.seasons.forEach((season, index) => {
            const btn = document.createElement('button');
            btn.classList.add('season-btn');
            btn.innerText = season.name;
            btn.onclick = () => loadEpisodes(index);
            sTabs.appendChild(btn);
        });

        // 3. Load First Season
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
                };
                epList.appendChild(btn);
            });
        }
    }

    function saveHistory(id, content, progressText) {
        if(currentUser) {
            db.collection('users').doc(currentUser.uid).collection('history').doc(id).set({
                animeTitle: content.title,
                animeImage: content.image,
                lastEpisode: progressText,
                type: content.type || 'series', // Save type for badge logic later
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
}