// ====== GLOBAL STATE ======
let song, amplitude, fft;
let bassSize = 100, targetBassSize = 100;
let numCircles = 200, circles = [];
let pauseplay, newsong, upload, input, turnoff, loginBtn;
let font;

// ====== MODES ======
let mode = "home"; // 'home', 'upload', 'spotify'

// ====== SPOTIFY STATE ======
let spotifyToken = localStorage.getItem('access_token');
let albumArtURL = null;
let albumImg = null;
let palette = [];
let bannerVisible = true;

// ====== CIRCLE CLASS ======
class Circle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.color = color(random(255), random(255), random(255));
    this.targetColor = this.color;
  }

  updateColor() {
    this.color = lerpColor(this.color, this.targetColor, 0.3);
  }

  setColorBasedOnAmplitude(amp, pitch) {
    const schemes = {
      Bass: [color(255, 220, random(255)), color(255, random(255), 220)],
      Mid: [color(random(255), 255, 220), color(220, 255, random(255))],
      Treble: [color(220, random(255), 255), color(random(255), 220, 255)]
    };
    this.targetColor = random(schemes[pitch]);
  }
}

// ====== UTIL: set mode safely (only call showUI when mode changes) ======
function setMode(newMode) {
  if (mode === newMode) return;
  mode = newMode;
  showUI(mode);
}

// ====== FILE & SPOTIFY HELPERS ======
function handleSong(file) {
  if (file.type === 'audio') {
    // loadSound is async; set amplitude input once loaded and play
    song = loadSound(file.data, () => {
      amplitude.setInput(song);
      song.play();
      setMode("upload");
    });
  }
}

// Exchange code -> token (PKCE) AFTER sketch.js has loaded
async function exchangeCodeForToken(code) {
  try {
    const codeVerifier = localStorage.getItem('code_verifier');
    if (!codeVerifier) {
      console.warn("No PKCE code_verifier in localStorage.");
      return;
    }

    const payload = new URLSearchParams({
      client_id: '836ade30328e4480b154fb66700d6f00',
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://mayamunikoti.github.io/Synesthetic/',
      code_verifier: codeVerifier
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });

    if (!res.ok) {
      const txt = await res.text();
      console.warn("Spotify token exchange failed:", res.status, txt);
      return;
    }

    const data = await res.json();
    if (data?.access_token) {
      localStorage.setItem('access_token', data.access_token);
      spotifyToken = data.access_token;
      localStorage.setItem('use_spotify', 'true');
      // Now fetch album art & switch mode
      fetchAlbumArt();
      setMode("spotify");
      // remove code from URL
      history.replaceState(null, null, window.location.origin + window.location.pathname);
    } else {
      console.warn("No access_token received:", data);
    }
  } catch (err) {
    console.error("exchangeCodeForToken error:", err);
  }
}

async function fetchAlbumArt() {
  if (!spotifyToken) return;
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': 'Bearer ' + spotifyToken }
    });

    if (!res.ok) {
      // not playing or token expired — stop
      // console.log('Spotify player returned', res.status);
      return;
    }

    const data = await res.json();
    albumArtURL = data?.item?.album?.images?.[0]?.url || null;
    if (albumArtURL) {
      loadImage(albumArtURL, img => {
        albumImg = img;
        palette = extractColors(img);
      });
    }
    if (data?.item?.name && data?.item?.artists?.[0]?.name) {
      updateNowPlaying(`${data.item.name} - ${data.item.artists[0].name}`);
    }
  } catch (err) {
    console.error("Spotify fetch error:", err);
  }
}

function updateNowPlaying(text) {
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
  const colors = [];
  for (let i = 0; i < 500; i++) {
    const x = floor(random(img.width));
    const y = floor(random(img.height));
    const idx = 4 * (y * img.width + x);
    colors.push(color(img.pixels[idx], img.pixels[idx+1], img.pixels[idx+2]));
  }
  return colors;
}

// ====== UI HELPERS ======
function centerUploadButton() {
  if (!upload) return;
  // use DOM sizes to be robust
  const w = upload.elt.offsetWidth;
  const h = upload.elt.offsetHeight;
  upload.position(width / 2 - w / 2, height / 2 - h / 2);
  upload.style('z-index', '10');
}

