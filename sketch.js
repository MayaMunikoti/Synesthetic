// ====== GLOBAL STATE ======
let song, amplitude, fft;
let bassSize = 100, targetBassSize = 100;
let numCircles = 200, circles = [];
let pauseplay, newsong, upload, input, turnoff;
let font;
let loginBtn;

// ====== MODES ======
let mode = "home"; // 'home', 'upload', 'spotify'

// ====== SPOTIFY STATE ======
let spotifyToken = localStorage.getItem('access_token');
let albumArtURL = null;
let albumImg;
let palette = [];
let bannerVisible = true;

// ====== CLASSES ======
class Circle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.color = color(random(255), random(255), random(255));
    this.targetColor = this.color;
    this.lerpAmount = 0;
  }

  updateColor() {
    this.color = lerpColor(this.color, this.targetColor, 0.3);
    this.lerpAmount += 0.05;
    if (this.lerpAmount >= 1) this.lerpAmount = 0;
  }

  setColorBasedOnAmplitude(amp, pitch) {
    let schemes = {
      Bass: [color(255, 220, random(255)), color(255, random(255), 220)],
      Mid: [color(random(255), 255, 220), color(220, 255, random(255))],
      Treble: [color(220, random(255), 255), color(random(255), 220, 255)]
    };
    this.targetColor = random(schemes[pitch]);
  }
}

// ====== FILE & SPOTIFY ======
function handleSong(file) {
  if (file.type === 'audio') {
    song = loadSound(file.data, () => {
      mode = "upload";
      amplitude.setInput(song);
      song.onended(play);
      showUI(mode);
    });
  }
}

async function fetchAlbumArt() {
  if (!spotifyToken) return;
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': 'Bearer ' + spotifyToken }
    });
    if (!res.ok) return;

    const data = await res.json();
    albumArtURL = data?.item?.album?.images?.[0]?.url;

    if (albumArtURL) {
      mode = "spotify";
      loadImage(albumArtURL, img => {
        albumImg = img;
        palette = extractColors(img);
        showUI(mode);
      });
    }
    if (data?.item?.name && data?.item?.artists?.[0]?.name) {
      const name = data.item.name;
      const artist = data.item.artists[0].name;
      updateNowPlaying(`${name} - ${artist}`);
    }
  } catch (err) {
    console.error("Spotify fetch error:", err);
  }
}

function updateNowPlaying(text) {
  if (mode !== "spotify") return;

  const track = document.getElementById("scrolling-track");
  if (!track) return;

  track.innerHTML = '';

  const temp = document.createElement('div');
  temp.className = 'scrolling-text';
  temp.innerText = `NOW PLAYING: ${text}`;
  track.appendChild(temp);

  requestAnimationFrame(() => {
    const bannerWidth = document.querySelector('.banner').offsetWidth;
    const textWidth = temp.offsetWidth;

    let totalWidth = textWidth;
    while (totalWidth < bannerWidth * 4) {
      const clone = temp.cloneNode(true);
      track.appendChild(clone);
      totalWidth += textWidth + 50;
    }

    track.style.animation = 'none';
    void track.offsetWidth;
    track.style.animation = 'scroll-left 50s linear infinite';
  });
}

function extractColors(img) {
  img.loadPixels();
  let colors = [];
  for (let i = 0; i < 500; i++) {
    let x = floor(random(img.width));
    let y = floor(random(img.height));
    let idx = 4 * (y * img.width + x);
    colors.push(color(img.pixels[idx], img.pixels[idx+1], img.pixels[idx+2]));
  }
  return colors;
}

// ====== UI HELPERS ======
function centerUploadButton() {
  if (!upload) return;
  const x = width / 2 - upload.size().width / 2;
  const y = height / 2 - upload.size().height / 2;
  upload.position(x, y);
}

function centerSpotifyButton() {
  if (!loginBtn) return;
  const x = window.innerWidth / 2 - loginBtn.elt.offsetWidth / 2;
  const y = window.innerHeight / 1.4;
  loginBtn.elt.style.left = `${x}px`;
  loginBtn.elt.style.top = `${y}px`;
  loginBtn.elt.style.position = 'absolute';
  loginBtn.elt.style.zIndex = 10;
}

function toggleBanner() {
  const banner = document.querySelector(".banner");
  if (!banner) return;
  bannerVisible = !bannerVisible;
  banner.style.visibility = bannerVisible ? "visible" : "hidden";
  turnoff.html(bannerVisible ? "TURN OFF BANNER" : "TURN ON BANNER");
}

function showUI(modeToSet) {
  if (!upload || !pauseplay || !newsong || !turnoff || !loginBtn) return;
  const banner = document.querySelector(".banner");

  if (modeToSet === "home") {
    upload.show();
    pauseplay.hide();
    newsong.hide();
    turnoff.hide();
    loginBtn.show();
    if (banner) banner.style.display = "none";
  } else if (modeToSet === "upload") {
    upload.hide();
    pauseplay.show();
    newsong.show();
    turnoff.hide();
    loginBtn.hide();
    if (banner) banner.style.display = "none";
  } else if (modeToSet === "spotify") {
    upload.hide();
    pauseplay.hide();
    newsong.show();
    turnoff.show();
    loginBtn.hide();
    if (banner) banner.style.display = "flex";
  }
}

