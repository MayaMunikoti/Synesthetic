let song;
let amplitude;
let fft;
let bassSize = 100;
let numCircles = 70;
let circles = [];
let targetBassSize = 100;
let pauseplay;
let newsong;
let title;
let upload;
let input;
let uploadSong = false;

class Circle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.options = [color(random(255), random(255), random(255))];
    this.color = random(this.options);
    this.targetColor = this.color; // Random target color
    this.lerpAmount = 0;
    this.isPlaying = false;
  }

  updateColor() {
    this.color = lerpColor(this.color, this.targetColor, 0.05); // Smooth and gradual
    this.lerpAmount += 0.05;  // Increment the lerp amount faster
  
    if (this.lerpAmount >= 1) {
      if(this.isPlaying){
        this.setColorBasedOnAmplitude(amplitude, pitch);
      }
      this.lerpAmount = 0; // Reset lerpAmount
    }
  }
  setColorBasedOnAmplitude(amplitude, pitch) {
    // Set target color based on amplitude
    if (amplitude >= 0 && amplitude <= 0.1) {
      if (pitch === "Bass") {
        let options = [color(255, 220, random(255)), color(255, random(255), 220)];
        this.targetColor = random(options);

      } else if (pitch === "Mid") {
        let options = [color(random(255), 255, 220), color(220, 255, random(255))];
        this.targetColor = random(options);

      } else if (pitch === "Treble") {
        let options = [color(220, random(255), 255), color(random(255), 220, 255)];
        this.targetColor = random(options);
      }
    }
    else if (amplitude > 0.1 && amplitude <= 0.3) {
      if (pitch === "Bass") {
        let options = [color(255, 0, random(255)), color(255, random(255), 0)];
        this.targetColor = random(options);

      } else if (pitch === "Mid") {
        let options = [color(random(255), 255, 0), color(0, 255, random(255))];
        this.targetColor = random(options);

      } else if (pitch === "Treble") {
        let options = [color(0, random(255), 255), color(random(255), 0, 255)];
        this.targetColor = random(options);
      }
    }
    else if (amplitude > 0.3 && amplitude <= 1) {
      if (pitch === "Bass") {
        let options = [color(100, 0, random(255)), color(random(255), 0, 0)]
        this.targetColor = random(options);

      } else if (pitch === "Mid") {
        let options = [color(0, random(255), 100), color(0, 100, random(255))];
        this.targetColor = random(options);

      } else if (pitch === "Treble") {
        let options = [color(0, 0, random(255)), color(random(255), 0, 100)];
        this.targetColor = random(options);
      }
    }
  }
}

function handleSong(file) {
  if (file.type === 'audio') {
    song = loadSound(file.data);
    uploadSong = true;
    song.onended(play);
  }
  else{
    uploadSong = false;
  }
}

function preload() {
  font = loadFont("SpaceMono-Regular.ttf");
  song;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  fft = new p5.FFT();
  amplitude = new p5.Amplitude();

  amplitude.setInput(song);

  // Initialize random background circles
  for (let i = 0; i < numCircles; i++) {
    let x = random(width);
    let y = random(height);
    let r = random(100, 300);
    circles.push(new Circle(x, y, r));
  }
  
  pauseplay = createButton('▶︎');
  pauseplay.position(width - pauseplay.width - 30, 20);

  pauseplay.mousePressed(togglePlay);
  pauseplay.addClass('pauseplay');
  pauseplay.hide();

  newsong = createButton('UPLOAD NEW SONG');
  newsong.position(width - newsong.width - pauseplay.width - 45, 21);
  newsong.mouseClicked(uploadNewSong);
  newsong.addClass('newsong');
  newsong.hide();
  
  upload = createButton('+');
  upload.position(width/2.052, height/2.13);
  upload.addClass('upload');
  upload.mouseClicked(()=>input.elt.click());
}

