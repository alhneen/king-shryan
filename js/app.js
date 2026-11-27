const audio = document.getElementById("audio-player");

let kingSongs = [];
let phoneSongs = [];
let currentSongs = [];
let currentIndex = -1;
let currentView = "home";

let shuffleEnabled = false;
let repeatMode = 0;

let nativeTrackActive = false;
let nativeTimer = null;
let nativeDuration = 0;

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

  songs.forEach(song => {
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
    play.setAttribute("aria-label", "تشغيل الأغنية");
    play.addEventListener("click", () => playSong(song, songs));

    const fav = document.createElement("button");
    fav.textContent = favorites.includes(song.id) ? "♥" : "♡";
    fav.addEventListener("click", () => toggleFavorite(song.id));

    info.append(title, artist);
    card.append(info, play, fav);
    container.append(card);
  });
}

function stopNativeTimer() {
  if (nativeTimer) {
    clearInterval(nativeTimer);
    nativeTimer = null;
  }
}

function updateNativeProgress() {
  if (!nativeTrackActive || !window.AndroidMusic) return;

  try {
    const position = window.AndroidMusic.getCurrentPosition();
    const duration = window.AndroidMusic.getDuration();

    if (duration > 0) {
      nativeDuration = duration;

      $("progress").value = (position / duration) * 100;
      $("current-time").textContent = formatTime(position / 1000);
      $("duration").textContent = formatTime(duration / 1000);
    }

    $("play-btn").textContent =
      window.AndroidMusic.isPlaying() ? "⏸" : "▶";
  } catch (error) {
    stopNativeTimer();
  }
}

function playSong(song, list) {
  currentSongs = list;
  currentIndex = list.findIndex(item => item.id === song.id);

  $("player").classList.remove("hidden");
  $("song-title").textContent = song.title;
  $("song-artist").textContent = song.artist || "KING SHRYAN";

  updateFavoriteButton();

  if (String(song.id).startsWith("android-") && window.AndroidMusic) {
    audio.pause();
    stopNativeTimer();

    nativeTrackActive = true;
    nativeDuration = 0;

    $("progress").value = 0;
    $("current-time").textContent = "0:00";
    $("duration").textContent = "0:00";
    $("play-btn").textContent = "▶";

    window.AndroidMusic.playMusic(
      String(song.id).replace("android-", "")
    );

    return;
  }

  nativeTrackActive = false;
  stopNativeTimer();
  nativeDuration = 0;

  audio.src = song.url;

  audio.play().then(() => {
    $("play-btn").textContent = "⏸";
  }).catch(() => {
    $("play-btn").textContent = "▶";
    alert("تعذر تشغيل هذه الأغنية. تحقق من اتصال الإنترنت أو ملف الصوت.");
  });
}

$("play-btn").addEventListener("click", () => {
  if (nativeTrackActive && window.AndroidMusic) {
    try {
      if (window.AndroidMusic.isPlaying()) {
        window.AndroidMusic.pauseMusic();
        $("play-btn").textContent = "▶";
      } else {
        window.AndroidMusic.resumeMusic();
        $("play-btn").textContent = "⏸";
      }
    } catch (error) {}
    return;
  }

  if (!audio.src) return;

  if (audio.paused) {
    audio.play().then(() => {
      $("play-btn").textContent = "⏸";
    }).catch(() => {});
  } else {
    audio.pause();
    $("play-btn").textContent = "▶";
  }
});

function nextSong(manual = true) {
  if (!currentSongs.length) return;

  if (
    !manual &&
    repeatMode === 0 &&
    currentIndex === currentSongs.length - 1
  ) {
    stopNativeTimer();
    nativeTrackActive = false;
    $("play-btn").textContent = "▶";
    return;
  }

  if (shuffleEnabled && currentSongs.length > 1) {
    let nextIndex;

    do {
      nextIndex = Math.floor(Math.random() * currentSongs.length);
    } while (nextIndex === currentIndex);

    currentIndex = nextIndex;
  } else {
    currentIndex = (currentIndex + 1) % currentSongs.length;
  }

  playSong(currentSongs[currentIndex], currentSongs);
}