function centerSpotifyButton() {
  if (!loginBtn) return;
  loginBtn.elt.style.position = 'absolute';
  const w = loginBtn.elt.offsetWidth;
  const h = loginBtn.elt.offsetHeight;
  loginBtn.elt.style.left = `${window.innerWidth / 2 - w / 2}px`;
  loginBtn.elt.style.top = `${window.innerHeight / 1.4 - h / 2}px`;
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
  if (!pauseplay || !newsong || !upload || !turnoff || !loginBtn) return;
  const banner = document.querySelector(".banner");

  if (modeToSet === "home") {
    upload.show(); pauseplay.hide(); newsong.hide(); turnoff.hide(); loginBtn.show();
    if (banner) banner.style.display = "none";
  } else if (modeToSet === "upload") {
    upload.hide(); pauseplay.show(); newsong.show(); turnoff.hide(); loginBtn.hide();
    if (banner) banner.style.display = "none";
  } else if (modeToSet === "spotify") {
    upload.hide(); pauseplay.hide(); newsong.show(); turnoff.show(); loginBtn.hide();
    if (banner) banner.style.display = "flex";
  }
}

// ====== PRELOAD & SETUP ======
function preload() {
  // if font fails to load, p5 will still fallback; logging helpful
  font = loadFont("SpaceMono-Regular.ttf",
    () => console.log("Font loaded"),
    () => console.warn("Font failed to load (check path)")
  );
}

function setup() {
  // create canvas behind UI (CSS ensures .top-controls and .banner are above)
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style('position', 'absolute');
  cnv.style('z-index', '-1'); // keep canvas behind UI

  fft = new p5.FFT();
  amplitude = new p5.Amplitude();

  // Circles
  for (let i = 0; i < numCircles; i++) {
    circles.push(new Circle(random(width), random(height), random(100, 250)));
  }

  // Buttons
  pauseplay = createButton('▶︎').addClass('pauseplay').mousePressed(togglePlay).style('z-index','10');
  turnoff = createButton('TURN OFF BANNER').addClass('turnoff').mousePressed(toggleBanner).style('z-index','10');
  newsong = createButton('UPLOAD NEW SONG').addClass('newsong').mouseClicked(() => {
    if (song) song.stop();
    spotifyToken = null; albumArtURL = null; albumImg = null; palette = [];
    localStorage.removeItem('access_token');
    setMode("home");
  }).style('z-index','10');

  upload = createButton('+').addClass('upload').mousePressed(() => input.elt.click()).style('z-index','10');
  input = createFileInput(handleSong); input.elt.accept = 'audio/*'; input.hide();

  // attach p5 buttons to top-controls wrapper so CSS z-index applies
  const controlWrapper = select('.top-controls');
  controlWrapper.child(turnoff); controlWrapper.child(newsong); controlWrapper.child(pauseplay);

  // center upload and spotify buttons
  centerUploadButton();

  loginBtn = select('#login');
  // also attach a click handler in case inline script didn't (safe)
  if (loginBtn && !loginBtn.elt.onclick) {
    loginBtn.elt.onclick = () => { console.warn("login handler from sketch"); };
  }
  centerSpotifyButton();

  // if we returned from Spotify with ?code=..., handle it here (now that fetchAlbumArt exists)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) exchangeCodeForToken(code);

  // if we have spotify token stored, try to fetch album art
  if (localStorage.getItem('use_spotify') === 'true' && localStorage.getItem('access_token')) {
    spotifyToken = localStorage.getItem('access_token');
    setMode("spotify");
    fetchAlbumArt();
  }

  setInterval(fetchAlbumArt, 5000);

  // initial UI
  showUI(mode);
}

// ====== DRAW ======
function draw() {
  background(0, 0, 50);

  // analyze once per draw
  fft.analyze();
  const level = amplitude.getLevel();
  const bass = fft.getEnergy('bass');
  const mid = fft.getEnergy('mid');
  const treble = fft.getEnergy('treble');
  const pitch = bass > mid && bass > treble ? "Bass" : mid > treble ? "Mid" : "Treble";

  // update target colors periodically (every 60 frames)
  if (frameCount % 60 === 10) {
    circles.forEach(c => {
      if (mode === "upload" && song?.isPlaying()) c.setColorBasedOnAmplitude(level, pitch);
      else if (mode === "spotify" && palette.length > 0) c.targetColor = random(palette);
      else c.targetColor = color(random(255), random(255), random(255));
    });
  }

  // draw circles
  circles.forEach(c => {
    c.updateColor();
    fill(c.color);
    noStroke();
    ellipse(c.x, c.y, c.radius * 2);
  });

  // Visualizer
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
    ellipse(bassSize * cos(angle), bassSize * sin(angle), outer);
  }
  pop();

  // home text
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
  }
}

// ====== PLAYBACK / UI ======
function togglePlay() {
  if (song?.isPlaying()) { song.pause(); play(); } else { song?.play(); pause(); }
}
function play() { pauseplay.html('▶︎'); }
function pause() { pauseplay.html('❚❚'); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerUploadButton();
  centerSpotifyButton();
}