function play(){
  pauseplay.html('▶︎');
  pauseplay.position(width - pauseplay.width - 30, 20);
}
function pause(){
  pauseplay.html('❚❚')
  pauseplay.position(width - pauseplay.width - 30, 16);
}

function uploadNewSong(){
  uploadSong = false; //interface is brought back
  song.stop(); //song stops
  play();//pause returns to play
  
}

function togglePlay(){
  if(song.isPlaying()){
    song.pause();
    play();
  }
  else if(!song.isPlaying()){
    song.play();
    pause();
  }
}

function draw() {
  background(200, 200, 255);

  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = 'rgba(0,0,0,0)';

  let level = amplitude.getLevel();

  console.log('Amplitude:', level);

  fft.analyze();

  let bass = fft.getEnergy('bass');
  let mid = fft.getEnergy('mid');
  let treble = fft.getEnergy('treble');

  let pitch;
  if (bass > mid + 0.8 && bass > treble + 0.8) {
    pitch = "Bass";
  } else if (mid > bass - 0.3 && mid > treble - 0.3) {
    pitch = "Mid";
  } else if (treble > bass - 0.5 && treble > mid - 0.5) {
    pitch = "Treble";
  }
  

  console.log('pitch:', pitch);


  if(frameCount % 60 === 10){
  if (uploadSong == false) {
    for (let i = 0; i < circles.length; i++) {
      let circle = circles[i];
      circle.targetColor = color(random(255), random(255), random(255));
    }
  } else {
    // When a song is uploaded, let it follow the amplitude and pitch logic
    if (song.isPlaying()) {
      for (let i = 0; i < circles.length; i++) {
        let circle = circles[i];
        circle.setColorBasedOnAmplitude(level, pitch);
      }
    }
  }
}
  for (let i = 0; i < circles.length; i++) {
    let circle = circles[i];
    circle.updateColor();
    fill(circle.color);
    noStroke();
    ellipse(circle.x, circle.y, circle.radius * 2, circle.radius * 2);

  }

  filter(BLUR, 100);

  if(uploadSong == true){
      // Visual effect for the bass

  if(song.isPlaying()){
    
    targetBassSize = lerp(targetBassSize, map(bass, 0, 300, 50, 250),1);
  }
  else {
    targetBassSize = max(targetBassSize - 50, 30);
  }

  bassSize = lerp(bassSize, targetBassSize, 0.8);

  let outer = map(bassSize, 0, 400, 0, 20);

  drawingContext.shadowBlur = 32;
  drawingContext.shadowColor = color(255,255,255);

  // Main center circle
  fill(255, 255, 255);
  noStroke();
  ellipse(width / 2, height / 2, bassSize, bassSize);  // Center circle

  translate(width / 2, height / 2);
  let angle = frameCount * 0.01;
  rotate(angle);

  //outer ring
  for (let i = 0; i < 16; i++) {
    let formula = (2 * PI / 16) * i;  // Angle for each circle in the outer ring
    let x = bassSize * cos(formula);
    let y = bassSize * sin(formula);
    
    // Draw the small bass boost circles in the outer ring
    fill(255, 255, 255);
    noStroke();
    ellipse(x, y, outer, outer); 
  }
  pauseplay.show();
  newsong.show();
  upload.hide();
  }
  else{
    fill('yellow');
    textSize(70);
    textFont(font);
    textAlign(CENTER, CENTER);
    text('synesthetic_', width/1.95, height/2.9);

    //up and enter
    textSize(18);
    textFont(font);
    textAlign(CENTER, CENTER);
    text('enter audio file here', width/2, height/1.6);
    textSize(20);
    text('↑', width/2, height/1.7);

    strokeWeight(2);
    stroke('yellow');
    noFill();
    square(width/2.11, height/2.2, 80, 10);

    pauseplay.hide();
    newsong.hide();
    upload.show();
    input = createFileInput(handleSong);
    input.elt.accept = 'audio/*';
    input.hide();
  }
}