function previousSong() {
  if (!currentSongs.length) return;

  if (nativeTrackActive && window.AndroidMusic) {
    if (window.AndroidMusic.getCurrentPosition() > 3000) {
      window.AndroidMusic.seekMusic(0);
      return;
    }
  } else if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  currentIndex =
    (currentIndex - 1 + currentSongs.length) % currentSongs.length;

  playSong(currentSongs[currentIndex], currentSongs);
}

$("next-btn").addEventListener("click", () => nextSong(true));
$("prev-btn").addEventListener("click", previousSong);

audio.addEventListener("ended", () => {
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  nextSong(false);
});

$("shuffle-btn").addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;

  $("shuffle-btn").style.color =
    shuffleEnabled ? "#f5dda0" : "#aaa18e";

  $("shuffle-btn").style.textShadow =
    shuffleEnabled ? "0 0 12px #d6ad55" : "none";
});

$("repeat-btn").addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 3;

  const button = $("repeat-btn");

  if (repeatMode === 0) {
    button.textContent = "🔁";
    button.style.opacity = "0.55";
    button.title = "التكرار متوقف";
  } else if (repeatMode === 1) {
    button.textContent = "🔁";
    button.style.opacity = "1";
    button.title = "تكرار القائمة";
  } else {
    button.textContent = "🔂";
    button.style.opacity = "1";
    button.title = "تكرار الأغنية";
  }
});

audio.addEventListener("play", () => {
  $("play-btn").textContent = "⏸";
});

audio.addEventListener("pause", () => {
  $("play-btn").textContent = "▶";
});

audio.addEventListener("timeupdate", () => {
  if (nativeTrackActive || !audio.duration) return;

  $("progress").value =
    (audio.currentTime / audio.duration) * 100;

  $("current-time").textContent = formatTime(audio.currentTime);
  $("duration").textContent = formatTime(audio.duration);
});

$("progress").addEventListener("input", event => {
  const percent = Number(event.target.value) / 100;

  if (nativeTrackActive && window.AndroidMusic) {
    if (nativeDuration > 0) {
      window.AndroidMusic.seekMusic(
        Math.floor(percent * nativeDuration)
      );
    }
    return;
  }

  if (audio.duration) {
    audio.currentTime = percent * audio.duration;
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
  updateFavoriteButton();
}

function updateFavoriteButton() {
  if (currentIndex < 0 || !currentSongs[currentIndex]) return;

  const id = currentSongs[currentIndex].id;

  $("favorite-btn").textContent =
    favorites.includes(id) ? "♥" : "♡";
}

$("favorite-btn").addEventListener("click", () => {
  if (currentIndex < 0 || !currentSongs[currentIndex]) return;
  toggleFavorite(currentSongs[currentIndex].id);
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

window.onNativeMusicPermission = function () {
  try {
    const songs = JSON.parse(window.AndroidMusic.getMusic() || "[]");

    phoneSongs = songs.map(song => ({
      id: "android-" + song.id,
      title: song.title || "أغنية بدون اسم",
      artist: song.artist || "من الهاتف",
      url: song.url
    }));

    renderSongs(phoneSongs, "phone-songs");

    if (!phoneSongs.length) {
      $("phone-songs").textContent =
        "لم يتم العثور على أغاني في الهاتف";
    }
  } catch (error) {
    $("phone-songs").textContent = "تعذر قراءة أغاني الهاتف";
  }
};

window.onNativeMusicStarted = function (duration) {
  nativeTrackActive = true;
  nativeDuration = duration || 0;

  stopNativeTimer();

  $("play-btn").textContent = "⏸";

  updateNativeProgress();

  nativeTimer = setInterval(() => {
    updateNativeProgress();
  }, 500);
};

window.onNativeMusicEnded = function () {
  stopNativeTimer();

  if (repeatMode === 2) {
    playSong(currentSongs[currentIndex], currentSongs);
    return;
  }

  nextSong(false);
};

window.onNativeMusicError = function () {
  stopNativeTimer();
  $("play-btn").textContent = "▶";
  alert("تعذر تشغيل الأغنية من الهاتف.");
};

$("phone-picker").addEventListener("click", function (event) {
  if (window.AndroidMusic) {
    event.preventDefault();
    event.stopImmediatePropagation();

    $("phone-songs").textContent = "جارٍ قراءة الأغاني...";

    window.AndroidMusic.requestMusicPermission();
  }
}, true);

loadCatalog();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
      }
