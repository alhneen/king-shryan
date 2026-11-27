
const audio = document.getElementById("audio-player");

let kingSongs = [];
let phoneSongs = [];
let currentSongs = [];
let currentIndex = -1;
let currentView = "home";

let favorites = JSON.parse(localStorage.getItem("kingFavorites") || "[]");
let playlists = JSON.parse(localStorage.getItem("kingPlaylists") || "[]");

const $ = id => document.getElementById(id);

async function loadCatalog() {
  try {
    const response = await fetch("catalog.json");
    const data = await response.json();
    kingSongs = data.songs || [];
    showView("home");
  } catch (error) {
    $("king-songs").textContent = "تعذر تحميل مكتبة شريان الملك";
  }
}

function showView(view) {
  currentView = view;

  document.querySelectorAll("main, .library-view").forEach(el => {
    el.classList.add("hidden");
  });

  if (view === "home") {
    $("home-view").classList.remove("hidden");
  } else {
    const page = $(view + "-view");
    if (page) page.classList.remove("hidden");
  }

  if (view === "king") renderSongs(kingSongs, "king-songs");
  if (view === "phone") renderSongs(phoneSongs, "phone-songs");
  if (view === "favorites") {
    const songs = [...kingSongs, ...phoneSongs]
      .filter(song => favorites.includes(song.id));
    renderSongs(songs, "favorites-songs");
  }
  if (view === "playlists") renderPlaylists();
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

function renderSongs(songs, containerId) {
  const container = $(containerId);
  if (!container) return;

  if (!songs.length) {
    container.innerHTML = "<p>لا توجد أغاني هنا حالياً</p>";
    return;
  }

  container.innerHTML = "";

  songs.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "song-card";

    const info = document.createElement("div");
    info.className = "song-info";

    const title = document.createElement("h3");
    title.textContent = song.title;

    const artist = document.createElement("p");
    artist.textContent = song.artist || "KING SHRYAN";

    const play = document.createElement("button");
    play.className = "play-btn";
    play.textContent = "▶";
    play.addEventListener("click", () => {
      const list = songs;
      playSong(song, list);
    });

    const fav = document.createElement("button");
    fav.textContent = favorites.includes(song.id) ? "♥" : "♡";
    fav.addEventListener("click", () => toggleFavorite(song.id));

    info.append(title, artist);
    card.append(info, play, fav);
    container.append(card);
  });
}

function playSong(song, list) {
  currentSongs = list;
  currentIndex = list.findIndex(item => item.id === song.id);

  audio.src = song.url;
  audio.play().catch(() => {
    alert("تعذر تشغيل هذه الأغنية. تحقق من اتصال الإنترنت أو ملف الصوت.");
  });

  $("player").classList.remove("hidden");
  $("song-title").textContent = song.title;
  $("song-artist").textContent = song.artist || "KING SHRYAN";
  $("play-btn").textContent = "⏸";
}

$("play-btn").addEventListener("click", () => {
  if (!audio.src) return;

  if (audio.paused) {
    audio.play();
    $("play-btn").textContent = "⏸";
  } else {
    audio.pause();
    $("play-btn").textContent = "▶";
  }
});

function nextSong() {
  if (!currentSongs.length) return;
  currentIndex = (currentIndex + 1) % currentSongs.length;
  playSong(currentSongs[currentIndex], currentSongs);
}

function previousSong() {
  if (!currentSongs.length) return;
  currentIndex = (currentIndex - 1 + currentSongs.length) % currentSongs.length;
  playSong(currentSongs[currentIndex], currentSongs);
}

$("next-btn").addEventListener("click", nextSong);
$("prev-btn").addEventListener("click", previousSong);
audio.addEventListener("ended", nextSong);

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  $("progress").value = (audio.currentTime / audio.duration) * 100;
  $("current-time").textContent = formatTime(audio.currentTime);
  $("duration").textContent = formatTime(audio.duration);
});

$("progress").addEventListener("input", event => {
  if (audio.duration) {
    audio.currentTime = (event.target.value / 100) * audio.duration;
  }
});

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return minutes + ":" + String(secs).padStart(2, "0");
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(item => item !== id);
  } else {
    favorites.push(id);
  }

  localStorage.setItem("kingFavorites", JSON.stringify(favorites));
  showView(currentView);
}

$("favorite-btn").addEventListener("click", () => {
  if (currentIndex < 0 || !currentSongs[currentIndex]) return;
  toggleFavorite(currentSongs[currentIndex].id);
  $("favorite-btn").textContent =
    favorites.includes(currentSongs[currentIndex].id) ? "♥" : "♡";
});

$("phone-picker").addEventListener("click", () => {
  $("phone-files").click();
});

$("phone-files").addEventListener("change", event => {
  phoneSongs = Array.from(event.target.files).map((file, index) => ({
    id: "phone-" + index + "-" + file.name,
    title: file.name.replace(/\.[^/.]+$/, ""),
    artist: "من الهاتف",
    url: URL.createObjectURL(file)
  }));

  renderSongs(phoneSongs, "phone-songs");
});

$("create-playlist").addEventListener("click", () => {
  const name = prompt("اكتب اسم قائمة التشغيل:");
  if (!name || !name.trim()) return;

  playlists.push({ name: name.trim(), songs: [] });
  savePlaylists();
  renderPlaylists();
});

function savePlaylists() {
  localStorage.setItem("kingPlaylists", JSON.stringify(playlists));
}

function renderPlaylists() {
  const container = $("playlists-content");
  container.innerHTML = "";

  if (!playlists.length) {
    container.textContent = "لم تنشئ أي قائمة بعد";
    return;
  }

  playlists.forEach((playlist, index) => {
    const button = document.createElement("button");
    button.textContent = "🎵 " + playlist.name;
    button.style.cssText =
      "display:block;width:100%;padding:15px;margin:8px 0;background:#171717;color:#e5c16d;border:1px solid #6c5125;border-radius:10px;text-align:right";

    button.addEventListener("click", () => {
      const songs = [...kingSongs, ...phoneSongs]
        .filter(song => playlist.songs.includes(song.id));

      renderSongs(songs, "playlists-content");
    });

    const add = document.createElement("button");
    add.textContent = "إضافة الأغاني الحالية";
    add.addEventListener("click", () => {
      const available = [...kingSongs, ...phoneSongs];
      available.forEach(song => {
        if (!playlist.songs.includes(song.id)) {
          playlist.songs.push(song.id);
        }
      });
      savePlaylists();
      alert("تم تحديث القائمة");
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "حذف";
    deleteButton.addEventListener("click", () => {
      playlists.splice(index, 1);
      savePlaylists();
      renderPlaylists();
    });

    container.append(button, add, deleteButton);
  });
}

loadCatalog();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