// ====== PRELOAD ======
function preload() {
  font = loadFont("SpaceMono-Regular.ttf");
}

// ====== SETUP ======
function setup() {
  createCanvas(windowWidth, windowHeight).position(0, 0).style('position', 'absolute').style('z-index', '0');

  fft = new p5.FFT();
  amplitude = new p5.Amplitude();

  for (let i = 0; i < numCircles; i++) {
    circles.push(new Circle(random(width), random(height), random(100, 250)));
  }

  // Buttons
  pauseplay = createButton('▶︎').addClass('pauseplay').mousePressed(togglePlay);
  newsong = createButton('UPLOAD NEW SONG').addClass('newsong').mouseClicked(() => {
    if (song) song.stop();
    mode = "home";
    localStorage.removeItem('access_token');
    localStorage.removeItem('use_spotify');
    spotifyToken = null;
    albumArtURL = null;
    albumImg = null;
    palette = [];
    showUI(mode);
  });
  turnoff = createButton('TURN OFF BANNER').addClass('turnoff').mousePressed(toggleBanner);

  upload = createButton('+').addClass('upload').mouseClicked(() => input.elt.click());
  input = createFileInput(handleSong);
  input.elt.accept = 'audio/*';
  input.hide();

  // Attach to DOM
  const controlWrapper = select('.top-controls');
  controlWrapper.child(turnoff);
  controlWrapper.child(newsong);
  controlWrapper.child(pauseplay);

  centerUploadButton();

  loginBtn = select('#login');
  centerSpotifyButton();

  if (localStorage.getItem('use_spotify') === 'true' && spotifyToken) {
    localStorage.removeItem('use_spotify');
    mode = "spotify";
    fetchAlbumArt();
  }

  setInterval(fetchAlbumArt, 5000);
  showUI(mode);
}

// ====== DRAW ======
function draw() {
  background(200, 200, 255);

  // Circles (always visible)
  if (frameCount % 60 === 10) {
    for (let c of circles) {
      if (mode === "upload" && song?.isPlaying()) {
        let level = amplitude.getLevel();
        fft.analyze();
        let bass = fft.getEnergy('bass');
        let mid = fft.getEnergy('mid');
        let treble = fft.getEnergy('treble');
        let pitch = bass > mid && bass > treble ? "Bass" : mid > treble ? "Mid" : "Treble";
        c.setColorBasedOnAmplitude(level, pitch);
      } else if (mode === "spotify" && palette.length > 0) {
        c.targetColor = random(palette);
      } else {
        c.targetColor = color(random(255), random(255), random(255));
      }
    }
  }

  for (let c of circles) {
    c.updateColor();
    fill(c.color);
    noStroke();
    ellipse(c.x, c.y, c.radius * 2);
  }

  // Home screen text
  if (mode === "home") {
    textFont(font);
    textAlign(CENTER, CENTER);
    fill('yellow');
    textSize(70);
    text('synesthetic_', width / 2, height / 2.9);
    textSize(18);
    text('upload audio file here', width / 2, height / 1.6);
    textSize(20);
    text('↑', width / 2, height / 1.7);
  } else {
    // Visualizer
    fft.analyze();
    let bass = fft.getEnergy('bass');
    if (mode === "upload" && song?.isPlaying()) {
      targetBassSize = lerp(targetBassSize, map(bass, 0, 300, 50, 250), 1);
    } else if (mode === "spotify") {
      targetBassSize = map(sin(frameCount * 0.02), -1, 1, 100, 200);
    } else {
      targetBassSize = max(targetBassSize - 50, 30);
    }

    bassSize = lerp(bassSize, targetBassSize, 0.8);
    let outer = map(bassSize, 0, 400, 0, 20);

    drawingContext.shadowBlur = 32;
    drawingContext.shadowColor = color(255);
    fill(255); noStroke();
    ellipse(width / 2, height / 2, bassSize);

    push();
    translate(width / 2, height / 2);
    rotate(frameCount * 0.01);
    for (let i = 0; i < 16; i++) {
      let angle = (TWO_PI / 16) * i;
      let x = bassSize * cos(angle);
      let y = bassSize * sin(angle);
      ellipse(x, y, outer);
    }
    pop();
  }

  showUI(mode);
}

// ====== PLAYBACK ======
function togglePlay() {
  if (song?.isPlaying()) song.pause(), play();
  else song?.play(), pause();
}

function play() { pauseplay.html('▶︎'); }
function pause() { pauseplay.html('❚❚'); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerUploadButton();
  centerSpotifyButton();
}

