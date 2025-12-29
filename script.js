// --- PASTE YOUR FIREBASE CONFIG HERE AGAIN ---
const firebaseConfig = {
  apiKey: "AIzaSyCChaLOwXv66FOJYy5swjrIU4GQtKUh1Jw",
  authDomain: "anistream-9ef60.firebaseapp.com",
  projectId: "anistream-9ef60",
  storageBucket: "anistream-9ef60.firebasestorage.app",
  messagingSenderId: "364571969552",
  appId: "1:364571969552:web:aed0d2e751b443ddd4e295"
};
// ---------------------------------------------

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// 1. HOME PAGE LOGIC
// ==========================================
const grid = document.getElementById('anime-grid');
const searchBar = document.getElementById('search-bar');

if (grid) {
    db.collection("animes").get().then((querySnapshot) => {
        let allAnime = [];
        
        querySnapshot.forEach((doc) => {
            allAnime.push({ id: doc.id, ...doc.data() });
        });

        function renderGrid(filterText = "") {
            grid.innerHTML = "";
            allAnime.forEach(anime => {
    if (anime.title.toLowerCase().includes(filterText.toLowerCase())) {
        
        // --- BADGE LOGIC START ---
        let badgeHTML = "";
        
        // Check if "lastUpdated" exists
        if (anime.lastUpdated) {
            const today = new Date();
            const updateDate = anime.lastUpdated.toDate(); // Convert Firebase timestamp to JS Date
            const timeDiff = today - updateDate;
            const daysDiff = timeDiff / (1000 * 3600 * 24); // Convert ms to days

            // If updated less than 3 days ago, show badge
            if (daysDiff < 3) {
                badgeHTML = `<div class="badge-new">NEW EP</div>`;
            }
        }
        // --- BADGE LOGIC END ---

        const card = document.createElement('div');
        card.classList.add('anime-card');
        
        // We insert ${badgeHTML} before the image
        card.innerHTML = `
            ${badgeHTML}
            <img src="${anime.image}" 
                 alt="${anime.title}" 
                 onerror="this.onerror=null; this.src='https://wallpapercave.com/wp/wp2326757.jpg'; this.classList.add('img-error');">
            <div class="card-info">
                <h3>${anime.title}</h3>
                <p style="color: #aaa; font-size: 0.9rem;">${anime.seasons ? anime.seasons.length : 0} Seasons</p>
            </div>
        `;
        
        card.onclick = () => window.location.href = `watch.html?anime=${anime.id}`;
        grid.appendChild(card);
    }
});
        }

        renderGrid(); // Initial Load
        
        if (searchBar) {
            searchBar.addEventListener('input', (e) => renderGrid(e.target.value));
        }
    });
}

// ==========================================
// 2. WATCH PAGE LOGIC
// ==========================================
const player = document.getElementById('video-player');

if (player) {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('anime');

    if (animeId) {
        db.collection("animes").doc(animeId).get().then((doc) => {
            if (doc.exists) {
                const anime = doc.data();
                setupPlayer(anime);
            } else {
                document.getElementById('anime-title').innerText = "Anime Not Found";
            }
        });
    }

    function setupPlayer(anime) {
        document.getElementById('anime-title').innerText = anime.title;
        const seasonContainer = document.getElementById('season-tabs');
        const episodeContainer = document.getElementById('episode-list-container');
        const epTitleDisplay = document.getElementById('ep-title');

        if (!anime.seasons || anime.seasons.length === 0) return;

        function loadEpisodes(seasonIndex) {
            episodeContainer.innerHTML = "";
            const season = anime.seasons[seasonIndex];

            season.episodes.forEach(ep => {
                const btn = document.createElement('button');
                btn.classList.add('ep-btn');
                btn.innerText = ep.title;
                btn.onclick = () => {
                    player.src = ep.url;
                    epTitleDisplay.innerText = ep.title;
                    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };
                episodeContainer.appendChild(btn);
            });
        }

        anime.seasons.forEach((season, index) => {
            const btn = document.createElement('button');
            btn.classList.add('season-btn');
            btn.innerText = season.name;
            btn.onclick = () => {
                loadEpisodes(index);
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active-season'));
                btn.classList.add('active-season');
            };
            seasonContainer.appendChild(btn);
        });

        // Click first season
        seasonContainer.children[0].click();
    }
}