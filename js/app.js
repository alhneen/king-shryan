import CONFIG from './config.js';

let allSongs = [];
let currentSongs = [];
let audio = new Audio();

async function loadCatalog() {
  try {
    const response = await fetch('catalog.json');
    const data = await response.json();
    allSongs = data.songs;
    currentSongs = allSongs;
    renderSongs(currentSongs);
  } catch (error) {
    console.error('خطأ:', error);
    document.getElementById('songs-list').innerHTML = 
      '<p style="color:red; text-align:center;">تعذر تحميل الأغاني</p>';
  }
}

function renderSongs(songs) {
  const container = document.getElementById('songs-list');
  if (!container) return;

  if (songs.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#888;">لا توجد أغاني</p>';
    return;
  }

  container.innerHTML = songs.map(song => `
    <div class="song-card">
      <div class="song-info">
        <h3>${song.title}</h3>
        <p>${song.artist} • ${song.album || ''}</p>
      </div>
      <button class="play-btn" onclick="playSong('${song.id}')">▶</button>
    </div>
  `).join('');
}

window.playSong = (id) => {
  const song = allSongs.find(s => s.id === id);
  if (!song) return;

  audio.src = song.url;
  audio.play();
  
  document.getElementById('player').classList.remove('hidden');
  document.getElementById('now-playing').textContent = song.title;
  document.getElementById('now-artist').textContent = song.artist;
  document.getElementById('play-btn').textContent = '⏸';
};

window.togglePlay = () => {
  if (audio.paused) {
    audio.play();
    document.getElementById('play-btn').textContent = '⏸';
  } else {
    audio.pause();
    document.getElementById('play-btn').textContent = '▶';
  }
};

window.player = { next: () => {}, prev: () => {} };
window.toggleShuffle = () => {};
window.toggleRepeat = () => {};
window.showLimits = () => { alert('قريباً'); };

document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  currentSongs = allSongs.filter(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  );
  renderSongs(currentSongs);
});

loadCatalog();
