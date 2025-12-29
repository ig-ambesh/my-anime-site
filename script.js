// --- 1. FIREBASE CONFIG ---
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

let currentUser = null; // Stores logged-in user info

// ==========================================
// 2. AUTHENTICATION LOGIC
// ==========================================

function googleLogin() {
    auth.signInWithPopup(provider).then((result) => {
        // Reload page to update UI
        location.reload(); 
    }).catch((error) => console.error(error));
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// Check Login State on Load
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // Update UI
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-profile').style.display = 'block';
        document.getElementById('user-avatar').src = user.photoURL;
        document.getElementById('user-name').innerText = user.displayName.split(" ")[0]; // First Name
        
        // Load "Continue Watching"
        loadHistory();
    } else {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('continue-watching-section').style.display = 'none';
    }
});

// ==========================================
// 3. HOME PAGE LOGIC (Load Animes)
// ==========================================
const grid = document.getElementById('anime-grid');
const searchBar = document.getElementById('search-bar');

if (grid) {
    db.collection("animes").get().then((snapshot) => {
        let allAnime = [];
        snapshot.forEach(doc => allAnime.push({ id: doc.id, ...doc.data() }));

        function renderGrid(filterText = "") {
            grid.innerHTML = "";
            allAnime.forEach(anime => {
                if (anime.title.toLowerCase().includes(filterText.toLowerCase())) {
                    // Create Card
                    const card = createAnimeCard(anime);
                    grid.appendChild(card);
                }
            });
        }
        renderGrid();
        if(searchBar) searchBar.addEventListener('input', (e) => renderGrid(e.target.value));
    });
}

// Helper to create card HTML
function createAnimeCard(anime, customSubtitle = null) {
    const card = document.createElement('div');
    card.classList.add('anime-card');
    
    // Subtitle: Show "Season 1" OR "Ep 4" if in history
    const sub = customSubtitle ? `<span style="color:#8B5CF6">${customSubtitle}</span>` : `${anime.seasons ? anime.seasons.length : 0} Seasons`;

    card.innerHTML = `
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
// 4. WATCH HISTORY LOGIC (Home Page)
// ==========================================
function loadHistory() {
    if (!grid) return; // Only run on home page

    const historyGrid = document.getElementById('history-grid');
    const historySection = document.getElementById('continue-watching-section');

    // Get user's history collection
    db.collection('users').doc(currentUser.uid).collection('history')
      .orderBy('timestamp', 'desc').limit(4) // Get last 4 watched
      .get().then((snapshot) => {
          
          if (!snapshot.empty) {
              historySection.style.display = 'block';
              historyGrid.innerHTML = "";

              snapshot.forEach(doc => {
                  const data = doc.data();
                  // Create a card using the saved data
                  const card = createAnimeCard({
                      id: doc.id, // Anime ID
                      title: data.animeTitle,
                      image: data.animeImage
                  }, `Continue: ${data.lastEpisode}`); // Subtitle
                  
                  historyGrid.appendChild(card);
              });
          }
      });
}

// ==========================================
// 5. PLAYER LOGIC (Save Progress)
// ==========================================
const player = document.getElementById('video-player');

if (player) {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('anime');

    if (animeId) {
        db.collection("animes").doc(animeId).get().then((doc) => {
            if (doc.exists) {
                const anime = doc.data();
                setupPlayer(anime, animeId); // Pass ID too
            }
        });
    }

    function setupPlayer(anime, animeId) {
        document.getElementById('anime-title').innerText = anime.title;
        const seasonContainer = document.getElementById('season-tabs');
        const episodeContainer = document.getElementById('episode-list-container');
        
        // ... (Season Logic same as before) ...
        anime.seasons.forEach((season, index) => {
            const btn = document.createElement('button');
            btn.classList.add('season-btn');
            btn.innerText = season.name;
            btn.onclick = () => { loadEpisodes(index); };
            seasonContainer.appendChild(btn);
        });
        if(anime.seasons.length > 0) loadEpisodes(0);

        function loadEpisodes(seasonIndex) {
            episodeContainer.innerHTML = "";
            const season = anime.seasons[seasonIndex];

            season.episodes.forEach(ep => {
                const btn = document.createElement('div'); // Changed to DIV for styling
                btn.classList.add('ep-btn');
                btn.innerText = ep.title;
                
                btn.onclick = () => {
                    // 1. Play Video
                    player.src = ep.url;
                    document.getElementById('ep-title').innerText = ep.title;
                    
                    // 2. Highlight Button
                    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // 3. SAVE TO HISTORY (If Logged In)
                    if (currentUser) {
                        saveHistory(animeId, anime, ep.title);
                    }
                };
                episodeContainer.appendChild(btn);
            });
        }
    }
}

function saveHistory(animeId, animeData, episodeTitle) {
    // Save into: users -> USER_ID -> history -> ANIME_ID
    db.collection('users').doc(currentUser.uid).collection('history').doc(animeId).set({
        animeTitle: animeData.title,
        animeImage: animeData.image,
        lastEpisode: episodeTitle,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}